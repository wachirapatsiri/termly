"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// ค่าที่ส่งกลับให้ฟอร์ม: error ภาษาไทย + ค่าที่กรอกไว้ (จะได้ไม่ต้องพิมพ์ใหม่)
export type CourseFormState = {
  ok?: boolean;
  error?: string;
  values?: Record<string, string>;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  // รวมช่องว่างที่ติดกันหลายตัวให้เหลือตัวเดียว
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
}

function parseCourseForm(formData: FormData) {
  const name = str(formData, "name");
  const code = str(formData, "code");
  const values = { name, code };

  if (!name) return { error: "กรุณาใส่ชื่อวิชา", values };
  if (name.length > 200) return { error: "ชื่อวิชายาวเกิน 200 ตัวอักษร", values };
  if (code.length > 50) return { error: "รหัสวิชายาวเกิน 50 ตัวอักษร", values };

  return { data: { name, code: code || null }, values };
}

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
  return user;
}

export async function createCourse(
  _prev: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  await requireUser();
  const parsed = parseCourseForm(formData);
  if (!parsed.data) return { error: parsed.error, values: parsed.values };

  const supabase = await createClient();
  // user_id ไม่ต้องส่ง — ฐานข้อมูลเติม auth.uid() ให้ และ RLS ตรวจซ้ำอีกชั้น
  const { error } = await supabase.from("courses").insert(parsed.data);
  if (error) {
    console.error("createCourse", error);
    return { error: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง", values: parsed.values };
  }

  refresh();
  return { ok: true };
}

export async function updateCourse(
  _prev: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const user = await requireUser();
  const id = str(formData, "id");
  const parsed = parseCourseForm(formData);
  if (!UUID_RE.test(id)) return { error: "ไม่พบวิชานี้", values: parsed.values };
  if (!parsed.data) return { error: parsed.error, values: parsed.values };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("updateCourse", error);
    return { error: "แก้ไขไม่สำเร็จ ลองใหม่อีกครั้ง", values: parsed.values };
  }

  refresh();
  return { ok: true };
}

// ลบวิชา → งานในวิชานี้ยังอยู่ แค่ course_id กลายเป็น null (ตั้งไว้ใน migration)
export async function deleteCourse(formData: FormData) {
  const user = await requireUser();
  const id = str(formData, "id");
  if (!UUID_RE.test(id)) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) console.error("deleteCourse", error);
  refresh();
}
