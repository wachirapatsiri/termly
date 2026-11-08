// จัดการวันที่: เก็บเป็น ค.ศ. (timestamptz) แสดงผลเป็น พ.ศ. โซนเวลา Asia/Bangkok
// ประเทศไทยไม่มี daylight saving → เวลาไทย = UTC+7 ตลอดปี
import type { YearMode } from "./year-mode.ts";

export const TIME_ZONE = "Asia/Bangkok";
const BANGKOK_OFFSET = "+07:00";

// เวลาที่ใช้แทน เมื่อรู้แค่วันส่งแต่ไม่รู้เวลา (ถือว่าส่งได้ถึงท้ายวัน)
export const END_OF_DAY = "23:59";

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

// ปี พ.ศ. ↔ ค.ศ. (ต่างกัน 543 ปี)
export function beToCe(year: number) {
  return year - 543;
}
export function ceToBe(year: number) {
  return year + 543;
}

// "2026-11-11" (+ "14:30") เวลาไทย → ISO string สำหรับบันทึก
// คืน null ถ้ารูปแบบผิดหรือเป็นวันที่ที่ไม่มีจริง (เช่น 31 ก.พ.)
export function toDueAt(date: string, time?: string | null): string | null {
  const m = DATE_RE.exec(date);
  if (!m) return null;
  const t = time || END_OF_DAY;
  if (!TIME_RE.test(t)) return null;

  const [, y, mo, d] = m.map(Number);
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== mo - 1 ||
    check.getUTCDate() !== d
  ) {
    return null;
  }

  return new Date(`${date}T${t}:00${BANGKOK_OFFSET}`).toISOString();
}

// ISO string → { date: "2026-11-11", time: "23:59" } ในเวลาไทย (ใช้เติมค่าในฟอร์ม)
export function toBangkokParts(iso: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

const DATE_PARTS: Intl.DateTimeFormatOptions = {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
};
// ชื่อวัน/เดือนเป็นไทยทั้งคู่ ต่างกันแค่ปี: buddhist = พ.ศ., gregory = ค.ศ.
const thaiDate: Record<YearMode, Intl.DateTimeFormat> = {
  be: new Intl.DateTimeFormat("th-TH-u-ca-buddhist", DATE_PARTS),
  ce: new Intl.DateTimeFormat("th-TH-u-ca-gregory", DATE_PARTS),
};
const thaiTime = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// แสดงวันส่งแบบไทย เช่น "พุธ 11 พ.ย. 2569" หรือ "พุธ 11 พ.ย. 2569 · 14:30 น."
// yearMode "ce" = "พุธ 11 พ.ย. 2026" (ตั้งค่าที่หน้า ⚙ — ฝั่ง client ใช้ useYearMode())
export function formatDue(iso: string, hasTime: boolean, yearMode: YearMode = "be"): string {
  const d = new Date(iso);
  const date = thaiDate[yearMode].format(d);
  return hasTime ? `${date} · ${thaiTime.format(d)} น.` : date;
}

// ─── จัดกลุ่มงานตามวันส่ง (ยึดวันในเวลาไทย) ───

export type DueGroup = "overdue" | "today" | "tomorrow" | "week" | "later";

export const DUE_GROUP_LABEL: Record<DueGroup, string> = {
  overdue: "เลยกำหนด",
  today: "วันนี้",
  tomorrow: "พรุ่งนี้",
  week: "ภายใน 7 วัน",
  later: "หลังจากนั้น",
};

// จำนวนวันจาก "วันนี้" ถึงวันส่ง (นับตามปฏิทินไทย ไม่สนชั่วโมง) เช่น พรุ่งนี้ = 1
export function daysUntil(iso: string, now: Date = new Date()): number {
  const toDayNumber = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    return Date.UTC(y, m - 1, day) / 86_400_000;
  };
  return (
    toDayNumber(toBangkokParts(iso).date) -
    toDayNumber(toBangkokParts(now.toISOString()).date)
  );
}

export function dueGroup(iso: string, now: Date = new Date()): DueGroup {
  if (new Date(iso).getTime() < now.getTime()) return "overdue";
  const days = daysUntil(iso, now);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 7) return "week";
  return "later";
}

// ─── เวลาที่เหลือถึงเที่ยงคืนเวลาไทย (โควตา AI รายวันเริ่มนับใหม่) ───

// เช่น "3 ชม. 12 นาที", "45 นาที", "1 นาที" (ไม่ต่ำกว่า 1 นาที)
export function untilBangkokMidnight(now: Date = new Date()): string {
  const today = toBangkokParts(now.toISOString()).date;
  const next = new Date(`${today}T00:00:00${BANGKOK_OFFSET}`);
  next.setUTCDate(next.getUTCDate() + 1);
  const mins = Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} นาที`;
  return m === 0 ? `${h} ชม.` : `${h} ชม. ${m} นาที`;
}
