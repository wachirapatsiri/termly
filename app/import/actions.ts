"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toDueAt } from "@/lib/dates";
import { courseKey, matchCourse } from "@/lib/ai/normalize";
import { categoryKey } from "@/lib/categories";
import { EXAM_TYPES, type ExamType } from "@/lib/exams";

// รายการที่ผู้ใช้ติ๊กเลือกจากหน้า /import
// course: วิชาที่มีอยู่ (id) | วิชาใหม่ที่จะสร้าง (code/name) | null = ไม่ระบุวิชา
// type: สอบ → บันทึกลง events (kind exam) | งาน → บันทึกลง tasks พร้อมชื่อประเภท (ไม่มีในระบบ = สร้างใหม่)
export type ImportItem = {
  title: string;
  due_date: string | null; // งาน = วันส่ง, สอบ = วันสอบ
  due_time: string | null; // งาน = เวลาส่ง, สอบ = เวลาเริ่ม
  note: string | null;
  course: { id: string } | { code: string | null; name: string } | null;
  type:
    | { exam: ExamType; end_time: string | null; location: string | null }
    | { category: string | null };
};

export type ImportResult =
  | {
      ok: true;
      tasks: number;
      exams: number;
      coursesCreated: number;
      categoriesCreated: number;
    }
  | { ok: false; error: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function text(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
}

function time(v: unknown): string | null {
  const t = text(v, 5);
  return t && TIME_RE.test(t) ? t : null;
}

type CourseRef = { id: string } | { key: string } | null;

export async function saveImportedItems(items: ImportItem[]): Promise<ImportResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบก่อน" };
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "ยังไม่ได้เลือกรายการ" };
  }
  if (items.length > 100) return { ok: false, error: "บันทึกได้ครั้งละไม่เกิน 100 รายการ" };

  const supabase = await createClient();
  const [coursesRes, categoriesRes] = await Promise.all([
    supabase.from("courses").select("id, name, code"),
    supabase.from("task_categories").select("id, name"),
  ]);
  if (coursesRes.error || categoriesRes.error) {
    console.error("saveImportedItems: load", coursesRes.error ?? categoriesRes.error);
    return { ok: false, error: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
  const courses = coursesRes.data ?? [];
  const ownIds = new Set(courses.map((c) => c.id));
  const categoryIds = new Map(
    (categoriesRes.data ?? []).map((c) => [categoryKey(c.name), c.id] as const),
  );

  // ── 1) ตรวจข้อมูล + รวบรวมวิชา/ประเภทใหม่ (ไม่สร้างซ้ำ) ──
  const newCourses = new Map<string, { code: string | null; name: string }>();
  const newCategories = new Map<string, string>(); // key → ชื่อที่จะสร้าง
  const taskRows: {
    title: string;
    due_at: string | null;
    due_has_time: boolean;
    notes: string | null;
    courseRef: CourseRef;
    categoryKey: string | null;
  }[] = [];
  const examRows: {
    title: string;
    exam_type: ExamType;
    starts_at: string | null;
    ends_at: string | null;
    has_time: boolean;
    location: string | null;
    notes: string | null;
    courseRef: CourseRef;
  }[] = [];

  for (const item of items) {
    const title = text(item?.title, 300);
    if (!title) return { ok: false, error: "มีรายการที่ไม่มีชื่อ" };

    // ── วิชา ──
    let courseRef: CourseRef = null;
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

    const date = text(item.due_date, 10);
    const start = time(item.due_time);
    const notes = text(item.note, 2000);
    const type = item.type;

    if (type && "exam" in type) {
      // ── สอบ ──
      if (!EXAM_TYPES.includes(type.exam)) return { ok: false, error: "ชนิดสอบไม่ถูกต้อง" };
      let startsAt: string | null = null;
      let endsAt: string | null = null;
      if (date) {
        // รู้แค่วัน = เก็บ 00:00 ของวันนั้น (has_time = false)
        startsAt = toDueAt(date, start ?? "00:00");
        if (!startsAt) return { ok: false, error: `วันสอบของ "${title}" ไม่ถูกต้อง` };
        const end = time(type.end_time);
        if (start && end && end > start) endsAt = toDueAt(date, end);
      }
      examRows.push({
        title,
        exam_type: type.exam,
        starts_at: startsAt,
        ends_at: endsAt,
        has_time: Boolean(startsAt && start),
        location: text(type.location, 300),
        notes,
        courseRef,
      });
    } else {
      // ── งาน ──
      let dueAt: string | null = null;
      if (date) {
        dueAt = toDueAt(date, start);
        if (!dueAt) return { ok: false, error: `วันส่งของ "${title}" ไม่ถูกต้อง` };
      }
      const catName = type && "category" in type ? text(type.category, 30) : null;
      const catKey = catName ? categoryKey(catName) : null;
      if (catName && catKey && !categoryIds.has(catKey) && !newCategories.has(catKey)) {
        newCategories.set(catKey, catName);
      }
      taskRows.push({
        title,
        due_at: dueAt,
        due_has_time: Boolean(dueAt && start),
        notes,
        courseRef,
        categoryKey: catKey,
      });
    }
  }

  // ── 2) สร้างวิชาใหม่ + ประเภทใหม่ ──
  const keyToCourseId = new Map<string, string>();
  if (newCourses.size) {
    const entries = [...newCourses.values()];
    const { data, error } = await supabase
      .from("courses")
      .insert(entries)
      .select("id, name, code");
    if (error || !data || data.length !== entries.length) {
      console.error("saveImportedItems: insert courses", error);
      return { ok: false, error: "สร้างวิชาไม่สำเร็จ ลองใหม่อีกครั้ง" };
    }
    // จับคู่กลับด้วยรหัส/ชื่อ (ไม่พึ่งลำดับที่ฐานข้อมูลคืนมา)
    for (const row of data) keyToCourseId.set(courseKey(row.code ?? row.name), row.id);
  }

  if (newCategories.size) {
    const { data, error } = await supabase
      .from("task_categories")
      .insert([...newCategories.values()].map((name) => ({ name })))
      .select("id, name");
    if (error || !data) {
      console.error("saveImportedItems: insert categories", error);
      return { ok: false, error: "สร้างประเภทงานไม่สำเร็จ ลองใหม่อีกครั้ง" };
    }
    for (const row of data) categoryIds.set(categoryKey(row.name), row.id);
  }

  const courseId = (ref: CourseRef) =>
    !ref ? null : "id" in ref ? ref.id : (keyToCourseId.get(ref.key) ?? null);

  // ── 3) บันทึกงาน + สอบ (user_id ฐานข้อมูลเติมให้เอง) ──
  const createdSomething = newCourses.size > 0 || newCategories.size > 0;
  if (taskRows.length) {
    const { error } = await supabase.from("tasks").insert(
      taskRows.map(({ courseRef, categoryKey: k, ...r }) => ({
        ...r,
        source: "ai",
        course_id: courseId(courseRef),
        category_id: k ? (categoryIds.get(k) ?? null) : null,
      })),
    );
    if (error) {
      console.error("saveImportedItems: insert tasks", error);
      return {
        ok: false,
        error: createdSomething
          ? "สร้างวิชา/ประเภทแล้ว แต่บันทึกงานไม่สำเร็จ ลองกดบันทึกอีกครั้ง"
          : "บันทึกงานไม่สำเร็จ ลองใหม่อีกครั้ง",
      };
    }
  }

  if (examRows.length) {
    const { error } = await supabase.from("events").insert(
      examRows.map(({ courseRef, ...r }) => ({
        ...r,
        kind: "exam",
        course_id: courseId(courseRef),
      })),
    );
    if (error) {
      console.error("saveImportedItems: insert events", error);
      return {
        ok: false,
        error: taskRows.length
          ? `บันทึกงาน ${taskRows.length} รายการแล้ว แต่บันทึกตารางสอบไม่สำเร็จ — เอาติ๊กงานออกแล้วกดบันทึกสอบอีกครั้ง`
          : "บันทึกตารางสอบไม่สำเร็จ ลองใหม่อีกครั้ง",
      };
    }
  }

  refresh();
  return {
    ok: true,
    tasks: taskRows.length,
    exams: examRows.length,
    coursesCreated: newCourses.size,
    categoriesCreated: newCategories.size,
  };
}
