import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourseLabelMode } from "@/lib/preferences";
import { daysUntil } from "@/lib/dates";
import type { CalendarEvent, Course } from "@/lib/types";
import { AppNav } from "@/components/app-nav";
import { ExamForm } from "@/components/exam-form";
import { ExamItem } from "@/components/exam-item";

export default function ExamsPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-8 px-6 py-6">
      <AppNav current="/exams" />
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">ตารางสอบ</h1>
        <Link href="/import" className="text-sm text-accent">
          ✨ นำเข้าจากซิลลาบัส
        </Link>
      </div>

      <Suspense fallback={<div className="h-64 rounded-card border border-line" />}>
        <ExamsSection />
      </Suspense>
    </main>
  );
}

const EXAM_COLUMNS =
  "id, course_id, title, kind, exam_type, starts_at, ends_at, has_time, location, notes, created_at";

async function ExamsSection() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  // RLS ทำให้ได้เฉพาะแถวของผู้ใช้คนนี้อยู่แล้ว
  const [examsRes, coursesRes, labelMode] = await Promise.all([
    supabase
      .from("events")
      .select(EXAM_COLUMNS)
      .eq("kind", "exam")
      .order("starts_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("courses")
      .select("id, name, code")
      .order("code", { ascending: true, nullsFirst: false })
      .order("name"),
    getCourseLabelMode(),
  ]);

  if (examsRes.error || coursesRes.error) {
    console.error("load exams", examsRes.error ?? coursesRes.error);
    return (
      <p className="rounded-card border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        โหลดตารางสอบไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง
      </p>
    );
  }

  const exams = (examsRes.data ?? []) as CalendarEvent[];
  const courses = (coursesRes.data ?? []) as Course[];
  const courseById = new Map(courses.map((c) => [c.id, c]));

  const now = new Date();
  const withDays = exams.map((e) => ({
    exam: e,
    daysLeft: e.starts_at ? daysUntil(e.starts_at, now) : null,
  }));
  const noDate = withDays.filter((x) => x.daysLeft === null);
  const upcoming = withDays.filter((x) => x.daysLeft !== null && x.daysLeft >= 0);
  // ผ่านไปแล้ว: ล่าสุดขึ้นก่อน
  const past = withDays.filter((x) => x.daysLeft !== null && x.daysLeft < 0).reverse();

  const renderItem = ({ exam, daysLeft }: (typeof withDays)[number]) => (
    <ExamItem
      key={exam.id}
      exam={exam}
      course={exam.course_id ? courseById.get(exam.course_id) : undefined}
      courses={courses}
      labelMode={labelMode}
      daysLeft={daysLeft}
    />
  );

  return (
    <div className="space-y-8">
      <details className="group rounded-card border border-line bg-white p-4">
        <summary className="cursor-pointer font-medium">+ เพิ่มสอบเอง</summary>
        <div className="mt-3">
          <ExamForm courses={courses} />
        </div>
      </details>

      {exams.length === 0 && (
        <div className="space-y-2 rounded-card border border-dashed border-line p-4 text-sm text-muted">
          <p>ยังไม่มีตารางสอบ</p>
          <p>
            วางข้อความซิลลาบัสที่{" "}
            <Link href="/import" className="text-accent">
              ✨ นำเข้า
            </Link>{" "}
            แล้ว AI จะแยกวันสอบมาให้ หรือกด &quot;เพิ่มสอบเอง&quot; ด้านบน
          </p>
        </div>
      )}

      {noDate.length > 0 && (
        <ExamGroup label="⚠ ยังไม่ประกาศวันสอบ" count={noDate.length} tone="warn">
          {noDate.map(renderItem)}
        </ExamGroup>
      )}

      {upcoming.length > 0 && (
        <ExamGroup label="กำลังจะมาถึง" count={upcoming.length} tone="normal">
          {upcoming.map(renderItem)}
        </ExamGroup>
      )}

      {past.length > 0 && (
        <details className="space-y-3">
          <summary className="cursor-pointer font-medium">
            สอบไปแล้ว <span className="text-muted">({past.length})</span>
          </summary>
          <ul className="mt-3 space-y-2">{past.map(renderItem)}</ul>
        </details>
      )}
    </div>
  );
}

function ExamGroup({
  label,
  count,
  tone,
  children,
}: {
  label: string;
  count: number;
  tone: "normal" | "warn";
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className={`text-sm font-medium ${tone === "warn" ? "text-amber-700" : "text-muted"}`}>
        {label} ({count})
      </h2>
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}
