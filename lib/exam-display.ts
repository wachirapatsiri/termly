// ข้อมูลการแสดงผลของสอบ ที่ใช้ได้ทั้งฝั่งเซิร์ฟเวอร์และ client
// (ห้ามย้ายไปไว้ในไฟล์ "use client" — หน้า server component เรียกฟังก์ชันจากไฟล์ client ไม่ได้)
import { courseLabel, type CourseLabelMode } from "@/lib/course-label";
import { EXAM_TYPE_LABEL, type ExamType } from "@/lib/exams";
import type { CalendarEvent, Course } from "@/lib/types";

// สีของแต่ละชนิดสอบ: กลางภาค = น้ำเงิน, ปลายภาค = ม่วง, อื่น ๆ = เทา
// (เขียนชื่อคลาสเต็ม ๆ ให้ Tailwind หาเจอ)
export const EXAM_TYPE_TONE: Record<
  ExamType,
  { badge: string; dot: string; text: string; border: string }
> = {
  midterm: {
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
    text: "text-blue-800",
    border: "border-l-blue-500",
  },
  final: {
    badge: "border-violet-200 bg-violet-50 text-violet-700",
    dot: "bg-violet-500",
    text: "text-violet-800",
    border: "border-l-violet-500",
  },
  other: {
    badge: "border-line bg-background text-muted",
    dot: "bg-slate-400",
    text: "text-foreground",
    border: "border-l-slate-300",
  },
};

// ชื่อสั้นของสอบ: มีวิชา → "สอบกลางภาค 204383" ไม่มี → ชื่อที่บันทึกไว้
export function examLabel(
  exam: Pick<CalendarEvent, "title" | "exam_type">,
  course: Course | undefined,
  labelMode: CourseLabelMode,
) {
  return course
    ? `${EXAM_TYPE_LABEL[exam.exam_type ?? "other"]} ${courseLabel(course, labelMode)}`
    : exam.title;
}
