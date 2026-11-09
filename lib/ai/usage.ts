// สรุปการใช้ AI วันนี้จากแถวใน ai_usage (นับตามวันไทย) — ฟังก์ชันล้วน ทดสอบได้ไม่ต้องต่อฐานข้อมูล
import { AI_DAILY_ATTEMPT_LIMIT, AI_DAILY_LIMIT } from "./limits.ts";

export type AiUsage = {
  used: number; // ครั้งที่สำเร็จวันนี้ (นับโควตา)
  limit: number; // AI_DAILY_LIMIT
  attempts: number; // ทุกครั้งวันนี้ รวมที่ล้มเหลว
};

export function summarizeUsage(rows: { success: boolean }[]): AiUsage {
  return {
    used: rows.filter((r) => r.success).length,
    limit: AI_DAILY_LIMIT,
    attempts: rows.length,
  };
}

// เหตุที่ใช้ต่อไม่ได้ (null = ใช้ได้)
export function usageBlock(u: AiUsage): "quota" | "attempts" | null {
  if (u.used >= u.limit) return "quota";
  if (u.attempts >= AI_DAILY_ATTEMPT_LIMIT) return "attempts";
  return null;
}

// เวลาเริ่มวันนี้ (00:00 เวลาไทย) เป็น ISO — ใช้กรอง created_at
export function bangkokDayStartIso(bangkokDate: string): string {
  return new Date(`${bangkokDate}T00:00:00+07:00`).toISOString();
}
