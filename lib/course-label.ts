import type { Course } from "@/lib/types";

// วิธีแสดงวิชาในงาน (ผู้ใช้เลือกได้ที่หน้าตั้งค่า)
export type CourseLabelMode = "code" | "name" | "both";

export const COURSE_LABEL_COOKIE = "course_label";
export const DEFAULT_COURSE_LABEL: CourseLabelMode = "code";

export const COURSE_LABEL_OPTIONS: { value: CourseLabelMode; label: string }[] = [
  { value: "code", label: "รหัสวิชา" },
  { value: "name", label: "ชื่อวิชา" },
  { value: "both", label: "รหัส + ชื่อ" },
];

export function isCourseLabelMode(v: unknown): v is CourseLabelMode {
  return v === "code" || v === "name" || v === "both";
}

// ข้อความวิชาที่จะแสดง — ถ้าเลือกรหัสแต่วิชาไม่มีรหัส ใช้ชื่อแทน
export function courseLabel(course: Pick<Course, "name" | "code">, mode: CourseLabelMode) {
  if (mode === "name" || !course.code) return course.name;
  if (mode === "both") return `${course.code} ${course.name}`;
  return course.code;
}
