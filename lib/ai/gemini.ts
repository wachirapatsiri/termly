// เรียก Google Gemini (โควตาฟรีจาก AI Studio) เพื่อดึงงาน — ใช้ฝั่งเซิร์ฟเวอร์เท่านั้น เหมือน claude.ts
// key อ่านจาก GEMINI_API_KEY (ไม่มี prefix NEXT_PUBLIC_); เลือกใช้ด้วย AI_PROVIDER=gemini (ดู extract.ts)
// ใช้ prompt / schema / normalize ชุดเดียวกับ Claude → เปลี่ยนผู้ให้บริการได้โดยไม่ต้องแก้ส่วนอื่น
// ⚠ โควตาฟรีของ Google อาจนำข้อมูลที่ส่งไปใช้พัฒนาโมเดล (ดู CLAUDE.md ส่วน "ตัวเลือก AI")
import { ApiError, GoogleGenAI, type Part } from "@google/genai";
import { z } from "zod";
import { AiResultSchema, type AiTask } from "./schema.ts";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt.ts";
import { AiError, aiError } from "./errors.ts";
import type { Attachment } from "./files.ts";

// "gemini-flash-latest" = รุ่น Flash ล่าสุดที่ Google ชี้ให้ (มีโควตาฟรี) — เปลี่ยนได้ด้วย env GEMINI_MODEL
export const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";
// รุ่นสำรองเมื่อรุ่นหลักคนใช้เยอะ (Google ตอบ 503) — ตั้งเองได้ด้วย GEMINI_FALLBACK_MODEL (ใส่ "none" = ไม่ใช้)
export const DEFAULT_GEMINI_FALLBACK_MODEL = "gemini-flash-lite-latest";
const BUSY = new Set([500, 503, 504]); // เซิร์ฟเวอร์ Google ไม่ว่าง/ขัดข้องชั่วคราว

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
    // 503 "model overloaded" เกิดบ่อยกับโควตาฟรี → ให้ SDK ลองซ้ำเองอีก 2 ครั้ง (รอ 1s, 2s)
    httpOptions: {
      timeout: files.length ? 150_000 : 90_000,
      retryOptions: { attempts: 3, initialDelay: 1, maxDelay: 4 },
    },
  });
  const parts: Part[] = [
    ...files.map((f) => ({ inlineData: { mimeType: f.media_type, data: f.data } })),
    { text: buildUserMessage(text, todayIso, files.length) },
  ];

  const primary = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const fallbackEnv = process.env.GEMINI_FALLBACK_MODEL?.trim();
  const fallback = fallbackEnv === "none" ? null : fallbackEnv || DEFAULT_GEMINI_FALLBACK_MODEL;
  const call = (model: string) =>
    ai.models.generateContent({
      model,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_SCHEMA,
        maxOutputTokens: 16000,
      },
    });

  let raw: string | undefined;
  let finish: string | undefined;
  try {
    let response;
    try {
      response = await call(primary);
    } catch (err) {
      // รุ่นหลักยังไม่ว่างหลังลองซ้ำแล้ว → ลองรุ่นสำรองครั้งเดียว (ถ้ารุ่นสำรองก็ไม่ได้ แจ้ง error ของรุ่นหลัก)
      if (!(err instanceof ApiError && BUSY.has(err.status) && fallback && fallback !== primary)) throw err;
      console.warn("extractWithGemini: primary busy, trying fallback", fallback, googleErrorCode(err));
      response = await call(fallback).catch(() => {
        throw err;
      });
    }
    finish = response.candidates?.[0]?.finishReason;
    if (response.promptFeedback?.blockReason) {
      throw aiError("ai.cantRead", false);
    }
    raw = response.text;
  } catch (err) {
    if (err instanceof AiError) throw err;
    if (err instanceof ApiError) {
      const code = googleErrorCode(err);
      if (/API_KEY_INVALID|API_KEY_SERVICE_BLOCKED|PERMISSION_DENIED/.test(code) || err.status === 401) {
        console.error("extractWithGemini: API key", code);
        throw aiError("ai.gKey", false, { code });
      }
      if (err.status === 404) {
        console.error("extractWithGemini: model", code, err.message);
        throw aiError("ai.gModel", false, { model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL, code });
      }
      if (BUSY.has(err.status)) {
        console.error("extractWithGemini: busy", code);
        throw aiError("ai.gBusy", true, { code });
      }
      if (err.status === 429) {
        // โควตาฟรีมีเพดานต่อนาทีและต่อวัน
        throw aiError("ai.gQuota", true);
      }
      if (err.status === 400 && files.length) {
        console.error("extractWithGemini: file rejected", err.message);
        throw aiError("ai.gFileRejected", false, { code });
      }
      if (err.status === 403) {
        console.error("extractWithGemini: forbidden", code);
        throw aiError("ai.gNotConfigured", false, { code });
      }
      console.error("extractWithGemini", err.status, err.message);
      throw aiError("ai.gTemporary", true, { code });
    }
    console.error("extractWithGemini", err);
    throw aiError("ai.connect", true);
  }

  if (finish === "MAX_TOKENS") {
    throw aiError(files.length ? "ai.tooLongFiles" : "ai.tooLongText", false);
  }
  if (finish && finish !== "STOP") {
    console.error("extractWithGemini: finishReason", finish);
    throw aiError("ai.cantRead", false);
  }

  // ตรวจคำตอบด้วย Zod ชุดเดียวกับ Claude — ผิดรูปแบบ = แจ้งผู้ใช้ ไม่เดาเอง
  try {
    const parsed = AiResultSchema.safeParse(JSON.parse(raw ?? ""));
    if (parsed.success) return parsed.data.tasks;
    console.error("extractWithGemini: schema", parsed.error.issues.slice(0, 3));
  } catch {
    console.error("extractWithGemini: not JSON", raw?.slice(0, 200));
  }
  throw aiError("ai.badFormat", true);
}
