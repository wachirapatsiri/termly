"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toDueAt } from "@/lib/dates";
import { NEW_CATEGORY, resolveCategory } from "@/lib/categories";

// ค่าที่ส่งกลับให้ฟอร์ม: error ภาษาไทย + ค่าที่กรอกไว้ (จะได้ไม่ต้องพิมพ์ใหม่)
export type TaskFormState = {
  ok?: boolean;
  error?: string;
  values?: Record<string, string>;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

// ตรวจค่าจากฟอร์ม → คืนข้อมูลพร้อมบันทึก หรือข้อความ error
function parseTaskForm(formData: FormData) {
  const title = str(formData, "title");
  const date = str(formData, "due_date");
  const time = str(formData, "due_time");
  const notes = str(formData, "notes");
  const courseId = str(formData, "course_id");
  const category = str(formData, "category");
  const newCategory = str(formData, "new_category").replace(/\s+/g, " ");
  const values = {
    title,
    due_date: date,
    due_time: time,
    notes,
    course_id: courseId,
    category,
    new_category: newCategory,
  };

  if (!title) return { error: "กรุณาใส่ชื่องาน", values };
  if (title.length > 300) return { error: "ชื่องานยาวเกิน 300 ตัวอักษร", values };
  if (notes.length > 2000) return { error: "หมายเหตุยาวเกิน 2,000 ตัวอักษร", values };
  if (time && !date) return { error: "ใส่เวลาแล้ว กรุณาเลือกวันส่งด้วย", values };
  if (courseId && !UUID_RE.test(courseId)) return { error: "วิชาไม่ถูกต้อง", values };
  if (category && category !== NEW_CATEGORY && !UUID_RE.test(category)) {
    return { error: "ประเภทงานไม่ถูกต้อง", values };
  }
  if (category === NEW_CATEGORY && !newCategory) {
    return { error: "พิมพ์ชื่อประเภทใหม่ หรือเลือกประเภทที่มีอยู่", values };
  }
  if (newCategory.length > 30) return { error: "ชื่อประเภทยาวเกิน 30 ตัวอักษร", values };

  let dueAt: string | null = null;
  if (date) {
    dueAt = toDueAt(date, time);
    if (!dueAt) return { error: "วันหรือเวลาส่งไม่ถูกต้อง", values };
  }

  return {
    data: {
      title,
      due_at: dueAt,
      due_has_time: Boolean(date && time),
      notes: notes || null,
      course_id: courseId || null,
    },
    // ประเภท: id ที่มีอยู่ | { name } = สร้างใหม่ (ถ้ายังไม่มีชื่อนี้) | null
    category:
      category === NEW_CATEGORY ? { name: newCategory } : category ? { id: category } : null,
    values,
  };
}

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
  return user;
}

export async function createTask(
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  await requireUser();
  const parsed = parseTaskForm(formData);
  if (!parsed.data) return { error: parsed.error, values: parsed.values };

  const supabase = await createClient();
  const cat = await resolveCategory(supabase, parsed.category);
  if (!cat.ok) return { error: cat.error, values: parsed.values };
  // user_id ไม่ต้องส่ง — ฐานข้อมูลเติม auth.uid() ให้ และ RLS ตรวจซ้ำอีกชั้น
  const { error } = await supabase
    .from("tasks")
    .insert({ ...parsed.data, category_id: cat.id, source: "manual" });
  if (error) {
    console.error("createTask", error);
    return { error: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง", values: parsed.values };
  }

  refresh();
  return { ok: true };
}

export async function updateTask(
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const user = await requireUser();
  const id = str(formData, "id");
  const parsed = parseTaskForm(formData);
  if (!UUID_RE.test(id)) return { error: "ไม่พบงานนี้", values: parsed.values };
  if (!parsed.data) return { error: parsed.error, values: parsed.values };

  const supabase = await createClient();
  const cat = await resolveCategory(supabase, parsed.category);
  if (!cat.ok) return { error: cat.error, values: parsed.values };
  const { data, error } = await supabase
    .from("tasks")
    .update({ ...parsed.data, category_id: cat.id })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("updateTask", error);
    return { error: "แก้ไขไม่สำเร็จ ลองใหม่อีกครั้ง", values: parsed.values };
  }

  refresh();
  return { ok: true };
}

export async function setTaskDone(formData: FormData) {
  const user = await requireUser();
  const id = str(formData, "id");
  if (!UUID_RE.test(id)) return;
  const done = str(formData, "done") === "true";

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ done })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) console.error("setTaskDone", error);
  refresh();
}

export async function deleteTask(formData: FormData) {
  const user = await requireUser();
  const id = str(formData, "id");
  if (!UUID_RE.test(id)) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) console.error("deleteTask", error);
  refresh();
}

// ─── จัดการหลายงานพร้อมกัน (โหมดเลือกหลายรายการ) ───

function cleanIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  return ids
    .filter((id): id is string => typeof id === "string" && UUID_RE.test(id))
    .slice(0, 500);
}

export async function setTasksDone(ids: string[], done: boolean) {
  const user = await requireUser();
  const valid = cleanIds(ids);
  if (!valid.length) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ done: done === true })
    .in("id", valid)
    .eq("user_id", user.id);
  if (error) console.error("setTasksDone", error);
  refresh();
}

export async function deleteTasks(ids: string[]) {
  const user = await requireUser();
  const valid = cleanIds(ids);
  if (!valid.length) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .in("id", valid)
    .eq("user_id", user.id);
  if (error) console.error("deleteTasks", error);
  refresh();
}
