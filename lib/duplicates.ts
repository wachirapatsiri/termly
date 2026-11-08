// เช็กว่ารายการที่ AI ดึงมา "น่าจะซ้ำ" กับที่บันทึกไว้แล้ว หรือซ้ำกันเองในชุดเดียวกันหรือไม่
// ใช้ในหน้าตรวจก่อนบันทึก (/import) — เตือนเท่านั้น ผู้ใช้ตัดสินใจเอง
import type { ExamType } from "./exams.ts";

export type DupItem = {
  kind: "task" | "exam";
  title: string;
  date: string | null; // "YYYY-MM-DD" เวลาไทย (null = ยังไม่รู้วัน)
  course_id: string | null; // null = ไม่ระบุวิชา, "new:<...>" = วิชาใหม่ที่ยังไม่ได้สร้าง
  exam_type?: ExamType | null;
};

// เทียบชื่อแบบไม่สนตัวพิมพ์/ช่องว่าง/เครื่องหมาย เช่น "HW 1" = "hw1" = "HW-1"
export function titleKey(title: string): string {
  return title.toLowerCase().replace(/[\s\-_.,:;()[\]"'“”]/g, "");
}

export function isLikelyDuplicate(a: DupItem, b: DupItem): boolean {
  if (a.kind !== b.kind) return false;
  // ระบุวิชาทั้งคู่แต่คนละวิชา → ไม่ซ้ำ
  if (a.course_id && b.course_id && a.course_id !== b.course_id) return false;

  // สอบกลางภาค/ปลายภาค ของวิชาเดียวกัน มีได้ครั้งเดียว
  if (
    a.kind === "exam" &&
    a.course_id &&
    a.course_id === b.course_id &&
    a.exam_type &&
    a.exam_type !== "other" &&
    a.exam_type === b.exam_type
  ) {
    return true;
  }

  // ชื่อเดียวกัน และวันตรงกัน (หรือฝั่งใดฝั่งหนึ่งยังไม่รู้วัน)
  const key = titleKey(a.title);
  if (!key || key !== titleKey(b.title)) return false;
  return !a.date || !b.date || a.date === b.date;
}

// รายการที่บันทึกไว้แล้วตัวแรกที่น่าจะซ้ำ (ไม่มี = undefined)
export function findDuplicate<T extends DupItem>(item: DupItem, existing: T[]): T | undefined {
  return existing.find((e) => isLikelyDuplicate(item, e));
}

// ลำดับของรายการในชุดเดียวกันที่ซ้ำกับรายการก่อนหน้า (รายการแรกไม่ถือว่าซ้ำ)
export function batchDuplicates(items: DupItem[]): Set<number> {
  const dup = new Set<number>();
  items.forEach((item, i) => {
    if (items.slice(0, i).some((prev) => isLikelyDuplicate(item, prev))) dup.add(i);
  });
  return dup;
}

// ─── วิชาที่คล้ายกัน (เช่น รหัสเดียวกันแต่พิมพ์ชื่อต่างกัน) ───

type CourseLike = { id: string; name: string; code: string | null };

const courseNameKey = (s: string) => s.toLowerCase().replace(/[\s\-_.,:;()]/g, "");

// จำนวนตัวอักษรที่ต้องแก้ให้สองคำเหมือนกัน (Levenshtein)
function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// ชื่อคล้ายกัน: เหมือนกัน / อันหนึ่งขึ้นต้นด้วยอีกอัน / พิมพ์ผิดไม่เกิน 2 ตัว (ชื่อยาว ≥ 6)
export function similarCourseName(a: string, b: string): boolean {
  const x = courseNameKey(a);
  const y = courseNameKey(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  if (short.length >= 5 && long.startsWith(short)) return true;
  return short.length >= 6 && editDistance(x, y) <= 2;
}

// วิชาที่มีอยู่แล้วที่น่าจะเป็นวิชาเดียวกัน: รหัสตรงกัน หรือชื่อคล้ายกัน (ไม่นับตัวเอง)
export function findSimilarCourse<T extends CourseLike>(
  input: { id?: string; name: string; code: string | null },
  courses: T[],
): T | undefined {
  const code = input.code ? courseNameKey(input.code) : "";
  return courses.find(
    (c) =>
      c.id !== input.id &&
      ((code && c.code && courseNameKey(c.code) === code) ||
        similarCourseName(c.name, input.name)),
  );
}
