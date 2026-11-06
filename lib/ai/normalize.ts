// ตรวจและเกลาคำตอบของ AI ก่อนส่งให้ผู้ใช้ — ห้ามเดาเงียบ ๆ:
// อะไรที่ไม่แน่ใจ/ผิดรูปแบบ จะลด confidence เป็น low และแนบคำเตือนภาษาไทย
// (ไฟล์นี้ไม่มี server-only จึงทดสอบด้วย node ได้ตรง ๆ: npm run test:ai-unit)
import { beToCe, toDueAt } from "../dates.ts";
import type { AiTask, Confidence, ExtractedTask } from "./schema.ts";

type CourseRef = { id: string; name: string; code: string | null };

const MAX_TASKS = 100;
const TIME_RE = /^([01]?\d|2[0-3])[:.]([0-5]\d)$/;
const DATE_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

function clean(s: string | null | undefined, max: number): string | null {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
}

// ทำให้เทียบชื่อวิชาได้ง่าย: ตัวเล็ก ไม่มีช่องว่าง/ขีด
function key(s: string) {
  return s.toLowerCase().replace(/[\s\-_.]/g, "");
}

// จับคู่ข้อความวิชาจาก AI กับวิชาของผู้ใช้: รหัสตรงกัน > ชื่อตรงกัน > ชื่อมีส่วนที่ตรง
export function matchCourse(text: string | null, courses: CourseRef[]): string | null {
  if (!text) return null;
  const k = key(text);
  if (!k) return null;
  const byCode = courses.find((c) => c.code && k.includes(key(c.code)));
  if (byCode) return byCode.id;
  const byName = courses.find((c) => key(c.name) === k);
  if (byName) return byName.id;
  const partial = courses.filter(
    (c) => key(c.name).length >= 4 && (k.includes(key(c.name)) || key(c.name).includes(k)),
  );
  return partial.length === 1 ? partial[0].id : null; // เจอหลายวิชา = ไม่ชัด ไม่เลือกให้
}

// todayIso = วันนี้ (YYYY-MM-DD เวลาไทย) ใช้ตรวจว่าปีดูสมเหตุสมผลไหม
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
        } else if (Math.abs(year - thisYear) > 1) {
          warnings.push(`ปี ${year + 543} ดูไม่ตรงกับเทอมนี้ กรุณาตรวจ`);
          confidence = "low";
          dueDate = iso;
        } else {
          dueDate = iso;
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
    else if (confidence === "low" && warnings.length === 0) {
      warnings.push("AI ไม่แน่ใจวันที่ กรุณาตรวจกับต้นฉบับ");
    }

    const courseText = clean(t.course, 200);
    out.push({
      title,
      course_text: courseText,
      course_id: matchCourse(courseText, courses),
      due_date: dueDate,
      due_time: dueTime,
      confidence,
      raw_date_text: clean(t.raw_date_text, 200),
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
