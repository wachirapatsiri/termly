import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourseLabelMode, getYearMode } from "@/lib/preferences";
import { AppNav } from "@/components/app-nav";
import { CategoryManager } from "@/components/category-manager";
import { CourseLabelSetting } from "@/components/course-label-setting";
import { YearModeSetting } from "@/components/year-mode-setting";
import { SignOutButton } from "@/components/sign-out-button";
import { InstallApp } from "@/components/install-app";
import { CalendarExport, type ExportCourse } from "@/components/calendar-export";
import { courseLabel } from "@/lib/course-label";
import { NO_COURSE } from "@/lib/ics";

export default function SettingsPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-8 px-6 py-6 lg:max-w-6xl lg:px-10">
      <AppNav current="/settings" />
      <h1 className="text-2xl font-semibold tracking-tight">ตั้งค่า</h1>

      <Suspense fallback={<div className="h-64 rounded-card border border-line" />}>
        <SettingsSection />
      </Suspense>
    </main>
  );
}

async function SettingsSection() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [mode, yearMode, sampleRes, categoriesRes, taskCatsRes, exportRes] = await Promise.all([
    getCourseLabelMode(),
    getYearMode(),
    // ใช้วิชาที่มีรหัสเป็นตัวอย่างในพรีวิว
    supabase.from("courses").select("name, code").not("code", "is", null).limit(1),
    supabase
      .from("task_categories")
      .select("id, name")
      .order("position")
      .order("created_at"),
    // นับว่าแต่ละประเภทมีกี่งาน (โชว์ตอนจะลบ)
    supabase.from("tasks").select("category_id").not("category_id", "is", null),
    loadExportCounts(supabase),
  ]);
  const sample = sampleRes.data?.[0] ?? { name: "สถิติเบื้องต้น", code: "DS101" };
  if (categoriesRes.error) console.error("load categories", categoriesRes.error);
  const counts = new Map<string, number>();
  for (const t of taskCatsRes.data ?? []) {
    if (t.category_id) counts.set(t.category_id, (counts.get(t.category_id) ?? 0) + 1);
  }
  const categories = (categoriesRes.data ?? []).map((c) => ({
    ...c,
    taskCount: counts.get(c.id) ?? 0,
  }));

  return (
    // มือถือ: เรียงลงมา คั่นด้วยเส้น · จอคอม: การ์ด 2 คอลัมน์ (เรียงลงทีละคอลัมน์ ลำดับเหมือนมือถือ)
    <div className="space-y-6 lg:columns-2 lg:gap-6 lg:space-y-0">
      <Block first>
        <CourseLabelSetting current={mode} sample={sample} />
      </Block>

      <Block>
        <YearModeSetting current={yearMode} sampleIso={new Date().toISOString()} />
      </Block>

      <Block>
        <CategoryManager categories={categories} />
      </Block>

      <Block>
        <CalendarExport
          courses={exportRes.courses.map((c) => ({
            ...c,
            label: c.id === NO_COURSE ? "ไม่มีวิชา" : courseLabel(c.course!, mode),
          }))}
          undated={exportRes.undated}
        />
      </Block>

      <Block>
        <InstallApp />
      </Block>

      <Block>
        <section className="space-y-3">
          <p className="text-sm text-muted">เข้าสู่ระบบเป็น {user.email}</p>
          <SignOutButton />
        </section>
      </Block>
    </div>
  );
}

// กล่องแต่ละส่วนของหน้าตั้งค่า
function Block({ first, children }: { first?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`${first ? "" : "border-t border-line pt-6"} lg:mb-6 lg:break-inside-avoid lg:rounded-card lg:border lg:border-line lg:bg-white lg:p-5`}
    >
      {children}
    </div>
  );
}

// นับงาน/สอบที่ส่งออกปฏิทินได้ (มีวันแล้ว) แยกตามวิชา — เรียงตามลำดับวิชา, "ไม่มีวิชา" ไว้ท้าย
async function loadExportCounts(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [coursesRes, tasksRes, examsRes] = await Promise.all([
    supabase
      .from("courses")
      .select("id, name, code")
      .order("code", { ascending: true, nullsFirst: false })
      .order("name"),
    supabase.from("tasks").select("course_id, due_at, done"),
    supabase.from("events").select("course_id, starts_at").eq("kind", "exam"),
  ]);
  if (coursesRes.error || tasksRes.error || examsRes.error) {
    console.error("load export counts", coursesRes.error ?? tasksRes.error ?? examsRes.error);
  }

  type Row = Omit<ExportCourse, "label"> & { course?: { name: string; code: string | null } };
  const rows = new Map<string, Row>();
  for (const c of coursesRes.data ?? []) {
    rows.set(c.id, { id: c.id, course: c, pending: 0, done: 0, exams: 0 });
  }
  const rowOf = (courseId: string | null) => {
    const id = courseId && rows.has(courseId) ? courseId : NO_COURSE;
    if (!rows.has(id)) rows.set(id, { id, pending: 0, done: 0, exams: 0 });
    return rows.get(id)!;
  };

  let undated = 0;
  for (const t of tasksRes.data ?? []) {
    if (!t.due_at) {
      if (!t.done) undated++;
      continue;
    }
    rowOf(t.course_id)[t.done ? "done" : "pending"]++;
  }
  for (const e of examsRes.data ?? []) {
    if (!e.starts_at) undated++;
    else rowOf(e.course_id).exams++;
  }

  const courses = [...rows.values()].filter((r) => r.pending + r.done + r.exams > 0);
  return { courses, undated };
}
