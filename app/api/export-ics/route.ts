// GET /api/export-ics → ดาวน์โหลดไฟล์ปฏิทิน termly-YYYY-MM-DD.ics
//   ?pending=1&done=0&exams=1&course=<id>&course=none  (ไม่ใส่ = งานค้าง + สอบ ทุกวิชา)
// ต้องล็อกอิน; RLS ทำให้ได้เฉพาะข้อมูลของผู้ใช้คนนี้
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourseLabelMode } from "@/lib/preferences";
import { courseLabel } from "@/lib/course-label";
import { examLabel } from "@/lib/exam-display";
import { toBangkokParts } from "@/lib/dates";
import {
  buildIcs,
  courseSelected,
  examToIcs,
  parseIcsOptions,
  taskToIcs,
  type IcsItem,
} from "@/lib/ics";
import type { CalendarEvent, Course, Task, TaskCategory } from "@/lib/types";

function fail(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return fail("กรุณาเข้าสู่ระบบก่อน", 401);

  const opts = parseIcsOptions(request.nextUrl.searchParams);
  const wantTasks = opts.pending || opts.done;

  const supabase = await createClient();
  const [tasksRes, coursesRes, categoriesRes, examsRes, labelMode] = await Promise.all([
    wantTasks
      ? supabase
          .from("tasks")
          .select("id, course_id, category_id, title, due_at, due_has_time, notes, done")
          .not("due_at", "is", null)
          .order("due_at")
      : null,
    supabase.from("courses").select("id, name, code"),
    supabase.from("task_categories").select("id, name"),
    opts.exams
      ? supabase
          .from("events")
          .select("id, course_id, title, exam_type, starts_at, ends_at, has_time, location, notes")
          .eq("kind", "exam")
          .not("starts_at", "is", null)
          .order("starts_at")
      : null,
    getCourseLabelMode(),
  ]);

  if (tasksRes?.error || coursesRes.error || examsRes?.error) {
    console.error("export ics", tasksRes?.error ?? coursesRes.error ?? examsRes?.error);
    return fail("โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง", 500);
  }
  if (categoriesRes.error) console.error("export ics categories", categoriesRes.error);

  const courseById = new Map(((coursesRes.data ?? []) as Course[]).map((c) => [c.id, c]));
  const categoryById = new Map(
    ((categoriesRes.data ?? []) as TaskCategory[]).map((c) => [c.id, c.name]),
  );

  const items: IcsItem[] = [];
  for (const t of (tasksRes?.data ?? []) as Task[]) {
    if (t.done ? !opts.done : !opts.pending) continue;
    if (!courseSelected(t.course_id, opts.courses)) continue;
    const course = t.course_id ? courseById.get(t.course_id) : undefined;
    const item = taskToIcs(t, {
      courseLabel: course ? courseLabel(course, labelMode) : null,
      courseName: course?.name,
      category: t.category_id ? categoryById.get(t.category_id) : null,
    });
    if (item) items.push(item);
  }
  for (const e of (examsRes?.data ?? []) as CalendarEvent[]) {
    if (!courseSelected(e.course_id, opts.courses)) continue;
    const course = e.course_id ? courseById.get(e.course_id) : undefined;
    const item = examToIcs(e, {
      label: examLabel(e, course, labelMode),
      courseName: course ? [course.code, course.name].filter(Boolean).join(" ") : null,
    });
    if (item) items.push(item);
  }
  items.sort((a, b) => a.start.localeCompare(b.start));

  const now = new Date();
  const filename = `termly-${toBangkokParts(now.toISOString()).date}.ics`;
  return new Response(buildIcs(items, now), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
