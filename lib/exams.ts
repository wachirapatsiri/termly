// ฟังก์ชันกลางของ "สอบ" (ตาราง events kind = exam) — ใช้ทั้งหน้า /exams, หน้างาน และหน้านำเข้า
// import ด้วยนามสกุล .ts เพื่อให้ `node --test` รันได้ตรง
import { daysUntil, toBangkokParts, toDueAt } from "./dates.ts";

export type ExamType = "midterm" | "final" | "other";
export const EXAM_TYPES: ExamType[] = ["midterm", "final", "other"];
export const EXAM_TYPE_LABEL: Record<ExamType, string> = {
  midterm: "สอบกลางภาค",
  final: "สอบปลายภาค",
  other: "สอบอื่น ๆ",
};

export function isExamType(v: unknown): v is ExamType {
  return v === "midterm" || v === "final" || v === "other";
}

// จำนวนวันที่ถือว่า "ใกล้ถึง" (แถบบนหน้างาน)
export const UPCOMING_EXAM_DAYS = 14;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// วัน + เวลาเริ่ม/จบ (เวลาไทย) → ค่าที่เก็บในตาราง events
// ไม่รู้วัน = starts_at null; รู้แค่วัน = 00:00 ของวันนั้น (has_time false)
// เวลาจบเก็บเฉพาะเมื่อมีเวลาเริ่ม และจบหลังเริ่ม
export function buildExamTimes(
  date: string | null,
  start: string | null,
  end: string | null,
):
  | { ok: true; starts_at: string | null; ends_at: string | null; has_time: boolean }
  | { ok: false; error: string } {
  if (!date) {
    if (start || end) return { ok: false, error: "ใส่เวลาแล้ว กรุณาเลือกวันสอบด้วย" };
    return { ok: true, starts_at: null, ends_at: null, has_time: false };
  }
  if (start && !TIME_RE.test(start)) return { ok: false, error: "เวลาเริ่มไม่ถูกต้อง" };
  if (end && !TIME_RE.test(end)) return { ok: false, error: "เวลาจบไม่ถูกต้อง" };
  if (end && !start) return { ok: false, error: "ใส่เวลาจบแล้ว กรุณาใส่เวลาเริ่มด้วย" };
  if (start && end && end <= start) return { ok: false, error: "เวลาจบต้องหลังเวลาเริ่ม" };

  const startsAt = toDueAt(date, start || "00:00");
  if (!startsAt) return { ok: false, error: "วันสอบไม่ถูกต้อง" };
  return {
    ok: true,
    starts_at: startsAt,
    ends_at: start && end ? toDueAt(date, end) : null,
    has_time: Boolean(start),
  };
}

// ช่วงเวลาสอบ เช่น "09:00–12:00 น." หรือ "09:00 น." (null = ไม่รู้เวลา)
export function formatExamTime(e: {
  starts_at: string | null;
  ends_at: string | null;
  has_time: boolean;
}): string | null {
  if (!e.starts_at || !e.has_time) return null;
  const start = toBangkokParts(e.starts_at).time;
  const end = e.ends_at ? toBangkokParts(e.ends_at).time : null;
  return `${start}${end ? `–${end}` : ""} น.`;
}

// "วันนี้" / "พรุ่งนี้" / "อีก 5 วัน" / "ผ่านไปแล้ว"
export function countdownLabel(days: number): string {
  if (days < 0) return "ผ่านไปแล้ว";
  if (days === 0) return "วันนี้";
  if (days === 1) return "พรุ่งนี้";
  return `อีก ${days} วัน`;
}

// สอบที่ยังไม่ถึง (รวมวันนี้) ภายใน `days` วัน เรียงตามวัน
export function upcomingExams<T extends { starts_at: string | null }>(
  exams: T[],
  now: Date = new Date(),
  days: number = UPCOMING_EXAM_DAYS,
): (T & { daysLeft: number })[] {
  return exams
    .filter((e): e is T & { starts_at: string } => Boolean(e.starts_at))
    .map((e) => ({ ...e, daysLeft: daysUntil(e.starts_at, now) }))
    .filter((e) => e.daysLeft >= 0 && e.daysLeft <= days)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}
