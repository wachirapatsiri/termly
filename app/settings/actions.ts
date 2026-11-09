"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MAX_CATEGORY_LENGTH } from "@/lib/categories";
import { COURSE_LABEL_COOKIE, isCourseLabelMode } from "@/lib/course-label";
import { YEAR_MODE_COOKIE, isYearMode } from "@/lib/year-mode";
import { getUserSettings, type UserSettings } from "@/lib/preferences";

const PREF_COOKIE = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365, // จำไว้ 1 ปี
  sameSite: "lax",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
} as const;

// บันทึกการตั้งค่าลงตาราง user_settings (จำข้ามเครื่อง) + cookie สำรอง
// (ถ้ายังไม่ได้รัน migration 0004 หรือบันทึกไม่ผ่าน ก็ยังใช้ cookie ในเครื่องนี้ได้)
async function saveSettings(patch: Partial<UserSettings>) {
  // อ่านค่าปัจจุบันก่อน: ครั้งแรกที่สร้างแถว จะได้ไม่ทับค่าอีกช่องที่เคยตั้งไว้ใน cookie
  const next = { ...(await getUserSettings()), ...patch };
  const jar = await cookies();
  jar.set(COURSE_LABEL_COOKIE, next.courseLabel, PREF_COOKIE);
  jar.set(YEAR_MODE_COOKIE, next.yearMode, PREF_COOKIE);

  const user = await getCurrentUser();
  if (!user) return;
  const supabase = await createClient();
  // user_id ฐานข้อมูลเติมให้ (auth.uid()); มีแถวอยู่แล้ว = แก้แถวเดิม
  const { error } = await supabase.from("user_settings").upsert(
    {
      course_label: next.courseLabel,
      year_mode: next.yearMode,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) console.error("save user_settings", error);
}

export async function setCourseLabelMode(formData: FormData) {
  const mode = formData.get("mode");
  if (!isCourseLabelMode(mode)) return;
  await saveSettings({ courseLabel: mode });
}

export async function setYearMode(formData: FormData) {
  const mode = formData.get("mode");
  if (!isYearMode(mode)) return;
  await saveSettings({ yearMode: mode });
}

// ─── จัดการประเภทงาน (ตาราง task_categories) ───

export type CategoryResult = { ok: true } | { ok: false; error: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cleanName(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

function checkName(name: string): string | null {
  if (!name) return "กรุณาใส่ชื่อประเภท";
  if (name.length > MAX_CATEGORY_LENGTH) return `ชื่อประเภทยาวเกิน ${MAX_CATEGORY_LENGTH} ตัวอักษร`;
  return null;
}

// 23505 = ชื่อซ้ำ (unique index ไม่สนตัวพิมพ์ใน migration 0002)
function saveError(error: { code?: string }, fallback: string): CategoryResult {
  if (error.code === "23505") return { ok: false, error: "มีประเภทชื่อนี้อยู่แล้ว" };
  return { ok: false, error: fallback };
}

export async function createCategory(rawName: string): Promise<CategoryResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบก่อน" };
  const name = cleanName(rawName);
  const invalid = checkName(name);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();
  // user_id ฐานข้อมูลเติมให้; position ค่าตั้งต้น 500 = อยู่ก่อน "อื่น ๆ"
  const { error } = await supabase.from("task_categories").insert({ name });
  if (error) {
    console.error("createCategory", error);
    return saveError(error, "เพิ่มประเภทไม่สำเร็จ ลองใหม่อีกครั้ง");
  }
  refresh();
  return { ok: true };
}

export async function renameCategory(id: string, rawName: string): Promise<CategoryResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบก่อน" };
  if (typeof id !== "string" || !UUID_RE.test(id)) return { ok: false, error: "ไม่พบประเภทนี้" };
  const name = cleanName(rawName);
  const invalid = checkName(name);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_categories")
    .update({ name })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("renameCategory", error);
    return error
      ? saveError(error, "เปลี่ยนชื่อไม่สำเร็จ ลองใหม่อีกครั้ง")
      : { ok: false, error: "ไม่พบประเภทนี้" };
  }
  refresh();
  return { ok: true };
}

// ลบประเภท → งานยังอยู่ แค่ category_id เป็น null (ตั้งไว้ใน migration 0002)
export async function deleteCategory(id: string): Promise<CategoryResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบก่อน" };
  if (typeof id !== "string" || !UUID_RE.test(id)) return { ok: false, error: "ไม่พบประเภทนี้" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("task_categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    console.error("deleteCategory", error);
    return { ok: false, error: "ลบไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
  refresh();
  return { ok: true };
}
