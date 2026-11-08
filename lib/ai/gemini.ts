// เรียก Google Gemini (โควตาฟรีจาก AI Studio) เพื่อดึงงาน — ใช้ฝั่งเซิร์ฟเวอร์เท่านั้น เหมือน claude.ts
// key อ่านจาก GEMINI_API_KEY (ไม่มี prefix NEXT_PUBLIC_); เลือกใช้ด้วย AI_PROVIDER=gemini (ดู extract.ts)
// ใช้ prompt / schema / normalize ชุดเดียวกับ Claude → เปลี่ยนผู้ให้บริการได้โดยไม่ต้องแก้ส่วนอื่น
// ⚠ โควตาฟรีของ Google อาจนำข้อมูลที่ส่งไปใช้พัฒนาโมเดล (ดู CLAUDE.md ส่วน "ตัวเลือก AI")
import { ApiError, GoogleGenAI, type Part } from "@google/genai";
import { z } from "zod";
import { AiResultSchema, type AiTask } from "./schema.ts";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt.ts";
import { AiError } from "./errors.ts";
import type { Attachment } from "./files.ts";

// "gemini-flash-latest" = รุ่น Flash ล่าสุดที่ Google ชี้ให้ (มีโควตาฟรี) — เปลี่ยนได้ด้วย env GEMINI_MODEL
export const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";

// แบบฟอร์มคำตอบ: แปลง Zod เป็น JSON Schema (ตัด $schema ที่ Gemini ไม่ใช้)
const RESPONSE_SCHEMA: Record<string, unknown> = { ...z.toJSONSchema(AiResultSchema) };
delete RESPONSE_SCHEMA.$schema;

// key ของ Gemini: GEMINI_API_KEY (หรือ GOOGLE_API_KEY ที่ SDK ของ Google รู้จักเหมือนกัน)
// ตัดช่องว่าง/เครื่องหมายคำพูดที่ติดมาตอนคัดลอกทิ้ง
export function geminiApiKey(): string | undefined {
  const raw = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  return raw?.trim().replace(/^["']+|["']+$/g, "") || undefined;
}

// รหัสสาเหตุจาก Google เช่น "API_KEY_INVALID", "NOT_FOUND" (ไม่มีข้อมูลลับ) — ต่อท้ายข้อความ error ให้เช็กปัญหาได้จากหน้าเว็บ
export function googleErrorCode(err: ApiError): string {
  try {
    const body = JSON.parse(err.message) as {
      error?: { status?: string; details?: { reason?: string }[] };
    };
    const reason = body.error?.details?.find((d) => d.reason)?.reason;
    return `${err.status} ${reason ?? body.error?.status ?? ""}`.trim();
  } catch {
    return String(err.status);
  }
}

export async function extractWithGemini(
  text: string,
  todayIso: string,
  files: Attachment[] = [],
): Promise<AiTask[]> {
  const ai = new GoogleGenAI({
    apiKey: geminiApiKey(),
    httpOptions: { timeout: files.length ? 150_000 : 90_000 },
  });
  const parts: Part[] = [
    ...files.map((f) => ({ inlineData: { mimeType: f.media_type, data: f.data } })),
    { text: buildUserMessage(text, todayIso, files.length) },
  ];

  let raw: string | undefined;
  let finish: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_SCHEMA,
        maxOutputTokens: 16000,
      },
    });
    finish = response.candidates?.[0]?.finishReason;
    if (response.promptFeedback?.blockReason) {
      throw new AiError("AI ไม่สามารถอ่านเอกสารนี้ได้ ลองตัดเฉพาะส่วนกำหนดส่งงานมาวาง", false);
    }
    raw = response.text;
  } catch (err) {
    if (err instanceof AiError) throw err;
    if (err instanceof ApiError) {
      const code = googleErrorCode(err);
      if (/API_KEY_INVALID|API_KEY_SERVICE_BLOCKED|PERMISSION_DENIED/.test(code) || err.status === 401) {
        console.error("extractWithGemini: API key", code);
        throw new AiError(
          `key ของ Gemini ใช้ไม่ได้ — เช็กว่าคัดลอก GEMINI_API_KEY มาครบ (ขึ้นต้น AIza ไม่มีช่องว่าง/เครื่องหมายคำพูด) (รหัส: ${code})`,
          false,
        );
      }
      if (err.status === 404) {
        console.error("extractWithGemini: model", code, err.message);
        throw new AiError(`ไม่พบรุ่น AI "${process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL}" ลองตั้ง GEMINI_MODEL ใหม่ (รหัส: ${code})`, false);
      }
      if (err.status === 429) {
        // โควตาฟรีมีเพดานต่อนาทีและต่อวัน
        throw new AiError("โควตา AI ฟรีเต็มชั่วคราว รอสัก 1 นาทีแล้วลองใหม่ (ถ้ายังไม่ได้ ลองพรุ่งนี้)", true);
      }
      if (err.status === 400 && files.length) {
        console.error("extractWithGemini: file rejected", err.message);
        throw new AiError(
          `AI เปิดไฟล์นี้ไม่ได้ (ไฟล์อาจเสีย ล็อกรหัสผ่าน หรือมีหน้าเยอะเกินไป) — ลองแคปหน้าจอเฉพาะส่วนที่มีกำหนดส่งแทน (รหัส: ${code})`,
          false,
        );
      }
      if (err.status === 403) {
        console.error("extractWithGemini: forbidden", code);
        throw new AiError(`ระบบ AI ยังตั้งค่าไม่เรียบร้อย (รหัส: ${code})`, false);
      }
      console.error("extractWithGemini", err.status, err.message);
      throw new AiError(`AI มีปัญหาชั่วคราว ลองใหม่อีกครั้ง (รหัส: ${code})`, true);
    }
    console.error("extractWithGemini", err);
    throw new AiError("เชื่อมต่อ AI ไม่ได้ ลองใหม่อีกครั้ง", true);
  }

  if (finish === "MAX_TOKENS") {
    throw new AiError(
      files.length
        ? "เอกสารยาวเกินไป ลองส่งเฉพาะหน้าที่มีกำหนดส่งงานหรือตารางสอบ"
        : "เอกสารยาวเกินไป ลองแบ่งวางทีละส่วน",
      false,
    );
  }
  if (finish && finish !== "STOP") {
    console.error("extractWithGemini: finishReason", finish);
    throw new AiError("AI ไม่สามารถอ่านเอกสารนี้ได้ ลองตัดเฉพาะส่วนกำหนดส่งงานมาวาง", false);
  }

  // ตรวจคำตอบด้วย Zod ชุดเดียวกับ Claude — ผิดรูปแบบ = แจ้งผู้ใช้ ไม่เดาเอง
  try {
    const parsed = AiResultSchema.safeParse(JSON.parse(raw ?? ""));
    if (parsed.success) return parsed.data.tasks;
    console.error("extractWithGemini: schema", parsed.error.issues.slice(0, 3));
  } catch {
    console.error("extractWithGemini: not JSON", raw?.slice(0, 200));
  }
  throw new AiError("AI ตอบกลับผิดรูปแบบ ลองใหม่อีกครั้ง", true);
}
