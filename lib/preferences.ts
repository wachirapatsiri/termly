import "server-only";
import { cookies } from "next/headers";
import {
  COURSE_LABEL_COOKIE,
  DEFAULT_COURSE_LABEL,
  isCourseLabelMode,
  type CourseLabelMode,
} from "@/lib/course-label";

// อ่านค่าที่ผู้ใช้ตั้งไว้ (เก็บใน cookie ของเบราว์เซอร์) — ต้องเรียกภายใน <Suspense>
export async function getCourseLabelMode(): Promise<CourseLabelMode> {
  const v = (await cookies()).get(COURSE_LABEL_COOKIE)?.value;
  return isCourseLabelMode(v) ? v : DEFAULT_COURSE_LABEL;
}
