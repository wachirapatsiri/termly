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
    badge: "border-info-line bg-info-soft text-info",
    dot: "bg-info-solid",
    text: "text-info",
    border: "border-l-info-solid",
  },
  final: {
    badge: "border-final-line bg-final-soft text-final",
    dot: "bg-final-solid",
    text: "text-final",
    border: "border-l-final-solid",
  },
  other: {
    badge: "border-line bg-background text-muted",
    dot: "bg-muted/60",
    text: "text-foreground",
    border: "border-l-muted/40",
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
