// มุมมองรายสัปดาห์ (จันทร์–อาทิตย์ เวลาไทย): แบ่งงาน/สอบเป็นสัปดาห์ + บอกว่าสัปดาห์ไหนงานหนัก
// "งานหนัก" นับจากจำนวนงาน (tasks) ที่ครบกำหนดในสัปดาห์นั้นเท่านั้น — สอบแสดงในสัปดาห์แต่ไม่นับรวม (ผู้ใช้เลือก 9 พ.ย.)
// import ด้วยนามสกุล .ts เพื่อให้ `node --test` รันได้ตรง
import { toBangkokParts } from "./dates.ts";
import type { YearMode } from "./year-mode.ts";

export type WeekLoad = "free" | "light" | "medium" | "heavy";

// เกณฑ์จำนวนงานต่อสัปดาห์: 0 ว่าง, 1–2 เบา, 3–4 ปานกลาง, ≥ 5 หนัก
export const MEDIUM_WEEK_TASKS = 3;
export const HEAVY_WEEK_TASKS = 5;

export const WEEK_LOAD_LABEL: Record<WeekLoad, string> = {
  free: "ว่าง",
  light: "สบาย ๆ",
  medium: "ปานกลาง",
  heavy: "งานหนัก",
};

export function weekLoad(taskCount: number): WeekLoad {
  if (taskCount >= HEAVY_WEEK_TASKS) return "heavy";
  if (taskCount >= MEDIUM_WEEK_TASKS) return "medium";
  if (taskCount > 0) return "light";
  return "free";
}

// แสดงอย่างน้อยกี่สัปดาห์ (นับสัปดาห์นี้) และไม่เกินกี่สัปดาห์ (1 เทอม ~ 18 สัปดาห์)
export const MIN_WEEKS = 4;
export const MAX_WEEKS = 26;

const DAY_MS = 86_400_000;

// "YYYY-MM-DD" → เลขวัน (นับจาก 1970) / กลับกัน — คิดแบบปฏิทินล้วน ไม่สนโซนเวลา
function dayNumber(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}
function fromDayNumber(n: number): string {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

// วันจันทร์ของสัปดาห์ที่ `iso` อยู่ (ตามวันในเวลาไทย) เช่น พุธ 11 พ.ย. 2026 → "2026-11-09"
export function weekStartOf(iso: string): string {
  const n = dayNumber(toBangkokParts(iso).date);
  const weekday = (new Date(n * DAY_MS).getUTCDay() + 6) % 7; // จันทร์ = 0 … อาทิตย์ = 6
  return fromDayNumber(n - weekday);
}

export function addDays(date: string, days: number): string {
  return fromDayNumber(dayNumber(date) + days);
}

export type Week<T, E> = {
  start: string; // วันจันทร์ "YYYY-MM-DD"
  end: string; // วันอาทิตย์
  offset: number; // 0 = สัปดาห์นี้, 1 = สัปดาห์หน้า, …
  tasks: T[];
  exams: E[];
  taskCount: number;
  doneCount: number;
  load: WeekLoad;
};

// แบ่งงาน/สอบเป็นสัปดาห์ ตั้งแต่สัปดาห์นี้ไปจนถึงสัปดาห์สุดท้ายที่มีงาน/สอบ
// (อย่างน้อย MIN_WEEKS ไม่เกิน MAX_WEEKS) — สัปดาห์ก่อนหน้านี้และงานไม่มีวันส่งไม่อยู่ในนี้
export function buildWeeks<
  T extends { due_at: string | null; done: boolean },
  E extends { starts_at: string | null },
>(tasks: T[], exams: E[], now: Date = new Date()): Week<T, E>[] {
  const thisWeek = weekStartOf(now.toISOString());
  const base = dayNumber(thisWeek);
  const offsetOf = (iso: string) => Math.floor((dayNumber(weekStartOf(iso)) - base) / 7);

  let last = MIN_WEEKS - 1;
  const taskByWeek = new Map<number, T[]>();
  const examByWeek = new Map<number, E[]>();
  for (const t of tasks) {
    if (!t.due_at) continue;
    const o = offsetOf(t.due_at);
    if (o < 0 || o >= MAX_WEEKS) continue;
    taskByWeek.set(o, [...(taskByWeek.get(o) ?? []), t]);
    last = Math.max(last, o);
  }
  for (const e of exams) {
    if (!e.starts_at) continue;
    const o = offsetOf(e.starts_at);
    if (o < 0 || o >= MAX_WEEKS) continue;
    examByWeek.set(o, [...(examByWeek.get(o) ?? []), e]);
    last = Math.max(last, o);
  }

  const byDate = (a: string | null, b: string | null) => (a ?? "").localeCompare(b ?? "");
  const weeks: Week<T, E>[] = [];
  for (let o = 0; o <= last; o++) {
    const start = fromDayNumber(base + o * 7);
    const weekTasks = (taskByWeek.get(o) ?? []).sort((a, b) => byDate(a.due_at, b.due_at));
    const weekExams = (examByWeek.get(o) ?? []).sort((a, b) => byDate(a.starts_at, b.starts_at));
    weeks.push({
      start,
      end: addDays(start, 6),
      offset: o,
      tasks: weekTasks,
      exams: weekExams,
      taskCount: weekTasks.length,
      doneCount: weekTasks.filter((t) => t.done).length,
      load: weekLoad(weekTasks.length),
    });
  }
  return weeks;
}

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

// ช่วงวันของสัปดาห์ เช่น "9–15 พ.ย." หรือ "30 พ.ย. – 6 ธ.ค."
// ใส่ปีเมื่อไม่ใช่ปีเดียวกับ `now` เช่น "28 ธ.ค. 2569 – 3 ม.ค. 2570"
export function formatWeekRange(
  start: string,
  end: string,
  yearMode: YearMode = "be",
  now: Date = new Date(),
): string {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const nowYear = Number(toBangkokParts(now.toISOString()).date.slice(0, 4));
  const year = (y: number) => (yearMode === "be" ? y + 543 : y);
  const showYear = sy !== nowYear || ey !== nowYear;
  const tail = (y: number) => (showYear ? ` ${year(y)}` : "");
  if (sy === ey && sm === em) return `${sd}–${ed} ${MONTHS[em - 1]}${tail(ey)}`;
  return `${sd} ${MONTHS[sm - 1]}${sy !== ey ? tail(sy) : ""} – ${ed} ${MONTHS[em - 1]}${tail(ey)}`;
}

// "สัปดาห์นี้" / "สัปดาห์หน้า" / "อีก 3 สัปดาห์"
export function weekOffsetLabel(offset: number): string {
  if (offset === 0) return "สัปดาห์นี้";
  if (offset === 1) return "สัปดาห์หน้า";
  return `อีก ${offset} สัปดาห์`;
}

const WEEKDAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

// ชื่อวันย่อ + วันที่ เช่น "พ. 11"
export function shortDay(iso: string): string {
  const date = toBangkokParts(iso).date;
  const n = dayNumber(date);
  return `${WEEKDAYS[new Date(n * DAY_MS).getUTCDay()]} ${Number(date.slice(8, 10))}`;
}
