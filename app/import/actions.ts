"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toDueAt } from "@/lib/dates";
import { courseKey, matchCourse } from "@/lib/ai/normalize";

// งานที่ผู้ใช้ติ๊กเลือกจากหน้า /import
// course: วิชาที่มีอยู่ (id) | วิชาใหม่ที่จะสร้าง (code/name) | null = ไม่ระบุวิชา
export type ImportItem = {
  title: string;
  due_date: string | null;
  due_time: string | null;
  note: string | null;
  course: { id: string } | { code: string | null; name: string } | null;
};

export type ImportResult =
  | { ok: true; saved: number; coursesCreated: number }
  | { ok: false; error: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function text(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
}

export async function saveImportedTasks(items: ImportItem[]): Promise<ImportResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบก่อน" };
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "ยังไม่ได้เลือกงาน" };
  }
  if (items.length > 100) return { ok: false, error: "บันทึกได้ครั้งละไม่เกิน 100 งาน" };

  const supabase = await createClient();
  const { data: existing, error: coursesErr } = await supabase
    .from("courses")
    .select("id, name, code");
  if (coursesErr) {
    console.error("saveImportedTasks: courses", coursesErr);
    return { ok: false, error: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
  const courses = existing ?? [];
  const ownIds = new Set(courses.map((c) => c.id));

  // ── 1) ตรวจข้อมูล + รวบรวมวิชาใหม่ (ไม่สร้างซ้ำ) ──
  const newCourses = new Map<string, { code: string | null; name: string }>();
  const rows: {
    title: string;
    due_at: string | null;
    due_has_time: boolean;
    notes: string | null;
    courseRef: { id: string } | { key: string } | null;
  }[] = [];

  for (const item of items) {
    const title = text(item?.title, 300);
    if (!title) return { ok: false, error: "มีงานที่ไม่มีชื่อ" };

    const date = text(item.due_date, 10);
    const time = text(item.due_time, 5);
    let dueAt: string | null = null;
    if (date) {
      dueAt = toDueAt(date, time && TIME_RE.test(time) ? time : null);
      if (!dueAt) return { ok: false, error: `วันส่งของ "${title}" ไม่ถูกต้อง` };
    }

    let courseRef: { id: string } | { key: string } | null = null;
    const c = item.course;
    if (c && "id" in c) {
      // ต้องเป็นวิชาของผู้ใช้เอง (ฐานข้อมูลก็กันซ้ำอีกชั้นด้วย foreign key)
      if (!UUID_RE.test(c.id) || !ownIds.has(c.id)) {
        return { ok: false, error: "ไม่พบวิชาที่เลือก" };
      }
      courseRef = { id: c.id };
    } else if (c && "name" in c) {
      const code = text(c.code, 50);
      const name = text(c.name, 200) ?? code;
      if (!name) return { ok: false, error: "วิชาใหม่ต้องมีชื่อ" };
      const matched = matchCourse(code, name, courses); // มีอยู่แล้ว ใช้ของเดิม
      if (matched) courseRef = { id: matched };
      else {
        const key = courseKey(code ?? name);
        if (!newCourses.has(key)) newCourses.set(key, { code, name });
        courseRef = { key };
      }
    }

    rows.push({
      title,
      due_at: dueAt,
      due_has_time: Boolean(dueAt && time && TIME_RE.test(time)),
      notes: text(item.note, 2000),
      courseRef,
    });
  }

  // ── 2) สร้างวิชาใหม่ ──
  const keyToId = new Map<string, string>();
  if (newCourses.size) {
    const entries = [...newCourses.entries()];
    const { data, error } = await supabase
      .from("courses")
      .insert(entries.map(([, v]) => v))
      .select("id, name, code");
    if (error || !data || data.length !== entries.length) {
      console.error("saveImportedTasks: insert courses", error);
      return { ok: false, error: "สร้างวิชาไม่สำเร็จ ลองใหม่อีกครั้ง" };
    }
    // จับคู่กลับด้วยรหัส/ชื่อ (ไม่พึ่งลำดับที่ฐานข้อมูลคืนมา)
    for (const row of data) {
      keyToId.set(courseKey(row.code ?? row.name), row.id);
    }
  }

  // ── 3) บันทึกงาน (user_id ฐานข้อมูลเติมให้เอง) ──
  const { error: insertErr } = await supabase.from("tasks").insert(
    rows.map(({ courseRef, ...r }) => ({
      ...r,
      source: "ai",
      course_id: !courseRef
        ? null
        : "id" in courseRef
          ? courseRef.id
          : (keyToId.get(courseRef.key) ?? null),
    })),
  );
  if (insertErr) {
    console.error("saveImportedTasks: insert tasks", insertErr);
    return {
      ok: false,
      error: newCourses.size
        ? "สร้างวิชาแล้ว แต่บันทึกงานไม่สำเร็จ ลองกดบันทึกอีกครั้ง"
        : "บันทึกงานไม่สำเร็จ ลองใหม่อีกครั้ง",
    };
  }

  refresh();
  return { ok: true, saved: rows.length, coursesCreated: newCourses.size };
}
