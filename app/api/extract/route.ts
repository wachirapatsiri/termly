// POST /api/extract → ดึงงานด้วย AI (ฝั่งเซิร์ฟเวอร์เท่านั้น)
//   JSON { text }                       = วางข้อความอย่างเดียว
//   multipart: text (ไม่บังคับ) + files  = PDF 1 ไฟล์ หรือรูปไม่เกิน 5 รูป (รวม ≤ 4 MB)
// ไฟล์ไม่ถูกเก็บที่ไหน: ตรวจ → ส่ง AI → ทิ้ง
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toBangkokParts, untilBangkokMidnight } from "@/lib/dates";
import { mockExtract } from "@/lib/ai/claude";
import { AiError } from "@/lib/ai/errors";
import { extractTasks, isMockMode, mockReason } from "@/lib/ai/extract";
import { normalizeTasks } from "@/lib/ai/normalize";
import { findDemoSets } from "@/lib/ai/demo-samples";
import { AI_DAILY_LIMIT, MAX_TEXT_LENGTH, MAX_UPLOAD_BYTES } from "@/lib/ai/limits";
import { bangkokDayStartIso, summarizeUsage, usageBlock, type AiUsage } from "@/lib/ai/usage";
import { redactPersonal } from "@/lib/ai/redact";
import { checkUploads, type Attachment, type UploadInput } from "@/lib/ai/files";
import type { AiTask, ExtractResponse } from "@/lib/ai/schema";

function fail(error: string, status: number, usage?: AiUsage) {
  return Response.json({ ok: false, error, usage } satisfies ExtractResponse, { status });
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

  // ลิมิต AI ต่อวัน (นับตามวันไทย) — นับเฉพาะครั้งที่สำเร็จ (ผู้ใช้เลือก 9 พ.ย.)
  // + เพดานรวมทุกครั้งกันสแปม; โหมดจำลองไม่เสียเงิน จึงไม่นับ
  let usage: AiUsage | undefined;
  if (!mock) {
    const { data, error } = await supabase
      .from("ai_usage")
      .select("success")
      .gte("created_at", bangkokDayStartIso(today));
    if (error) {
      console.error("extract: read ai_usage", error);
      return fail("ตรวจสอบโควตาไม่สำเร็จ ลองใหม่อีกครั้ง", 500);
    }
    usage = summarizeUsage(data ?? []);
    const block = usageBlock(usage);
    const reset = `ใช้ได้ใหม่ตอนเที่ยงคืน (00:00 น. เวลาไทย) อีก ${untilBangkokMidnight()}`;
    if (block === "quota") {
      return fail(`ใช้ AI ครบ ${AI_DAILY_LIMIT} ครั้งของวันนี้แล้ว — ${reset}`, 429, usage);
    }
    if (block === "attempts") {
      return fail(`วันนี้ลองใช้ AI ไม่สำเร็จหลายครั้งเกินไป — ${reset}`, 429, usage);
    }
  }

  const coursesPromise = supabase.from("courses").select("id, name, code");

  let raw: AiTask[] = [];
  let mockSources: string[] = [];
  let success = false;
  let redacted = { emails: 0, phones: 0 };
  try {
    if (mock) {
      // โหมดจำลอง: ถ้าข้อความตรงกับเอกสารตัวอย่างที่เตรียมไว้ ใช้คำตอบของเอกสารนั้น
      // (โหมดจำลองอ่านไฟล์จริงไม่ได้ → เทียบได้แค่ข้อความที่พิมพ์มาด้วย)
      const demos = text ? findDemoSets(text) : [];
      mockSources = demos.map((d) => d.label);
      raw = demos.length ? demos.flatMap((d) => d.tasks) : mockExtract(today);
    } else {
      // ตัดอีเมล/เบอร์โทรออกก่อนส่ง (ไฟล์ตัดไม่ได้) — งาน/วันส่งไม่ต้องใช้ข้อมูลพวกนี้
      const clean = redactPersonal(text);
      redacted = { emails: clean.emails, phones: clean.phones };
      raw = await extractTasks(clean.text, today, files); // Claude หรือ Gemini ตาม env AI_PROVIDER
    }
    success = true;
  } catch (err) {
    const message = err instanceof AiError ? err.message : "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง";
    if (!(err instanceof AiError)) console.error("extract", err);
    // ครั้งที่ล้มเหลวไม่เสียโควตา แต่นับเข้าเพดานรวม
    return fail(message, 502, usage && { ...usage, attempts: usage.attempts + 1 });
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
    mock_reason: mockReason() ?? undefined,
    usage: usage && { ...usage, used: usage.used + 1, attempts: usage.attempts + 1 },
    redacted,
  } satisfies ExtractResponse);
}
