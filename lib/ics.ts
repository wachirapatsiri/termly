// สร้างไฟล์ปฏิทิน .ics (RFC 5545) จากงานและสอบ — ใช้ใน GET /api/export-ics
// import ด้วยนามสกุล .ts เพื่อให้ `node --test` รันได้ตรง
//
// กติกา:
// - งานที่มีเวลาส่ง → event 30 นาที จบตรงเวลาส่ง; รู้แค่วัน → event ทั้งวัน
// - สอบที่มีเวลา → เวลาเริ่ม–จบ (ไม่รู้เวลาจบ = 1 ชม.); รู้แค่วัน → ทั้งวัน
// - ไม่มีวัน (งานยังไม่กำหนดวันส่ง / สอบยังไม่ประกาศวัน) → ไม่ใส่ลงไฟล์
// - เวลาเขียนเป็น UTC (ลงท้าย Z) ไม่ต้องใส่ VTIMEZONE; วันทั้งวันใช้วันตามเวลาไทย
// - UID คงที่ต่อรายการ → นำเข้าซ้ำ ปฏิทินส่วนใหญ่จะแก้ของเดิมแทนการเพิ่มซ้ำ
// - เตือน 1 วันก่อน (Google Calendar ตอนนำเข้าไฟล์มักไม่สนส่วนนี้ ใช้การเตือนของปฏิทินเอง)
import { toBangkokParts } from "./dates.ts";

export type IcsItem = {
  uid: string;
  title: string;
  start: string; // ISO
  end: string | null; // ISO (ใช้เมื่อ allDay = false)
  allDay: boolean; // true = ใช้วันของ start ตามเวลาไทย
  description?: string | null;
  location?: string | null;
};

const TASK_DURATION_MIN = 30;
const EXAM_DEFAULT_MIN = 60;
const CRLF = "\r\n";

// ข้อความใน iCalendar ต้อง escape \ ; , และขึ้นบรรทัดใหม่
export function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// บรรทัดยาวเกิน 75 ไบต์ต้องพับ (บรรทัดต่อขึ้นต้นด้วยช่องว่าง)
// ภาษาไทย 1 ตัว = 3 ไบต์ → ตัดตามตัวอักษร ไม่ตัดกลางตัว
const encoder = new TextEncoder();
export function foldLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = encoder.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // บรรทัดต่อมีช่องว่างนำหน้า 1 ไบต์
    if (bytes + n > limit) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join(CRLF + " ");
}

// ISO → 20261111T075900Z
export function utcStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// วันตามเวลาไทย → 20261111 (และวันถัดไปสำหรับ DTEND ของ event ทั้งวัน)
function bangkokDate(iso: string, addDays = 0): string {
  const [y, m, d] = toBangkokParts(iso).date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + addDays));
  return dt.toISOString().slice(0, 10).replace(/-/g, "");
}

function minutesBefore(iso: string, min: number): string {
  return new Date(Date.parse(iso) - min * 60_000).toISOString();
}
function minutesAfter(iso: string, min: number): string {
  return new Date(Date.parse(iso) + min * 60_000).toISOString();
}

// ─── แปลงงาน/สอบ → IcsItem ───

export type IcsTask = {
  id: string;
  title: string;
  due_at: string | null;
  due_has_time: boolean;
  notes: string | null;
  done: boolean;
};

export type IcsExam = {
  id: string;
  starts_at: string | null;
  ends_at: string | null;
  has_time: boolean;
  location: string | null;
  notes: string | null;
};

export function taskToIcs(
  task: IcsTask,
  opts: { courseLabel?: string | null; courseName?: string | null; category?: string | null },
): IcsItem | null {
  if (!task.due_at) return null;
  const prefix = opts.courseLabel ? `[${opts.courseLabel}] ` : "";
  const desc = [
    task.done ? "✅ ทำเสร็จแล้ว" : null,
    opts.courseName ? `วิชา: ${opts.courseName}` : null,
    opts.category ? `ประเภท: ${opts.category}` : null,
    task.due_has_time ? null : "ส่งภายในวันนี้ (ไม่ระบุเวลา)",
    task.notes,
    "จาก Termly",
  ].filter(Boolean);
  return {
    uid: `task-${task.id}@termly`,
    title: `${task.done ? "✅ " : ""}${prefix}${task.title}`,
    start: task.due_has_time ? minutesBefore(task.due_at, TASK_DURATION_MIN) : task.due_at,
    end: task.due_has_time ? task.due_at : null,
    allDay: !task.due_has_time,
    description: desc.join("\n"),
  };
}

export function examToIcs(
  exam: IcsExam,
  opts: { label: string; courseName?: string | null },
): IcsItem | null {
  if (!exam.starts_at) return null;
  const timed = exam.has_time;
  const desc = [
    opts.courseName ? `วิชา: ${opts.courseName}` : null,
    timed && !exam.ends_at ? "ไม่ระบุเวลาจบ" : null,
    exam.notes,
    "จาก Termly",
  ].filter(Boolean);
  return {
    uid: `exam-${exam.id}@termly`,
    title: `📝 ${opts.label}`,
    start: exam.starts_at,
    end: timed ? (exam.ends_at ?? minutesAfter(exam.starts_at, EXAM_DEFAULT_MIN)) : null,
    allDay: !timed,
    description: desc.join("\n"),
    location: exam.location,
  };
}

// ─── รวมเป็นไฟล์ ───

export function buildIcs(items: IcsItem[], now: Date = new Date()): string {
  const stamp = utcStamp(now.toISOString());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Termly//Termly//TH",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Termly",
    "X-WR-TIMEZONE:Asia/Bangkok",
  ];
  for (const it of items) {
    lines.push("BEGIN:VEVENT", `UID:${it.uid}`, `DTSTAMP:${stamp}`);
    if (it.allDay) {
      lines.push(
        `DTSTART;VALUE=DATE:${bangkokDate(it.start)}`,
        `DTEND;VALUE=DATE:${bangkokDate(it.start, 1)}`,
        "TRANSP:TRANSPARENT", // ทั้งวัน = ไม่บล็อกเวลาว่าง
      );
    } else {
      lines.push(`DTSTART:${utcStamp(it.start)}`, `DTEND:${utcStamp(it.end ?? it.start)}`);
    }
    lines.push(`SUMMARY:${escapeText(it.title)}`);
    if (it.description) lines.push(`DESCRIPTION:${escapeText(it.description)}`);
    if (it.location) lines.push(`LOCATION:${escapeText(it.location)}`);
    // เตือน: มีเวลา = 24 ชม. ก่อน; ทั้งวัน = 09:00 ของวันก่อนหน้า (เที่ยงคืน − 15 ชม.)
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(it.title)}`,
      `TRIGGER:${it.allDay ? "-PT15H" : "-P1D"}`,
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join(CRLF) + CRLF;
}

// ─── ตัวเลือกการส่งออก (จาก query string) ───

export type IcsOptions = {
  pending: boolean; // งานที่ยังไม่เสร็จ
  done: boolean; // งานที่เสร็จแล้ว
  exams: boolean;
  courses: string[] | null; // null = ทุกวิชา; "none" = รายการที่ไม่มีวิชา
};

export const NO_COURSE = "none";

export function parseIcsOptions(params: URLSearchParams): IcsOptions {
  // ไม่ส่งตัวเลือกมาเลย = ค่าเริ่มต้น: งานค้าง + สอบ ทุกวิชา
  const has = (k: string) => params.has(k);
  const flag = (k: string, dflt: boolean) => (has(k) ? params.get(k) === "1" : dflt);
  const courses = params.getAll("course").filter(Boolean);
  return {
    pending: flag("pending", true),
    done: flag("done", false),
    exams: flag("exams", true),
    courses: courses.length ? courses : null,
  };
}

export function icsQuery(o: IcsOptions): string {
  const p = new URLSearchParams();
  p.set("pending", o.pending ? "1" : "0");
  p.set("done", o.done ? "1" : "0");
  p.set("exams", o.exams ? "1" : "0");
  for (const c of o.courses ?? []) p.append("course", c);
  return p.toString();
}

// รายการนี้อยู่ในวิชาที่เลือกไหม
export function courseSelected(courseId: string | null, courses: string[] | null): boolean {
  if (!courses) return true;
  return courses.includes(courseId ?? NO_COURSE);
}
