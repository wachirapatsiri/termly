// เลือกผู้ให้บริการ AI ด้วย env — สลับได้โดยไม่ต้องแก้โค้ด (ตั้งใน Vercel → Settings → Environment Variables แล้ว Redeploy)
//   AI_PROVIDER=claude (ค่าเริ่มต้น) ต้องมี ANTHROPIC_API_KEY
//   AI_PROVIDER=gemini               ต้องมี GEMINI_API_KEY (โควตาฟรีจาก Google AI Studio)
//   AI_MODE=mock หรือไม่มี key ของตัวที่เลือก = โหมดจำลอง (ไม่เสียเงิน ไม่นับลิมิต)
import { extractWithClaude } from "./claude.ts";
import { extractWithGemini } from "./gemini.ts";
import type { Attachment } from "./files.ts";
import type { AiTask } from "./schema.ts";

export type AiProvider = "claude" | "gemini";

export function aiProvider(): AiProvider {
  return process.env.AI_PROVIDER?.trim().toLowerCase() === "gemini" ? "gemini" : "claude";
}

export function isMockMode(): boolean {
  if (process.env.AI_MODE === "mock") return true;
  return aiProvider() === "gemini" ? !process.env.GEMINI_API_KEY : !process.env.ANTHROPIC_API_KEY;
}

export function extractTasks(text: string, todayIso: string, files: Attachment[] = []): Promise<AiTask[]> {
  return aiProvider() === "gemini"
    ? extractWithGemini(text, todayIso, files)
    : extractWithClaude(text, todayIso, files);
}
