// เรียก Claude API เพื่อดึงงานจากข้อความ — ใช้ฝั่งเซิร์ฟเวอร์เท่านั้น (app/api/extract/route.ts)
// key อ่านจาก ANTHROPIC_API_KEY (ไม่มี prefix NEXT_PUBLIC_ → ไม่หลุดไปเบราว์เซอร์)
// ไม่ใส่ "server-only" เพื่อให้สคริปต์ทดสอบ (npm run test:ai) เรียกได้ด้วย
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { AiResultSchema, type AiTask } from "./schema.ts";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt.ts";

export const DEFAULT_MODEL = "claude-sonnet-5-5";

// โหมดจำลอง: ไม่มี key หรือสั่ง AI_MODE=mock → คืนข้อมูลตัวอย่าง ไม่เสียเงิน
export function isMockMode() {
  return process.env.AI_MODE === "mock" || !process.env.ANTHROPIC_API_KEY;
}

export class AiError extends Error {
  readonly retryable: boolean;
  // message = ข้อความภาษาไทยสำหรับผู้ใช้
  constructor(message: string, retryable: boolean) {
    super(message);
    this.retryable = retryable;
  }
}

export async function extractWithClaude(text: string, todayIso: string): Promise<AiTask[]> {
  const client = new Anthropic({ timeout: 90_000, maxRetries: 1 });

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
      messages: [{ role: "user", content: buildUserMessage(text, todayIso) }],
      output_config: {
        effort: "medium", // งานดึงข้อมูล ไม่ต้องคิดหนักมาก → ประหยัด token
        format: betaZodOutputFormat(AiResultSchema),
      },
    });

    if (response.stop_reason === "refusal") {
      throw new AiError("AI ไม่สามารถอ่านเอกสารนี้ได้ ลองตัดเฉพาะส่วนกำหนดส่งงานมาวาง", false);
    }
    if (response.stop_reason === "max_tokens") {
      throw new AiError("เอกสารยาวเกินไป ลองแบ่งวางทีละส่วน", false);
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
// (มั่นใจ / ต้องอนุมาน / ไม่รู้วันส่ง / AI ลืมแปลงปี พ.ศ.)
export function mockExtract(todayIso: string): AiTask[] {
  const addDays = (n: number) => {
    const d = new Date(`${todayIso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const beDate = (iso: string) => `${Number(iso.slice(0, 4)) + 543}${iso.slice(4)}`;

  return [
    {
      title: "รายงานบทที่ 3 (ตัวอย่าง)",
      course: "CS101",
      due_date: addDays(5),
      due_time: "23:59",
      due_date_confidence: "high",
      raw_date_text: "ส่งภายในวันที่ ... ก่อน 23.59 น.",
      note: "ส่งทาง Google Classroom, ทำเดี่ยว",
    },
    {
      title: "Quiz 2 (ตัวอย่าง)",
      course: "Statistics",
      due_date: addDays(9),
      due_time: null,
      due_date_confidence: "medium",
      raw_date_text: "สัปดาห์หน้าวันพุธ",
      note: null,
    },
    {
      title: "สอบกลางภาค (ตัวอย่าง)",
      course: "CS101",
      due_date: beDate(addDays(20)), // จำลองกรณี AI ลืมแปลง พ.ศ.
      due_time: "09:00",
      due_date_confidence: "high",
      raw_date_text: "สอบกลางภาค 09.00 น.",
      note: null,
    },
    {
      title: "โปรเจกต์กลุ่ม (ตัวอย่าง)",
      course: null,
      due_date: null,
      due_time: null,
      due_date_confidence: "low",
      raw_date_text: "ส่งสัปดาห์ที่ 15",
      note: "กลุ่มละ 3-4 คน",
    },
  ];
}
