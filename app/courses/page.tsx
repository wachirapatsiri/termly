import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dueGroup } from "@/lib/dates";
import type { Course, Task } from "@/lib/types";
import { AppNav } from "@/components/app-nav";
import { CourseForm } from "@/components/course-form";
import { CourseItem, type CourseTask } from "@/components/course-item";

export default function CoursesPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-8 px-6 py-6">
      <AppNav current="/courses" />
      <h1 className="text-2xl font-semibold tracking-tight">วิชาของฉัน</h1>

      <Suspense fallback={<div className="h-64 rounded-card border border-line" />}>
        <CoursesSection />
      </Suspense>
    </main>
  );
}

async function CoursesSection() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  // RLS ทำให้ได้เฉพาะแถวของผู้ใช้คนนี้อยู่แล้ว
  const [coursesRes, tasksRes] = await Promise.all([
    supabase
      .from("courses")
      .select("id, name, code")
      .order("code", { ascending: true, nullsFirst: false })
      .order("name"),
    supabase
      .from("tasks")
      .select("id, course_id, title, due_at, due_has_time, done")
      .not("course_id", "is", null)
      .order("due_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true }),
  ]);

  if (coursesRes.error || tasksRes.error) {
    console.error("load courses", coursesRes.error ?? tasksRes.error);
    return (
      <p className="rounded-card border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        โหลดรายการวิชาไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง
      </p>
    );
  }

  const courses = (coursesRes.data ?? []) as Course[];
  // แยกงานตามวิชา: งานค้าง (ไว้แสดงในการ์ด) + จำนวนงานทั้งหมด (ไว้ถามตอนลบวิชา)
  // เรียงแล้ว: งานที่ยังไม่มีวันส่งขึ้นก่อน แล้วตามด้วยวันส่งใกล้สุด
  const now = new Date();
  const byCourse = new Map<string, { total: number; pending: CourseTask[] }>();
  for (const t of (tasksRes.data ?? []) as Pick<
    Task,
    "id" | "course_id" | "title" | "due_at" | "due_has_time" | "done"
  >[]) {
    if (!t.course_id) continue;
    const c = byCourse.get(t.course_id) ?? { total: 0, pending: [] };
    c.total++;
    if (!t.done) {
      c.pending.push({
        id: t.id,
        title: t.title,
        due_at: t.due_at,
        due_has_time: t.due_has_time,
        // คำนวณฝั่งเซิร์ฟเวอร์ เพื่อให้ผลตรงกันทั้งสองฝั่ง
        overdue: !!t.due_at && dueGroup(t.due_at, now) === "overdue",
      });
    }
    byCourse.set(t.course_id, c);
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3 rounded-card border border-line bg-white p-4">
        <h2 className="font-medium">เพิ่มวิชาใหม่</h2>
        <CourseForm />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">
          วิชาทั้งหมด <span className="text-muted">({courses.length})</span>
        </h2>
        {courses.length === 0 ? (
          <p className="text-sm text-muted">
            ยังไม่มีวิชา — เพิ่มวิชาที่ลงเรียนเทอมนี้ไว้ก่อน จะได้เลือกตอนเพิ่มงานได้
          </p>
        ) : (
          <ul className="space-y-2">
            {courses.map((c) => (
              <CourseItem
                key={c.id}
                course={c}
                pendingTasks={byCourse.get(c.id)?.pending ?? []}
                totalCount={byCourse.get(c.id)?.total ?? 0}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
