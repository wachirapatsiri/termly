"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { findSimilarCourse } from "@/lib/duplicates";

// ค่าที่ส่งกลับให้ฟอร์ม: error ภาษาไทย + ค่าที่กรอกไว้ (จะได้ไม่ต้องพิมพ์ใหม่)
// similar = มีวิชาที่น่าจะซ้ำอยู่แล้ว → ฟอร์มถามผู้ใช้ก่อน (ส่ง intent กลับมาอีกรอบ)
export type CourseFormState = {
  ok?: boolean;
  error?: string;
  values?: Record<string, string>;
  similar?: { id: string; name: string; code: string | null };
};

// วิชาของผู้ใช้ที่น่าจะซ้ำกับค่าที่กรอก (ไม่นับวิชาที่กำลังแก้)
async function similarCourse(input: { id?: string; name: string; code: string | null }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("courses").select("id, name, code");
  if (error) {
    console.error("similarCourse", error);
    return undefined; // เช็กไม่ได้ก็ไม่ขวาง ให้บันทึกต่อ
  }
  return findSimilarCourse(input, data ?? []);
}

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
  const user = await requireUser();
  const parsed = parseCourseForm(formData);
  if (!parsed.data) return { error: parsed.error, values: parsed.values };
  // intent: "" = เช็กซ้ำก่อน, "add_anyway" = เพิ่มเลย, "replace:<id>" = แก้วิชาเดิมเป็นค่านี้แทน
  const intent = str(formData, "intent");

  const supabase = await createClient();
  if (intent.startsWith("replace:")) {
    const id = intent.slice("replace:".length);
    if (!UUID_RE.test(id)) return { error: "ไม่พบวิชานี้", values: parsed.values };
    const { data, error } = await supabase
      .from("courses")
      .update(parsed.data)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id");
    if (error || !data?.length) {
      if (error) console.error("createCourse replace", error);
      return { error: "แก้วิชาเดิมไม่สำเร็จ ลองใหม่อีกครั้ง", values: parsed.values };
    }
    refresh();
    return { ok: true };
  }
  if (intent !== "add_anyway") {
    const similar = await similarCourse(parsed.data);
    if (similar) return { similar, values: parsed.values };
  }

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
  if (str(formData, "intent") !== "add_anyway") {
    const similar = await similarCourse({ id, ...parsed.data });
    if (similar) return { similar, values: parsed.values };
  }

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

// ลบวิชา: สอบของวิชานี้ถูกลบด้วยเสมอ (ผู้ใช้ตัดสินใจ 8 พ.ย. — สอบไม่มีความหมายถ้าไม่มีวิชา)
// งาน: ถ้า delete_tasks = "true" ลบด้วย ไม่งั้นงานยังอยู่ แค่ course_id กลายเป็น null (ตั้งไว้ใน migration)
export async function deleteCourse(formData: FormData) {
  const user = await requireUser();
  const id = str(formData, "id");
  if (!UUID_RE.test(id)) return;
  const deleteTasks = str(formData, "delete_tasks") === "true";

  const supabase = await createClient();
  // ลบสอบก่อน — ถ้าลบไม่สำเร็จจะไม่ลบวิชา (สอบจะได้ไม่ค้างแบบไม่มีวิชา)
  const { error: examsError } = await supabase
    .from("events")
    .delete()
    .eq("course_id", id)
    .eq("kind", "exam")
    .eq("user_id", user.id);
  if (examsError) {
    console.error("deleteCourse exams", examsError);
    refresh();
    return;
  }
  if (deleteTasks) {
    // ลบงานก่อน — ถ้าลบงานไม่สำเร็จจะไม่ลบวิชา (งานจะได้ไม่หลุดจากวิชาโดยไม่ตั้งใจ)
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("course_id", id)
      .eq("user_id", user.id);
    if (error) {
      console.error("deleteCourse tasks", error);
      refresh();
      return;
    }
  }
  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) console.error("deleteCourse", error);
  refresh();
}

// ติ๊ก/เลิกติ๊ก "วิชานี้ไม่มีสอบกลางภาค / ปลายภาค" (คอลัมน์จาก migration 0003)
// คืนข้อความ error ให้การ์ดแสดง (ไม่เงียบ) — ถ้ายังไม่ได้รัน migration 0003 จะบอกให้รัน
export async function setCourseNoExam(
  id: string,
  type: "midterm" | "final",
  value: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  if (typeof id !== "string" || !UUID_RE.test(id) || (type !== "midterm" && type !== "final")) {
    return { ok: false, error: "ไม่พบวิชานี้" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .update(type === "midterm" ? { no_midterm: value === true } : { no_final: value === true })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("setCourseNoExam", error);
    // PGRST204 / 42703 = ไม่มีคอลัมน์นี้ในฐานข้อมูล
    const missingColumn = error && (error.code === "PGRST204" || error.code === "42703");
    return {
      ok: false,
      error: missingColumn
        ? "ฐานข้อมูลยังไม่มีช่อง \"ไม่มีสอบ\" — รัน migration 0003 ใน Supabase ก่อน"
        : "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง",
    };
  }
  refresh();
  return { ok: true };
}
