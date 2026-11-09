// สีประจำวิชา: 8 สี (ค่าจริงอยู่ใน app/globals.css --course-0 … --course-7 แยกโหมดสว่าง/มืด)
// courses.color (migration 0005) = เลข 0–7 ที่ผู้ใช้เลือก, null = เลือกให้อัตโนมัติจาก id (วิชาเดิมได้สีเดิมเสมอ)
export const COURSE_COLOR_COUNT = 8;
export const COURSE_COLOR_NAMES = [
  "น้ำเงิน",
  "เขียว",
  "ส้ม",
  "ชมพู",
  "ม่วง",
  "ฟ้า",
  "เหลือง",
  "เขียวอ่อน",
] as const;

export function isCourseColor(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v < COURSE_COLOR_COUNT;
}

export function courseColorIndex(course: { id: string; color?: number | null }): number {
  if (isCourseColor(course.color)) return course.color;
  let h = 0;
  for (const ch of course.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % COURSE_COLOR_COUNT;
}

// ใช้ใน style เช่น { backgroundColor: courseColor(c) }
export function courseColor(course: { id: string; color?: number | null }): string {
  return `var(--course-${courseColorIndex(course)})`;
}

export function colorVar(index: number): string {
  return `var(--course-${index})`;
}
