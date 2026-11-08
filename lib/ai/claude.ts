// เรียก Claude API เพื่อดึงงานจากข้อความ — ใช้ฝั่งเซิร์ฟเวอร์เท่านั้น (app/api/extract/route.ts)
// key อ่านจาก ANTHROPIC_API_KEY (ไม่มี prefix NEXT_PUBLIC_ → ไม่หลุดไปเบราว์เซอร์)
// ไม่ใส่ "server-only" เพื่อให้สคริปต์ทดสอบ (npm run test:ai) เรียกได้ด้วย
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { AiResultSchema, type AiTask } from "./schema.ts";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt.ts";
import type { Attachment } from "./files.ts";
import { AiError } from "./errors.ts";

export const DEFAULT_MODEL = "claude-sonnet-5-5";

// AiError อยู่ใน errors.ts (ใช้ร่วมกับ gemini.ts) — re-export ไว้ให้โค้ดเดิม
export { AiError };

// แปลงไฟล์แนบเป็น content block ของ Claude (วางก่อนข้อความตามคำแนะนำของ API)
function attachmentBlocks(files: Attachment[]): Anthropic.Beta.BetaContentBlockParam[] {
  return files.map((f) =>
    f.media_type === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: f.media_type, data: f.data } }
      : { type: "image", source: { type: "base64", media_type: f.media_type, data: f.data } },
  );
}

export async function extractWithClaude(
  text: string,
  todayIso: string,
  files: Attachment[] = [],
): Promise<AiTask[]> {
  // PDF/รูปใช้เวลาอ่านนานกว่าข้อความ
  const client = new Anthropic({ timeout: files.length ? 150_000 : 90_000, maxRetries: 1 });
  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    ...attachmentBlocks(files),
    { type: "text", text: buildUserMessage(text, todayIso, files.length) },
  ];

  try {
    const response = await client.beta.messages.parse({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 16000,
      // ถ้า Claude ปฏิเสธด้วยเหตุผลด้านความปลอดภัย (ไม่น่าเกิดกับซิลลาบัส) ให้เซิร์ฟเวอร์ลองรุ่นสำรองให้เอง
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content }],
      output_config: {
        effort: "medium", // งานดึงข้อมูล ไม่ต้องคิดหนักมาก → ประหยัด token
        format: betaZodOutputFormat(AiResultSchema),
      },
    });

    if (response.stop_reason === "refusal") {
      throw new AiError("AI ไม่สามารถอ่านเอกสารนี้ได้ ลองตัดเฉพาะส่วนกำหนดส่งงานมาวาง", false);
    }
    if (response.stop_reason === "max_tokens") {
      throw new AiError(
        files.length
          ? "เอกสารยาวเกินไป ลองส่งเฉพาะหน้าที่มีกำหนดส่งงานหรือตารางสอบ"
          : "เอกสารยาวเกินไป ลองแบ่งวางทีละส่วน",
        false,
      );
    }
    if (!response.parsed_output) {
      throw new AiError("AI ตอบกลับผิดรูปแบบ ลองใหม่อีกครั้ง", true);
    }
    return response.parsed_output.tasks;
  } catch (err) {
    if (err instanceof AiError) throw err;
    if (err instanceof Anthropic.RateLimitError) {
      throw new AiError("ระบบ AI มีคนใช้เยอะ รอสักครู่แล้วลองใหม่", true);
    }
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("extractWithClaude: API key ไม่ถูกต้อง");
      throw new AiError("ระบบ AI ยังตั้งค่าไม่เรียบร้อย", false);
    }
    if (err instanceof Anthropic.BadRequestError && files.length) {
      // เช่น PDF เสีย/ล็อกรหัสผ่าน/หน้าเยอะเกิน หรือรูปเสีย
      console.error("extractWithClaude: file rejected", err.message);
      throw new AiError(
        "AI เปิดไฟล์นี้ไม่ได้ (ไฟล์อาจเสีย ล็อกรหัสผ่าน หรือมีหน้าเยอะเกินไป) — ลองแคปหน้าจอเฉพาะส่วนที่มีกำหนดส่งแทน",
        false,
      );
    }
    if (err instanceof Anthropic.APIConnectionError) {
      throw new AiError("เชื่อมต่อ AI ไม่ได้ ลองใหม่อีกครั้ง", true);
    }
    if (err instanceof Anthropic.APIError) {
      console.error("extractWithClaude", err.status, err.message);
      throw new AiError("AI มีปัญหาชั่วคราว ลองใหม่อีกครั้ง", true);
    }
    // ข้อมูลจาก AI ไม่ผ่าน Zod หรือ error อื่น
    console.error("extractWithClaude", err);
    throw new AiError("AI ตอบกลับผิดรูปแบบ ลองใหม่อีกครั้ง", true);
  }
}

// ข้อมูลตัวอย่างสำหรับโหมดจำลอง — ครอบคลุมทุกกรณีที่หน้าเว็บต้องแสดง
// (มั่นใจ / ต้องอนุมาน / ไม่รู้วันส่ง / AI ลืมแปลงปี พ.ศ. / วิชาใหม่ที่ยังไม่มีในระบบ / สอบพร้อมเวลาจบ+ห้อง)
export function mockExtract(todayIso: string): AiTask[] {
  const addDays = (n: number) => {
    const d = new Date(`${todayIso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const beDate = (iso: string) => `${Number(iso.slice(0, 4)) + 543}${iso.slice(4)}`;

  return [
    {
      title: "[ตัวอย่าง] 02 [Group] Vector to Raster Image",
      kind: "homework",
      course_code: "204383",
      course_name: "Image Processing",
      due_date: addDays(5),
      due_time: "12:30",
      end_time: null,
      location: null,
      due_date_confidence: "high",
      raw_date_text: "Due: ... 12:30",
      note: "งานกลุ่ม 1–3 คน ส่ง PNG + PDF โค้ด",
    },
    {
      title: "[ตัวอย่าง] HW07 Bayes Net",
      kind: "homework",
      course_code: "204471",
      course_name: "Artificial Intelligence",
      due_date: addDays(9),
      due_time: "23:59",
      end_time: null,
      location: null,
      due_date_confidence: "medium",
      raw_date_text: "สัปดาห์หน้า ก่อน 23:59",
      note: "เขียนด้วยลายมือ ส่ง PDF",
    },
    {
      title: "[ตัวอย่าง] สอบกลางภาค",
      kind: "midterm",
      course_code: "204383",
      course_name: "Image Processing",
      due_date: beDate(addDays(20)), // จำลองกรณี AI ลืมแปลง พ.ศ.
      due_time: "08:00",
      end_time: "11:00",
      location: "ห้อง 301",
      due_date_confidence: "high",
      raw_date_text: "สอบกลางภาค 8:00 – 11:00 น.",
      note: "Open-book",
    },
    {
      title: "[ตัวอย่าง] นำเสนอโปรเจกต์",
      kind: "presentation",
      course_code: "204471",
      course_name: "Artificial Intelligence",
      due_date: null,
      due_time: null,
      end_time: null,
      location: null,
      due_date_confidence: "low",
      raw_date_text: "สัปดาห์ที่ 15 นำเสนอ",
      note: null,
    },
  ];
}
