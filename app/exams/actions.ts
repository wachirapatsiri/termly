"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toBangkokParts } from "@/lib/dates";
import { findDuplicate } from "@/lib/duplicates";
import { EXAM_TYPE_LABEL, buildExamTimes, isExamType } from "@/lib/exams";

// ค่าที่ส่งกลับให้ฟอร์ม: error ภาษาไทย + ค่าที่กรอกไว้ (จะได้ไม่ต้องพิมพ์ใหม่)
// duplicate = ชื่อสอบที่มีอยู่แล้วและน่าจะซ้ำ → ฟอร์มถามก่อนเพิ่ม
export type ExamFormState = {
  ok?: boolean;
  error?: string;
  values?: Record<string, string>;
  duplicate?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
  return user;
}

// ตรวจค่าจากฟอร์ม → ข้อมูลพร้อมบันทึก หรือข้อความ error
async function parseExamForm(formData: FormData) {
  const values = {
    exam_type: str(formData, "exam_type"),
    course_id: str(formData, "course_id"),
    title: str(formData, "title").replace(/\s+/g, " "),
    date: str(formData, "date"),
    start_time: str(formData, "start_time"),
    end_time: str(formData, "end_time"),
    location: str(formData, "location").replace(/\s+/g, " "),
    notes: str(formData, "notes"),
  };

  if (!isExamType(values.exam_type)) return { error: "กรุณาเลือกชนิดสอบ", values };
  if (values.course_id && !UUID_RE.test(values.course_id)) {
    return { error: "วิชาไม่ถูกต้อง", values };
  }
  if (values.title.length > 300) return { error: "ชื่อยาวเกิน 300 ตัวอักษร", values };
  if (values.location.length > 300) return { error: "สถานที่ยาวเกิน 300 ตัวอักษร", values };
  if (values.notes.length > 2000) return { error: "หมายเหตุยาวเกิน 2,000 ตัวอักษร", values };

  const times = buildExamTimes(
    values.date || null,
    values.start_time || null,
    values.end_time || null,
  );
  if (!times.ok) return { error: times.error, values };

  // ไม่ใส่ชื่อ → ตั้งให้จากชนิดสอบ + รหัสวิชา เช่น "สอบกลางภาค 204383"
  let title = values.title;
  if (!title) {
    title = EXAM_TYPE_LABEL[values.exam_type];
    if (values.course_id) {
      const supabase = await createClient();
      const { data } = await supabase
        .from("courses")
        .select("name, code")
        .eq("id", values.course_id)
        .maybeSingle();
      if (data) title += ` ${data.code ?? data.name}`;
    }
  }

  return {
    data: {
      kind: "exam" as const,
      exam_type: values.exam_type,
      course_id: values.course_id || null,
      title: title.slice(0, 300),
      starts_at: times.starts_at,
      ends_at: times.ends_at,
      has_time: times.has_time,
      location: values.location || null,
      notes: values.notes || null,
    },
    values,
  };
}

export async function createExam(
  _prev: ExamFormState,
  formData: FormData,
): Promise<ExamFormState> {
  await requireUser();
  const parsed = await parseExamForm(formData);
  if (!parsed.data) return { error: parsed.error, values: parsed.values };

  const supabase = await createClient();
  // เช็กสอบซ้ำก่อน (เช่น กลางภาควิชาเดียวกันมีอยู่แล้ว) — ผู้ใช้กด "เพิ่มต่อ" = intent add_anyway
  if (str(formData, "intent") !== "add_anyway") {
    const { data: existing } = await supabase
      .from("events")
      .select("title, starts_at, course_id, exam_type")
      .eq("kind", "exam");
    const dup = findDuplicate(
      {
        kind: "exam",
        title: parsed.data.title,
        date: parsed.values.date || null,
        course_id: parsed.data.course_id,
        exam_type: parsed.data.exam_type,
      },
      (existing ?? []).map((e) => ({
        kind: "exam" as const,
        title: e.title,
        date: e.starts_at ? toBangkokParts(e.starts_at).date : null,
        course_id: e.course_id,
        exam_type: isExamType(e.exam_type) ? e.exam_type : null,
      })),
    );
    if (dup) return { duplicate: dup.title, values: parsed.values };
  }

  // user_id ไม่ต้องส่ง — ฐานข้อมูลเติม auth.uid() ให้ และ RLS ตรวจซ้ำอีกชั้น
  const { error } = await supabase.from("events").insert(parsed.data);
  if (error) {
    console.error("createExam", error);
    return { error: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง", values: parsed.values };
  }

  refresh();
  return { ok: true };
}

export async function updateExam(
  _prev: ExamFormState,
  formData: FormData,
): Promise<ExamFormState> {
  const user = await requireUser();
  const id = str(formData, "id");
  const parsed = await parseExamForm(formData);
  if (!UUID_RE.test(id)) return { error: "ไม่พบสอบนี้", values: parsed.values };
  if (!parsed.data) return { error: parsed.error, values: parsed.values };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("kind", "exam")
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("updateExam", error);
    return { error: "แก้ไขไม่สำเร็จ ลองใหม่อีกครั้ง", values: parsed.values };
  }

  refresh();
  return { ok: true };
}

export async function deleteExam(formData: FormData) {
  const user = await requireUser();
  const id = str(formData, "id");
  if (!UUID_RE.test(id)) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("kind", "exam");
  if (error) console.error("deleteExam", error);
  refresh();
}
