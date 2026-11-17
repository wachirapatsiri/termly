import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourseLabelMode, getLang } from "@/lib/preferences";
import { t } from "@/lib/messages";
import { daysUntil } from "@/lib/dates";
import {
  EXAM_TYPES,
  examTypeLabel,
  findOverlaps,
  formatExamTime,
  isExamType,
  type ExamType,
} from "@/lib/exams";
import type { CalendarEvent, Course } from "@/lib/types";
import { AppNav } from "@/components/app-nav";
import { WithYearMode } from "@/components/with-year-mode";
import { WithLang } from "@/components/with-lang";
import { ExamForm } from "@/components/exam-form";
import { ExamItem } from "@/components/exam-item";
import { EXAM_TYPE_TONE, examLabel } from "@/lib/exam-display";
import { EmptyState } from "@/components/empty-state";

export default function ExamsPage({ searchParams }: PageProps<"/exams">) {
  return (
    <main className="mx-auto w-full max-w-md md:max-w-2xl flex-1 space-y-8 px-6 py-6 lg:max-w-none lg:px-10 min-[1700px]:px-16">
      <AppNav current="/exams" />
      {/* ภาษามาจาก cookie → อ่านใน Suspense เสมอ */}
      <Suspense fallback={<div className="h-8" />}>
        <ExamsHeader />
      </Suspense>

      <Suspense fallback={<div className="h-64 rounded-card border border-line" />}>
        <WithLang>
          <WithYearMode>
            <ExamsSection searchParams={searchParams} />
          </WithYearMode>
        </WithLang>
      </Suspense>
    </main>
  );
}

const EXAM_COLUMNS =
  "id, course_id, title, kind, exam_type, starts_at, ends_at, has_time, location, notes, created_at";

async function ExamsHeader() {
  const lang = await getLang();
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">{t(lang, "exams.title")}</h1>
      <Link href="/settings#calendar" className="shrink-0 text-sm text-accent">
        {t(lang, "tasks.exportCalendar")}
      </Link>
    </div>
  );
}

async function ExamsSection({
  searchParams,
}: {
  searchParams: PageProps<"/exams">["searchParams"];
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  // RLS ทำให้ได้เฉพาะแถวของผู้ใช้คนนี้อยู่แล้ว
  const [examsRes, coursesRes, labelMode, params, lang] = await Promise.all([
    supabase
      .from("events")
      .select(EXAM_COLUMNS)
      .eq("kind", "exam")
      .order("starts_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("courses")
      .select("*")
      .order("code", { ascending: true, nullsFirst: false })
      .order("name"),
    getCourseLabelMode(),
    searchParams,
    getLang(),
  ]);

  if (examsRes.error || coursesRes.error) {
    console.error("load exams", examsRes.error ?? coursesRes.error);
    return (
      <p className="rounded-card border border-danger-line bg-danger-soft p-3 text-sm text-danger">
        {t(lang, "exams.loadFailed")}
      </p>
    );
  }

  const exams = (examsRes.data ?? []) as CalendarEvent[];
  const courses = (coursesRes.data ?? []) as Course[];
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const courseOf = (e: CalendarEvent) => (e.course_id ? courseById.get(e.course_id) : undefined);

  // ตัวกรองชนิดสอบจาก URL เช่น /exams?type=midterm (ค่าอื่น = แสดงทุกชนิด)
  const filter = isExamType(params.type) ? params.type : null;

  // เวลาชนกัน: เช็กกับสอบทุกชนิด (กลางภาคอาจชนกับสอบอื่น ๆ ได้)
  const overlaps = findOverlaps(exams);
  const overlapText = new Map(
    [...overlaps].map(([i, hits]) => [
      exams[i].id,
      hits.map((h) => `${examLabel(h, courseOf(h), labelMode, lang)} (${formatExamTime(h, lang)})`),
    ]),
  );

  const now = new Date();
  const withDays = exams.map((e) => ({
    exam: e,
    daysLeft: e.starts_at ? daysUntil(e.starts_at, now) : null,
  }));
  const typeOf = (e: CalendarEvent): ExamType => e.exam_type ?? "other";
  const shown = withDays.filter((x) => !filter || typeOf(x.exam) === filter);
  // ยังไม่ผ่าน (ยังไม่ประกาศวันขึ้นก่อน ตามลำดับที่ query เรียงมา) / ผ่านไปแล้ว (ล่าสุดก่อน)
  const active = shown.filter((x) => x.daysLeft === null || x.daysLeft >= 0);
  const past = shown.filter((x) => x.daysLeft !== null && x.daysLeft < 0).reverse();

  const renderItem = ({ exam, daysLeft }: (typeof withDays)[number]) => (
    <ExamItem
      key={exam.id}
      exam={exam}
      course={courseOf(exam)}
      courses={courses}
      labelMode={labelMode}
      daysLeft={daysLeft}
      overlapsWith={overlapText.get(exam.id) ?? []}
    />
  );

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1 text-sm ${
      active ? "border-accent bg-accent text-white" : "border-line bg-surface text-muted"
    }`;
  const overlapCount = overlaps.size;

  return (
    <div className="space-y-8">
      <details className="rounded-card border border-line bg-surface p-4 lg:max-w-xl">
        <summary className="cursor-pointer font-medium">{t(lang, "exams.addOwn")}</summary>
        <div className="mt-3">
          <ExamForm courses={courses} />
        </div>
      </details>

      {exams.length === 0 ? (
        <EmptyState
          title={t(lang, "exams.emptyTitle")}
          body={t(lang, "exams.emptyBody")}
          actions={[{ href: "/import", label: t(lang, "exams.emptyAi"), primary: true }]}
        />
      ) : (
        <>
          {/* กดดูทีละชนิดได้ */}
          <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 lg:mx-0 lg:px-0">
            <Link href="/exams" className={chip(!filter)}>
              {t(lang, "exams.all")}
            </Link>
            {EXAM_TYPES.map((ty) => (
              <Link key={ty} href={`/exams?type=${ty}`} className={chip(filter === ty)}>
                {t(lang, `examShort.${ty}`)}
              </Link>
            ))}
          </div>

          {overlapCount > 0 && (
            <p className="rounded-card border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger">
              {t(lang, "exams.overlapCount", { n: overlapCount })}
            </p>
          )}

          {/* จอคอม: กลางภาค / ปลายภาค / อื่น ๆ วางเคียงกัน 3 คอลัมน์ */}
          <div
            className={`space-y-8 lg:grid lg:items-start lg:gap-6 lg:space-y-0 ${
              filter ? "lg:max-w-xl" : "lg:grid-cols-3"
            }`}
          >
          {EXAM_TYPES.filter((ty) => !filter || filter === ty).map((ty) => {
            const items = active.filter((x) => typeOf(x.exam) === ty);
            const tone = EXAM_TYPE_TONE[ty];
            const title = examTypeLabel(ty, lang);
            return (
              <section key={ty} className="space-y-2">
                <h2 className={`flex items-center gap-2 font-medium ${tone.text}`}>
                  <span className={`h-3 w-3 rounded-full ${tone.dot}`} aria-hidden />
                  {title} <span className="text-muted">({items.length})</span>
                </h2>
                {items.length === 0 ? (
                  <p className="text-sm text-muted">
                    {t(lang, "exams.noneUpcoming", { type: title.toLowerCase() })}
                  </p>
                ) : (
                  <ul className="space-y-2">{items.map(renderItem)}</ul>
                )}
              </section>
            );
          })}
          </div>

          {past.length > 0 && (
            <details className="space-y-3">
              <summary className="cursor-pointer font-medium">
                {t(lang, "exams.past")} <span className="text-muted">({past.length})</span>
              </summary>
              <ul className="mt-3 space-y-2 lg:grid lg:grid-cols-3 lg:items-start lg:gap-x-6 lg:gap-y-2 lg:space-y-0">
                {past.map(renderItem)}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
