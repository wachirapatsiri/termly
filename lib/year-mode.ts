// แสดงปีเป็น พ.ศ. หรือ ค.ศ. (ผู้ใช้เลือกได้ที่หน้าตั้งค่า) — ข้อมูลในฐานข้อมูลยังเป็น ค.ศ. เสมอ เปลี่ยนแค่ตอนแสดงผล
export type YearMode = "be" | "ce";

export const YEAR_MODE_COOKIE = "year_mode";
export const DEFAULT_YEAR_MODE: YearMode = "be";

export const YEAR_MODE_OPTIONS: { value: YearMode; label: string }[] = [
  { value: "be", label: "พ.ศ." },
  { value: "ce", label: "ค.ศ." },
];

export function isYearMode(v: unknown): v is YearMode {
  return v === "be" || v === "ce";
}
