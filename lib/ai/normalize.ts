// ตรวจและเกลาคำตอบของ AI ก่อนส่งให้ผู้ใช้ — ห้ามเดาเงียบ ๆ:
// อะไรที่ไม่แน่ใจ/ผิดรูปแบบ จะลด confidence และแนบคำเตือนภาษาไทย
// (ไฟล์นี้ไม่มี server-only จึงทดสอบด้วย node ได้ตรง ๆ: npm run test:ai-unit)
import { beToCe, toDueAt } from "../dates.ts";
import type { AiTask, Confidence, ExtractedTask } from "./schema.ts";

export type CourseRef = { id: string; name: string; code: string | null };

const MAX_TASKS = 100;
const TIME_RE = /^([01]?\d|2[0-3])[:.]([0-5]\d)$/;
const DATE_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

function clean(s: string | null | undefined, max: number): string | null {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
}

// ทำให้เทียบชื่อวิชาได้ง่าย: ตัวเล็ก ไม่มีช่องว่าง/ขีด/จุด
export function courseKey(s: string) {
  return s.toLowerCase().replace(/[\s\-_.]/g, "");
}

// จับคู่วิชาจาก AI กับวิชาของผู้ใช้: รหัสตรงกัน > ชื่อตรงกัน > ชื่อมีส่วนที่ตรง (ต้องเจอวิชาเดียว)
export function matchCourse(
  code: string | null,
  name: string | null,
  courses: CourseRef[],
): string | null {
  const k = courseKey(`${code ?? ""}${name ?? ""}`);
  if (!k) return null;
  const byCode = courses.find((c) => c.code && k.includes(courseKey(c.code)));
  if (byCode) return byCode.id;
  if (!name) return null;
  const n = courseKey(name);
  const byName = courses.find((c) => courseKey(c.name) === n);
  if (byName) return byName.id;
  const partial = courses.filter((c) => {
    const cn = courseKey(c.name);
    return cn.length >= 4 && n.length >= 4 && (n.includes(cn) || cn.includes(n));
  });
  return partial.length === 1 ? partial[0].id : null; // เจอหลายวิชา = ไม่ชัด ไม่เลือกให้
}

// ─── ตรวจวันในสัปดาห์ ("วันอาทิตย์ที่ 30 สิงหาคม") ให้ตรงกับวันที่ ───
// ช่วยจับกรณี AI เลือกปีผิด เพราะปีที่ต่างกัน วันในสัปดาห์จะไม่ตรง
const WEEKDAY_PATTERNS: [number, RegExp][] = [
  [0, /อาทิตย์(?!\s*(หน้า|นี้|ก่อน|ที่แล้ว|ถัดไป))|\bsun(day)?\b/i],
  [1, /จันทร์|\bmon(day)?\b/i],
  [2, /อังคาร|\btue(s|sday)?\b/i],
  [3, /พุธ|\bwed(nesday)?\b/i],
  [4, /พฤหัส|\bthu(rs|rsday)?\b/i],
  [5, /ศุกร์|\bfri(day)?\b/i],
  [6, /เสาร์|\bsat(urday)?\b/i],
];

// คืนเลขวัน (0 = อาทิตย์) ถ้าข้อความระบุวันในสัปดาห์ "วันเดียว" ไม่งั้นคืน null
export function mentionedWeekday(text: string | null): number | null {
  if (!text) return null;
  const found = WEEKDAY_PATTERNS.filter(([, re]) => re.test(text)).map(([d]) => d);
  return found.length === 1 ? found[0] : null;
}

function weekdayOf(iso: string) {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

// todayIso = วันนี้ (YYYY-MM-DD เวลาไทย) ใช้ตรวจปีและงานที่เลยกำหนด
export function normalizeTasks(
  raw: AiTask[],
  courses: CourseRef[],
  todayIso: string,
): ExtractedTask[] {
  const thisYear = Number(todayIso.slice(0, 4));
  const out: ExtractedTask[] = [];

  for (const t of raw.slice(0, MAX_TASKS)) {
    const title = clean(t.title, 300);
    if (!title) continue; // ไม่มีชื่องาน = ไม่ใช่รายการที่ใช้ได้

    const warnings: string[] = [];
    let confidence: Confidence = t.due_date_confidence ?? "low";
    let dueDate: string | null = null;
    let dueTime: string | null = null;
    const rawText = clean(t.raw_date_text, 200);

    // ── วันที่ ──
    const rawDate = clean(t.due_date, 20);
    if (rawDate) {
      const m = DATE_RE.exec(rawDate);
      if (!m) {
        warnings.push("AI ส่งวันที่ผิดรูปแบบ กรุณาใส่วันส่งเอง");
        confidence = "low";
      } else {
        let year = Number(m[1]);
        // AI ลืมแปลง พ.ศ. → ค.ศ. (ปี 25xx) — แปลงให้ แต่บอกผู้ใช้
        if (year >= 2400) {
          year = beToCe(year);
          warnings.push("แปลงปี พ.ศ. เป็น ค.ศ. ให้แล้ว กรุณาตรวจวันที่");
          if (confidence === "high") confidence = "medium";
        }
        const iso = `${year}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
        if (!toDueAt(iso)) {
          warnings.push("วันที่นี้ไม่มีอยู่จริง กรุณาใส่วันส่งเอง");
          confidence = "low";
        } else {
          dueDate = iso;
          if (Math.abs(year - thisYear) > 1) {
            warnings.push(`ปี ${year + 543} ดูไม่ตรงกับเทอมนี้ กรุณาตรวจ`);
            confidence = "low";
          }
          const wd = mentionedWeekday(rawText);
          if (wd !== null && wd !== weekdayOf(iso)) {
            warnings.push("วันในสัปดาห์ไม่ตรงกับวันที่ (ปีหรือวันอาจผิด) กรุณาตรวจ");
            confidence = "low";
          }
          if (iso < todayIso) warnings.push("วันส่งผ่านไปแล้ว");
        }
      }
    } else if (confidence !== "low") {
      // ไม่มีวันที่ แต่ AI บอกว่ามั่นใจ = ขัดกันเอง
      confidence = "low";
    }

    // ── เวลา ──
    const rawTime = clean(t.due_time, 10);
    if (rawTime && dueDate) {
      const tm = TIME_RE.exec(rawTime);
      if (tm) dueTime = `${tm[1].padStart(2, "0")}:${tm[2]}`;
      else warnings.push("เวลาส่งอ่านไม่ออก ถือว่าส่งได้ถึง 23:59");
    }

    if (!dueDate) warnings.unshift("ยังไม่รู้วันส่ง");
    else if (confidence === "low" && !warnings.some((w) => w !== "วันส่งผ่านไปแล้ว")) {
      warnings.push("AI ไม่แน่ใจวันที่ กรุณาตรวจกับต้นฉบับ");
    }

    const courseCode = clean(t.course_code, 50);
    const courseName = clean(t.course_name, 200);
    out.push({
      title,
      course_code: courseCode,
      course_name: courseName,
      course_id: matchCourse(courseCode, courseName, courses),
      due_date: dueDate,
      due_time: dueTime,
      confidence,
      raw_date_text: rawText,
      note: clean(t.note, 2000),
      warnings,
    });
  }

  // เรียงตามวันส่ง (ไม่มีวันส่งไว้ท้าย) ให้อ่านง่าย
  return out.sort((a, b) => {
    if (a.due_date === b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date < b.due_date ? -1 : 1;
  });
}
