// POST /api/extract → ดึงงานด้วย AI (ฝั่งเซิร์ฟเวอร์เท่านั้น)
//   JSON { text }                       = วางข้อความอย่างเดียว
//   multipart: text (ไม่บังคับ) + files  = PDF 1 ไฟล์ หรือรูปไม่เกิน 5 รูป (รวม ≤ 4 MB)
// ไฟล์ไม่ถูกเก็บที่ไหน: ตรวจ → ส่ง AI → ทิ้ง
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toBangkokParts } from "@/lib/dates";
import { mockExtract } from "@/lib/ai/claude";
import { AiError } from "@/lib/ai/errors";
import { extractTasks, isMockMode } from "@/lib/ai/extract";
import { normalizeTasks } from "@/lib/ai/normalize";
import { findDemoSets } from "@/lib/ai/demo-samples";
import { AI_DAILY_LIMIT, MAX_TEXT_LENGTH, MAX_UPLOAD_BYTES } from "@/lib/ai/limits";
import { checkUploads, type Attachment, type UploadInput } from "@/lib/ai/files";
import type { AiTask, ExtractResponse } from "@/lib/ai/schema";

function fail(error: string, status: number) {
  return Response.json({ ok: false, error } satisfies ExtractResponse, { status });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("กรุณาเข้าสู่ระบบก่อน", 401);

  // กันไฟล์ใหญ่ตั้งแต่ยังไม่อ่าน body (เผื่อข้อความ + หัว multipart อีกเล็กน้อย)
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_UPLOAD_BYTES + MAX_TEXT_LENGTH * 4 + 64 * 1024) {
    return fail("ไฟล์ใหญ่เกินไป รวมกันได้ไม่เกิน 4 MB", 413);
  }

  let text = "";
  const uploads: UploadInput[] = [];
  try {
    if ((request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      const form = await request.formData();
      const t = form.get("text");
      text = typeof t === "string" ? t.trim() : "";
      for (const f of form.getAll("files")) {
        if (typeof f === "string") continue;
        uploads.push({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) });
      }
    } else {
      const body = await request.json();
      text = typeof body?.text === "string" ? body.text.trim() : "";
    }
  } catch {
    return fail("ข้อมูลที่ส่งมาไม่ถูกต้อง", 400);
  }

  const upload = checkUploads(uploads);
  if (!upload.ok) return fail(upload.error, 400);
  const files: Attachment[] = upload.attachments;
  const inputType = upload.kind === "none" ? "text" : upload.kind;

  if (!text && !files.length) return fail("กรุณาวางข้อความหรือแนบไฟล์ก่อน", 400);
  if (text.length > MAX_TEXT_LENGTH) {
    return fail(
      `ข้อความยาวเกิน ${MAX_TEXT_LENGTH.toLocaleString("th-TH")} ตัวอักษร ลองตัดเฉพาะส่วนกำหนดส่งงาน`,
      400,
    );
  }

  const today = toBangkokParts(new Date().toISOString()).date;
  const supabase = await createClient();
  const mock = isMockMode();

  // ลิมิต AI ต่อวัน (นับตามวันไทย) — โหมดจำลองไม่เสียเงิน จึงไม่นับ
  if (!mock) {
    const { count, error } = await supabase
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(`${today}T00:00:00+07:00`).toISOString());
    if (error) {
      console.error("extract: count ai_usage", error);
      return fail("ตรวจสอบโควตาไม่สำเร็จ ลองใหม่อีกครั้ง", 500);
    }
    if ((count ?? 0) >= AI_DAILY_LIMIT) {
      return fail(`ใช้ AI ครบ ${AI_DAILY_LIMIT} ครั้งของวันนี้แล้ว พรุ่งนี้ใช้ได้ใหม่`, 429);
    }
  }

  const coursesPromise = supabase.from("courses").select("id, name, code");

  let raw: AiTask[] = [];
  let mockSources: string[] = [];
  let success = false;
  try {
    if (mock) {
      // โหมดจำลอง: ถ้าข้อความตรงกับเอกสารตัวอย่างที่เตรียมไว้ ใช้คำตอบของเอกสารนั้น
      // (โหมดจำลองอ่านไฟล์จริงไม่ได้ → เทียบได้แค่ข้อความที่พิมพ์มาด้วย)
      const demos = text ? findDemoSets(text) : [];
      mockSources = demos.map((d) => d.label);
      raw = demos.length ? demos.flatMap((d) => d.tasks) : mockExtract(today);
    } else {
      raw = await extractTasks(text, today, files); // Claude หรือ Gemini ตาม env AI_PROVIDER
    }
    success = true;
  } catch (err) {
    const message = err instanceof AiError ? err.message : "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง";
    if (!(err instanceof AiError)) console.error("extract", err);
    return fail(message, 502);
  } finally {
    if (!mock) {
      // user_id เติม auth.uid() ให้เองในฐานข้อมูล
      const { error } = await supabase
        .from("ai_usage")
        .insert({ input_type: inputType, success });
      if (error) console.error("extract: insert ai_usage", error);
    }
  }

  const { data: courses } = await coursesPromise;
  const tasks = normalizeTasks(raw, courses ?? [], today);
  return Response.json({
    ok: true,
    tasks,
    mock,
    mock_sources: mockSources,
    mock_files: mock && files.length > 0,
  } satisfies ExtractResponse);
}
