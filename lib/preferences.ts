import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  COURSE_LABEL_COOKIE,
  DEFAULT_COURSE_LABEL,
  isCourseLabelMode,
  type CourseLabelMode,
} from "@/lib/course-label";
import { DEFAULT_YEAR_MODE, YEAR_MODE_COOKIE, isYearMode, type YearMode } from "@/lib/year-mode";
import { DEFAULT_THEME, THEME_COOKIE, isThemeMode, type ThemeMode } from "@/lib/theme";

export type UserSettings = { courseLabel: CourseLabelMode; yearMode: YearMode; theme: ThemeMode };

// อ่านการตั้งค่าของผู้ใช้ — ต้องเรียกภายใน <Suspense>
// ลำดับ: ตาราง user_settings (จำข้ามเครื่อง, migration 0004) → cookie เดิม → ค่าตั้งต้น
// cache(): หลาย component ในหน้าเดียวเรียกซ้ำได้ แต่ query ฐานข้อมูลครั้งเดียวต่อ request
export const getUserSettings = cache(async (): Promise<UserSettings> => {
  const jar = await cookies();
  const cookieLabel = jar.get(COURSE_LABEL_COOKIE)?.value;
  const cookieYear = jar.get(YEAR_MODE_COOKIE)?.value;
  const cookieTheme = jar.get(THEME_COOKIE)?.value;

  // RLS ทำให้ได้เฉพาะแถวของผู้ใช้คนนี้ (ยังไม่ล็อกอิน = ไม่มีแถว)
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_settings")
    // "*": ถ้ายังไม่ได้รัน migration 0005 (ยังไม่มีช่อง theme) ก็ยังอ่านช่องอื่นได้
    .select("*")
    .maybeSingle();
  // error เช่น ยังไม่ได้รัน migration 0004 → ใช้ cookie ไปก่อน หน้ายังใช้ได้
  if (error) console.error("load user_settings", error);

  const label = data?.course_label ?? cookieLabel;
  const year = data?.year_mode ?? cookieYear;
  const theme = data?.theme ?? cookieTheme;
  return {
    courseLabel: isCourseLabelMode(label) ? label : DEFAULT_COURSE_LABEL,
    yearMode: isYearMode(year) ? year : DEFAULT_YEAR_MODE,
    theme: isThemeMode(theme) ? theme : DEFAULT_THEME,
  };
});

export async function getCourseLabelMode(): Promise<CourseLabelMode> {
  return (await getUserSettings()).courseLabel;
}

// แสดงปีเป็น พ.ศ./ค.ศ.
export async function getYearMode(): Promise<YearMode> {
  return (await getUserSettings()).yearMode;
}
