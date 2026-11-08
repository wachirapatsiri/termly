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
