import "server-only";
import { cookies } from "next/headers";
import {
  COURSE_LABEL_COOKIE,
  DEFAULT_COURSE_LABEL,
  isCourseLabelMode,
  type CourseLabelMode,
} from "@/lib/course-label";
import { DEFAULT_YEAR_MODE, YEAR_MODE_COOKIE, isYearMode, type YearMode } from "@/lib/year-mode";

// อ่านค่าที่ผู้ใช้ตั้งไว้ (เก็บใน cookie ของเบราว์เซอร์) — ต้องเรียกภายใน <Suspense>
export async function getCourseLabelMode(): Promise<CourseLabelMode> {
  const v = (await cookies()).get(COURSE_LABEL_COOKIE)?.value;
  return isCourseLabelMode(v) ? v : DEFAULT_COURSE_LABEL;
}

// แสดงปีเป็น พ.ศ./ค.ศ. — ต้องเรียกภายใน <Suspense>
export async function getYearMode(): Promise<YearMode> {
  const v = (await cookies()).get(YEAR_MODE_COOKIE)?.value;
  return isYearMode(v) ? v : DEFAULT_YEAR_MODE;
}
