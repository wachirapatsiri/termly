import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourseLabelMode } from "@/lib/preferences";
import { courseLabel, type CourseLabelMode } from "@/lib/course-label";
import { DUE_GROUP_LABEL, dueGroup, type DueGroup } from "@/lib/dates";
import { EXAM_TYPE_LABEL, UPCOMING_EXAM_DAYS, upcomingExams } from "@/lib/exams";
import type { CalendarEvent, Course, Task, TaskCategory } from "@/lib/types";
import { AppNav } from "@/components/app-nav";
import { Countdown } from "@/components/exam-item";
import { TaskForm } from "@/components/task-form";
import { TaskItem } from "@/components/task-item";
import {
  SelectModeButton,
  SelectionSpacer,
  TaskSelectionProvider,
} from "@/components/task-selection";

const GROUP_ORDER: DueGroup[] = ["overdue", "today", "tomorrow", "week", "later"];

export default function TasksPage({ searchParams }: PageProps<"/tasks">) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-8 px-6 py-6">
      <AppNav current="/tasks" />
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">งานของฉัน</h1>
        <Link href="/import" className="text-sm text-accent">
          ✨ นำเข้าจากซิลลาบัส
        </Link>
      </div>

      <Suspense fallback={<div className="h-64 rounded-card border border-line" />}>
        <TasksSection searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function TasksSection({
  searchParams,
}: {
  searchParams: PageProps<"/tasks">["searchParams"];
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  // RLS ทำให้ได้เฉพาะแถวของผู้ใช้คนนี้อยู่แล้ว
  // สอบตั้งแต่เมื่อวาน (กันเรื่องโซนเวลา) แล้วค่อยกรองให้เหลือ 14 วันข้างหน้าด้วย upcomingExams()
  const now = new Date();
  const since = new Date(now.getTime() - 86_400_000).toISOString();
  const [tasksRes, coursesRes, categoriesRes, examsRes, params, labelMode] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, course_id, category_id, title, due_at, due_has_time, notes, source, done, created_at",
      )
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("courses")
      .select("id, name, code")
      .order("code", { ascending: true, nullsFirst: false })
      .order("name"),
    supabase
      .from("task_categories")
      .select("id, name")
      .order("position")
      .order("created_at"),
    supabase
      .from("events")
      .select("id, course_id, title, exam_type, starts_at")
      .eq("kind", "exam")
      .gte("starts_at", since)
      .order("starts_at"),
    searchParams,
    getCourseLabelMode(),
  ]);

  // ประเภท/สอบโหลดไม่ได้ (เช่น ยังไม่ได้รัน migration 0002) → หน้างานยังใช้ได้ แค่ไม่มีป้าย/แถบสอบ
  if (categoriesRes.error) console.error("load categories", categoriesRes.error);
  if (examsRes.error) console.error("load upcoming exams", examsRes.error);
  if (tasksRes.error || coursesRes.error) {
    console.error("load tasks", tasksRes.error ?? coursesRes.error);
    return (
      <p className="rounded-card border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        โหลดรายการงานไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง
      </p>
    );
  }

  const allTasks = (tasksRes.data ?? []) as Task[];
  const courses = (coursesRes.data ?? []) as Course[];
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const categories = (categoriesRes.data ?? []) as TaskCategory[];
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  // ตัวกรองวิชาจาก URL เช่น /tasks?course=<id> (ถ้า id ไม่ใช่วิชาของเรา → แสดงทั้งหมด)
  const courseParam = typeof params.course === "string" ? params.course : "";
  const filterCourse = courseById.get(courseParam);
  const tasks = filterCourse
    ? allTasks.filter((t) => t.course_id === filterCourse.id)
    : allTasks;

  const exams = upcomingExams(
    ((examsRes.data ?? []) as Pick<
      CalendarEvent,
      "id" | "course_id" | "title" | "exam_type" | "starts_at"
    >[]).filter((e) => !filterCourse || e.course_id === filterCourse.id),
    now,
  );
  const pending = tasks.filter((t) => !t.done);
  const noDue = pending.filter((t) => !t.due_at);
  const groups = new Map<DueGroup, Task[]>();
  for (const t of pending) {
    if (!t.due_at) continue;
    const g = dueGroup(t.due_at, now);
    groups.set(g, [...(groups.get(g) ?? []), t]);
  }
  const done = tasks.filter((t) => t.done);

  const renderItem = (t: Task) => (
    <TaskItem
      key={t.id}
      task={t}
      course={t.course_id ? courseById.get(t.course_id) : undefined}
      courses={courses}
      category={t.category_id ? categoryById.get(t.category_id) : undefined}
      categories={categories}
      labelMode={labelMode}
      overdue={!t.done && !!t.due_at && dueGroup(t.due_at, now) === "overdue"}
    />
  );

  return (
    <TaskSelectionProvider>
      <div className="space-y-8">
        {courses.length > 0 && (
          <CourseFilter
            courses={courses}
            activeId={filterCourse?.id}
            labelMode={labelMode}
          />
        )}

        {exams.length > 0 && (
          <section className="space-y-2" aria-label="สอบที่ใกล้ถึง">
            <h2 className="text-sm font-medium text-muted">
              📝 สอบใน {UPCOMING_EXAM_DAYS} วันนี้
            </h2>
            <ul className="space-y-1.5">
              {exams.map((e) => {
                const course = e.course_id ? courseById.get(e.course_id) : undefined;
                // มีวิชา → "สอบกลางภาค 204383" ไม่มี → ใช้ชื่อที่บันทึกไว้
                const label = course
                  ? `${EXAM_TYPE_LABEL[e.exam_type ?? "other"]} ${courseLabel(course, labelMode)}`
                  : e.title;
                return (
                  <li key={e.id}>
                    <Link
                      href="/exams"
                      className="flex items-center justify-between gap-3 rounded-card border border-line bg-white px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate">{label}</span>
                      <Countdown days={e.daysLeft} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="space-y-3 rounded-card border border-line bg-white p-4">
          <h2 className="font-medium">เพิ่มงานใหม่</h2>
          {/* key: เปลี่ยนตัวกรอง → ฟอร์มเลือกวิชานั้นไว้ให้ล่วงหน้า */}
          <TaskForm
            key={filterCourse?.id ?? "all"}
            courses={courses}
            categories={categories}
            defaultCourseId={filterCourse?.id}
          />
        </section>

        <section className="space-y-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-medium">
              ยังไม่เสร็จ <span className="text-muted">({pending.length})</span>
            </h2>
            {tasks.length > 0 && <SelectModeButton />}
          </div>

          {pending.length === 0 && (
            <p className="text-sm text-muted">ยังไม่มีงานค้าง 🎉</p>
          )}

          {/* งานที่ยังไม่มีวันส่งขึ้นก่อน เพราะต้องไปหาวันส่งมาใส่ */}
          {noDue.length > 0 && (
            <TaskGroup label="⚠ ยังไม่กำหนดวันส่ง" count={noDue.length} tone="warn">
              {noDue.map(renderItem)}
            </TaskGroup>
          )}
          {GROUP_ORDER.map((g) => {
            const items = groups.get(g);
            if (!items?.length) return null;
            return (
              <TaskGroup
                key={g}
                label={DUE_GROUP_LABEL[g]}
                count={items.length}
                tone={g === "overdue" ? "danger" : "normal"}
              >
                {items.map(renderItem)}
              </TaskGroup>
            );
          })}
        </section>

        {done.length > 0 && (
          <details className="space-y-3">
            <summary className="cursor-pointer font-medium">
              เสร็จแล้ว <span className="text-muted">({done.length})</span>
            </summary>
            <ul className="mt-3 space-y-2">{done.map(renderItem)}</ul>
          </details>
        )}
        <SelectionSpacer />
      </div>
    </TaskSelectionProvider>
  );
}

function TaskGroup({
  label,
  count,
  tone,
  children,
}: {
  label: string;
  count: number;
  tone: "normal" | "warn" | "danger";
  children: React.ReactNode;
}) {
  const color =
    tone === "danger"
      ? "text-red-600"
      : tone === "warn"
        ? "text-amber-700"
        : "text-muted";
  return (
    <div className="space-y-2">
      <h3 className={`text-sm font-medium ${color}`}>
        {label} ({count})
      </h3>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

// ปุ่มกรองตามวิชา เลื่อนซ้าย-ขวาได้บนมือถือ
function CourseFilter({
  courses,
  activeId,
  labelMode,
}: {
  courses: Course[];
  activeId?: string;
  labelMode: CourseLabelMode;
}) {
  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1 text-sm ${
      active ? "border-accent bg-accent text-white" : "border-line bg-white text-muted"
    }`;
  return (
    <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1">
      <Link href="/tasks" className={chip(!activeId)}>
        ทั้งหมด
      </Link>
      {courses.map((c) => (
        <Link
          key={c.id}
          href={`/tasks?course=${c.id}`}
          className={chip(activeId === c.id)}
        >
          {courseLabel(c, labelMode)}
        </Link>
      ))}
    </div>
  );
}
