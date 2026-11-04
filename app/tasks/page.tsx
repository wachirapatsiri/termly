import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isPast } from "@/lib/dates";
import type { Course, Task } from "@/lib/types";
import { TaskForm } from "@/components/task-form";
import { TaskItem } from "@/components/task-item";

export default function TasksPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-8 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">งานของฉัน</h1>
        <Link href="/" className="text-sm text-muted">
          หน้าแรก
        </Link>
      </div>

      <Suspense fallback={<div className="h-64 rounded-card border border-line" />}>
        <TasksSection />
      </Suspense>
    </main>
  );
}

async function TasksSection() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  // RLS ทำให้ได้เฉพาะแถวของผู้ใช้คนนี้อยู่แล้ว
  const [tasksRes, coursesRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, course_id, title, due_at, due_has_time, notes, source, done, created_at")
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase.from("courses").select("id, name, code").order("name"),
  ]);

  if (tasksRes.error || coursesRes.error) {
    console.error("load tasks", tasksRes.error ?? coursesRes.error);
    return (
      <p className="rounded-card border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        โหลดรายการงานไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง
      </p>
    );
  }

  const tasks = (tasksRes.data ?? []) as Task[];
  const courses = (coursesRes.data ?? []) as Course[];
  const courseById = new Map(courses.map((c) => [c.id, c]));

  // งานที่ยังไม่มีวันส่งขึ้นก่อน (ต้องไปหาวันส่งมาใส่) แล้วตามด้วยงานเรียงตามวันส่ง
  const pending = tasks.filter((t) => !t.done);
  const ordered = [
    ...pending.filter((t) => !t.due_at),
    ...pending.filter((t) => t.due_at),
  ];
  const done = tasks.filter((t) => t.done);

  const renderItem = (t: Task) => (
    <TaskItem
      key={t.id}
      task={t}
      course={t.course_id ? courseById.get(t.course_id) : undefined}
      courses={courses}
      overdue={!t.done && !!t.due_at && isPast(t.due_at)}
    />
  );

  return (
    <div className="space-y-8">
      <section className="space-y-3 rounded-card border border-line bg-white p-4">
        <h2 className="font-medium">เพิ่มงานใหม่</h2>
        <TaskForm courses={courses} />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">
          ยังไม่เสร็จ <span className="text-muted">({ordered.length})</span>
        </h2>
        {ordered.length === 0 ? (
          <p className="text-sm text-muted">ยังไม่มีงานค้าง 🎉</p>
        ) : (
          <ul className="space-y-2">{ordered.map(renderItem)}</ul>
        )}
      </section>

      {done.length > 0 && (
        <details className="space-y-3">
          <summary className="cursor-pointer font-medium">
            เสร็จแล้ว <span className="text-muted">({done.length})</span>
          </summary>
          <ul className="mt-3 space-y-2">{done.map(renderItem)}</ul>
        </details>
      )}
    </div>
  );
}
