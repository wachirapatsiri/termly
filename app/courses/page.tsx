import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Course } from "@/lib/types";
import { AppNav } from "@/components/app-nav";
import { CourseForm } from "@/components/course-form";
import { CourseItem } from "@/components/course-item";

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
    supabase.from("tasks").select("course_id").eq("done", false),
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
  // นับงานค้างของแต่ละวิชา
  const pendingByCourse = new Map<string, number>();
  for (const t of tasksRes.data ?? []) {
    if (t.course_id) {
      pendingByCourse.set(t.course_id, (pendingByCourse.get(t.course_id) ?? 0) + 1);
    }
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
                pendingCount={pendingByCourse.get(c.id) ?? 0}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
