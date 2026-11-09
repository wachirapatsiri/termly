import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourseLabelMode, getYearMode } from "@/lib/preferences";
import { courseLabel, type CourseLabelMode } from "@/lib/course-label";
import { DUE_GROUP_LABEL, dueGroup, toDueAt, type DueGroup } from "@/lib/dates";
import { weekStartOf } from "@/lib/weeks";
import { EXAM_TYPE_LABEL, UPCOMING_EXAM_DAYS, upcomingExams } from "@/lib/exams";
import type { Course, Task, TaskCategory } from "@/lib/types";
import { AppNav } from "@/components/app-nav";
import { WithYearMode } from "@/components/with-year-mode";
import { CourseDot } from "@/components/course-dot";
import { Countdown } from "@/components/exam-item";
import { TaskForm } from "@/components/task-form";
import { TaskItem } from "@/components/task-item";
import { WeekView, type WeekExam } from "@/components/week-view";
import { TaskSummaryTiles } from "@/components/task-summary";
import { EmptyState } from "@/components/empty-state";
import { FeedbackNudge } from "@/components/feedback-nudge";
import { summarizeTasks } from "@/lib/summary";
import { examLabel } from "@/lib/exam-display";
import {
  SelectModeButton,
  SelectionSpacer,
  TaskSelectionProvider,
} from "@/components/task-selection";

const GROUP_ORDER: DueGroup[] = ["overdue", "today", "tomorrow", "week", "later"];

export default function TasksPage({ searchParams }: PageProps<"/tasks">) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-8 px-6 py-6 lg:max-w-6xl lg:px-10">
      <AppNav current="/tasks" />
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">งานของฉัน</h1>
        <Link href="/settings#calendar" className="shrink-0 text-sm text-accent">
          📅 ส่งออกไปปฏิทิน
        </Link>
      </div>

      <Suspense fallback={null}>
        <FeedbackNudge />
      </Suspense>

      <Suspense fallback={<div className="h-64 rounded-card border border-line" />}>
        <WithYearMode>
          <TasksSection searchParams={searchParams} />
        </WithYearMode>
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
  // มุมมองรายสัปดาห์ต้องการสอบตั้งแต่วันจันทร์ของสัปดาห์นี้ → เอาค่าที่เก่ากว่า
  const yesterday = new Date(now.getTime() - 86_400_000).toISOString();
  const monday = toDueAt(weekStartOf(now.toISOString()), "00:00") ?? yesterday;
  const since = monday < yesterday ? monday : yesterday;
  const [tasksRes, coursesRes, categoriesRes, examsRes, params, labelMode, yearMode] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, course_id, category_id, title, due_at, due_has_time, notes, source, done, created_at",
      )
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("courses")
      .select("*")
      .order("code", { ascending: true, nullsFirst: false })
      .order("name"),
    supabase
      .from("task_categories")
      .select("id, name")
      .order("position")
      .order("created_at"),
    supabase
      .from("events")
      .select("id, course_id, title, exam_type, starts_at, ends_at, has_time, location")
      .eq("kind", "exam")
      .gte("starts_at", since)
      .order("starts_at"),
    searchParams,
    getCourseLabelMode(),
    getYearMode(),
  ]);

  // ประเภท/สอบโหลดไม่ได้ (เช่น ยังไม่ได้รัน migration 0002) → หน้างานยังใช้ได้ แค่ไม่มีป้าย/แถบสอบ
  if (categoriesRes.error) console.error("load categories", categoriesRes.error);
  if (examsRes.error) console.error("load upcoming exams", examsRes.error);
  if (tasksRes.error || coursesRes.error) {
    console.error("load tasks", tasksRes.error ?? coursesRes.error);
    return (
      <p className="rounded-card border border-danger-line bg-danger-soft p-3 text-sm text-danger">
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

  const courseExams = ((examsRes.data ?? []) as WeekExam[]).filter(
    (e) => !filterCourse || e.course_id === filterCourse.id,
  );
  const view = params.view === "week" ? "week" : "list";

  // ตัวเลขสรุปบนหัวหน้า (ทั้งสองมุมมอง)
  const summary = summarizeTasks(tasks, courseExams, now);
  const nextCourse = summary.nextExam?.course_id
    ? courseById.get(summary.nextExam.course_id)
    : undefined;
  const summaryTiles = (
    <TaskSummaryTiles
      summary={summary}
      nextExamLabel={summary.nextExam ? examLabel(summary.nextExam, nextCourse, labelMode) : null}
      nextExamCourse={nextCourse}
      weekHref={tasksHref("week", filterCourse?.id)}
      listHref={tasksHref("list", filterCourse?.id)}
    />
  );

  // ยังไม่มีงานเลยสักชิ้น (ไม่กรองวิชา) → หน้าแนะนำว่าเริ่มยังไง แทนตัวเลขศูนย์
  const firstTime = allTasks.length === 0;

  if (view === "week") {
    return (
      <div className="space-y-6">
        {!firstTime && summaryTiles}
        <div className="space-y-6 lg:flex lg:items-center lg:gap-4 lg:space-y-0">
          <div className="lg:w-64 lg:shrink-0">
            <ViewToggle view={view} courseId={filterCourse?.id} />
          </div>
          {courses.length > 0 && (
            <CourseFilter
              courses={courses}
              activeId={filterCourse?.id}
              labelMode={labelMode}
              view={view}
            />
          )}
        </div>
        <WeekView
          tasks={tasks}
          exams={courseExams}
          courses={courses}
          categories={categories}
          labelMode={labelMode}
          yearMode={yearMode}
          now={now}
        />
      </div>
    );
  }

  const exams = upcomingExams(courseExams, now);
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

  const upcoming = exams.length > 0 && (
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
                className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface px-3 py-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {course && <CourseDot course={course} />}
                  <span className="truncate">{label}</span>
                </span>
                <Countdown days={e.daysLeft} />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );

  return (
    <TaskSelectionProvider>
      <div className="space-y-8">
        {firstTime ? (
          <EmptyState
            icon="📚"
            title="เริ่มเพิ่มงานแรกกันเลย"
            body="วางซิลลาบัสหรือประกาศงานให้ AI ช่วยแยกงานและวันส่งให้ หรือจะพิมพ์เพิ่มเองในฟอร์มก็ได้"
            actions={[
              { href: "/import", label: "✨ ให้ AI ช่วยเพิ่ม", primary: true },
              { href: "/courses", label: "เพิ่มวิชาก่อน" },
            ]}
          />
        ) : (
          summaryTiles
        )}
        <div className="space-y-8 lg:flex lg:items-center lg:gap-4 lg:space-y-0">
          <div className="lg:w-64 lg:shrink-0">
            <ViewToggle view={view} courseId={filterCourse?.id} />
          </div>
          {courses.length > 0 && (
            <CourseFilter
              courses={courses}
              activeId={filterCourse?.id}
              labelMode={labelMode}
              view={view}
            />
          )}
        </div>

        {/* มือถือ: เรียงลงมา (สอบ → ฟอร์ม → รายการ)
            จอคอม (lg): 2 คอลัมน์ ซ้าย = รายการงาน, ขวา = สอบใกล้ถึง + ฟอร์มเพิ่มงาน (ติดอยู่กับที่ตอนเลื่อน) */}
        <div className="space-y-8 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10 lg:space-y-0">
          <aside className="space-y-8 lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1">
            {upcoming}

            <section className="space-y-3 rounded-card border border-line bg-surface p-4">
              <h2 className="font-medium">เพิ่มงานใหม่</h2>
              {/* key: เปลี่ยนตัวกรอง → ฟอร์มเลือกวิชานั้นไว้ให้ล่วงหน้า */}
              <TaskForm
                key={filterCourse?.id ?? "all"}
                courses={courses}
                categories={categories}
                defaultCourseId={filterCourse?.id}
              />
            </section>
          </aside>

          <div className="space-y-8 lg:col-start-1 lg:row-start-1">
            <section className="space-y-6">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-medium">
                  ยังไม่เสร็จ <span className="text-muted">({pending.length})</span>
                </h2>
                {tasks.length > 0 && <SelectModeButton />}
              </div>

              {pending.length === 0 && !firstTime && (
                <EmptyState
                  compact
                  icon="🎉"
                  title={filterCourse ? "วิชานี้ไม่มีงานค้างแล้ว" : "ไม่มีงานค้างแล้ว เก่งมาก!"}
                  body="พักได้เลย หรือเช็กตารางสอบไว้ล่วงหน้า"
                  actions={[{ href: "/exams", label: "ดูตารางสอบ" }]}
                />
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
          </div>
        </div>
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
      ? "text-danger"
      : tone === "warn"
        ? "text-warn"
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

type TasksView = "list" | "week";

// URL ของหน้างาน รักษาทั้งมุมมองและตัวกรองวิชา เช่น /tasks?view=week&course=<id>
function tasksHref(view: TasksView, courseId?: string) {
  const q = new URLSearchParams();
  if (view === "week") q.set("view", "week");
  if (courseId) q.set("course", courseId);
  const s = q.toString();
  return s ? `/tasks?${s}` : "/tasks";
}

// สลับ "รายการ | รายสัปดาห์"
function ViewToggle({ view, courseId }: { view: TasksView; courseId?: string }) {
  const tab = (v: TasksView, label: string) => (
    <Link
      href={tasksHref(v, courseId)}
      aria-current={view === v ? "page" : undefined}
      className={`flex-1 rounded-[calc(var(--radius-card)-2px)] px-3 py-1.5 text-center ${
        view === v ? "bg-foreground text-background" : "text-muted"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <div className="flex rounded-card border border-line bg-surface p-0.5 text-sm">
      {tab("list", "รายการ")}
      {tab("week", "รายสัปดาห์")}
    </div>
  );
}

// ปุ่มกรองตามวิชา เลื่อนซ้าย-ขวาได้บนมือถือ
function CourseFilter({
  courses,
  activeId,
  labelMode,
  view,
}: {
  courses: Course[];
  activeId?: string;
  labelMode: CourseLabelMode;
  view: TasksView;
}) {
  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1 text-sm ${
      active ? "border-accent bg-accent text-white" : "border-line bg-surface text-muted"
    }`;
  return (
    <div className="-mx-6 flex min-w-0 gap-2 overflow-x-auto px-6 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
      <Link href={tasksHref(view)} className={chip(!activeId)}>
        ทั้งหมด
      </Link>
      {courses.map((c) => (
        <Link
          key={c.id}
          href={tasksHref(view, c.id)}
          className={`${chip(activeId === c.id)} inline-flex items-center gap-1.5`}
        >
          <CourseDot course={c} className={`h-2 w-2 ${activeId === c.id ? "ring-2 ring-white/70" : ""}`} />
          {courseLabel(c, labelMode)}
        </Link>
      ))}
    </div>
  );
}
