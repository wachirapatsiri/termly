// มุมมองรายสัปดาห์ของหน้างาน (/tasks?view=week) — server component
// นับจำนวนงานต่อสัปดาห์ (จันทร์–อาทิตย์) เพื่อบอกว่าสัปดาห์ไหนงานหนัก; สอบแสดงในสัปดาห์แต่ไม่นับรวม
import Link from "next/link";
import { courseLabel, type CourseLabelMode } from "@/lib/course-label";
import { EXAM_TYPE_TONE, examLabel } from "@/lib/exam-display";
import { formatExamTime } from "@/lib/exams";
import {
  HEAVY_WEEK_TASKS,
  MEDIUM_WEEK_TASKS,
  weekLoadLabel,
  buildWeeks,
  formatWeekRange,
  shortDay,
  weekOffsetLabel,
  type Week,
  type WeekLoad,
} from "@/lib/weeks";
import { toBangkokParts } from "@/lib/dates";
import { t as msg } from "@/lib/messages";
import type { Lang } from "@/lib/i18n";
import { CourseDot } from "@/components/course-dot";
import type { YearMode } from "@/lib/year-mode";
import type { CalendarEvent, Course, Task, TaskCategory } from "@/lib/types";

export type WeekExam = Pick<
  CalendarEvent,
  "id" | "course_id" | "title" | "exam_type" | "starts_at" | "ends_at" | "has_time" | "location"
>;

// เขียนชื่อคลาสเต็ม ๆ ให้ Tailwind หาเจอ
const LOAD_TONE: Record<WeekLoad, { badge: string; bar: string }> = {
  free: { badge: "border-line bg-background text-muted", bar: "bg-line" },
  light: { badge: "border-info-line bg-info-soft text-accent", bar: "bg-accent/50" },
  medium: { badge: "border-warn-line bg-warn-soft text-warn", bar: "bg-warn-solid" },
  heavy: { badge: "border-danger-line bg-danger-soft text-danger", bar: "bg-danger-solid" },
};

export function WeekView({
  tasks,
  exams,
  courses,
  categories,
  labelMode,
  yearMode,
  now,
  lang,
}: {
  tasks: Task[];
  exams: WeekExam[];
  courses: Course[];
  categories: TaskCategory[];
  labelMode: CourseLabelMode;
  yearMode: YearMode;
  now: Date;
  lang: Lang;
}) {
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const weeks = buildWeeks(tasks, exams, now);
  const noDue = tasks.filter((t) => !t.done && !t.due_at).length;
  const thisWeekStart = weeks[0]?.start ?? "";
  const overdueBefore = tasks.filter(
    (t) => !t.done && t.due_at && toBangkokParts(t.due_at).date < thisWeekStart,
  ).length;
  const maxCount = Math.max(HEAVY_WEEK_TASKS, ...weeks.map((w) => w.taskCount));
  const heavyCount = weeks.filter((w) => w.load === "heavy").length;

  return (
    <div className="space-y-6">
      {/* ภาพรวม: แท่งต่อสัปดาห์ สูงตามจำนวนงาน กดแล้วเลื่อนไปสัปดาห์นั้น */}
      <section className="space-y-3 rounded-card border border-line bg-surface p-4" aria-label={msg(lang, "week.overviewAria")}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-medium">{msg(lang, "week.overview")}</h2>
          <p className="text-xs text-muted">
            {heavyCount > 0
              ? msg(lang, "week.heavyCount", { n: heavyCount })
              : msg(lang, "week.noHeavy")}
          </p>
        </div>
        <div className="-mx-4 overflow-x-auto px-4">
          <ol className="flex min-w-full items-end gap-1.5">
            {weeks.map((w) => (
              <li key={w.start} className="flex min-w-7 flex-1 flex-col items-center gap-1">
                <a
                  href={`#w-${w.start}`}
                  aria-label={msg(lang, "week.barAria", {
                    week: weekOffsetLabel(w.offset, lang),
                    n: w.taskCount,
                  })}
                  className="flex h-20 w-full flex-col justify-end"
                >
                  <span className="text-center text-[11px] text-muted">
                    {w.taskCount || ""}
                  </span>
                  <span
                    className={`block w-full rounded-sm ${LOAD_TONE[w.load].bar}`}
                    style={{ height: `${Math.max(4, (w.taskCount / maxCount) * 64)}px` }}
                  />
                </a>
                <span
                  className={`text-[11px] ${w.offset === 0 ? "font-medium text-accent" : "text-muted"}`}
                >
                  {w.offset === 0 ? msg(lang, "week.thisShort") : Number(w.start.slice(8, 10))}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-xs text-muted">
          {msg(lang, "week.legend", {
            medium: MEDIUM_WEEK_TASKS,
            heavyMinus: HEAVY_WEEK_TASKS - 1,
            heavy: HEAVY_WEEK_TASKS,
          })}
        </p>
      </section>

      {(overdueBefore > 0 || noDue > 0) && (
        <div className="space-y-1 text-sm">
          {overdueBefore > 0 && (
            <p className="text-danger">
              {msg(lang, "week.overdueBefore", { n: overdueBefore })} ·{" "}
              <Link href="/tasks" className="underline">
                {msg(lang, "week.viewInList")}
              </Link>
            </p>
          )}
          {noDue > 0 && (
            <p className="text-warn">
              {msg(lang, "week.noDue", { n: noDue })} ·{" "}
              <Link href="/tasks" className="underline">
                {msg(lang, "week.addDue")}
              </Link>
            </p>
          )}
        </div>
      )}

      {/* จอคอม: การ์ดสัปดาห์เรียงเป็นตาราง 2–3 คอลัมน์ */}
      <ol className="space-y-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0 xl:grid-cols-3">
        {weeks.map((w) => (
          <WeekCard
            key={w.start}
            week={w}
            courseById={courseById}
            categoryById={categoryById}
            labelMode={labelMode}
            yearMode={yearMode}
            now={now}
            lang={lang}
          />
        ))}
      </ol>
    </div>
  );
}

function WeekCard({
  week: w,
  courseById,
  categoryById,
  labelMode,
  yearMode,
  now,
  lang,
}: {
  week: Week<Task, WeekExam>;
  courseById: Map<string, Course>;
  categoryById: Map<string, TaskCategory>;
  labelMode: CourseLabelMode;
  yearMode: YearMode;
  now: Date;
  lang: Lang;
}) {
  const range = formatWeekRange(w.start, w.end, yearMode, now, lang);
  const empty = w.taskCount === 0 && w.exams.length === 0;
  const tone = LOAD_TONE[w.load];

  return (
    <li
      id={`w-${w.start}`}
      className={`scroll-mt-4 rounded-card border bg-surface motion-safe:animate-fade-in ${
        w.offset === 0 ? "border-accent" : "border-line"
      } ${empty ? "px-4 py-2.5" : "space-y-3 p-4"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="min-w-0 text-sm">
          <span className={`font-medium ${w.offset === 0 ? "text-accent" : ""}`}>
            {weekOffsetLabel(w.offset, lang)}
          </span>{" "}
          <span className="text-muted">· {range}</span>
        </h3>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${tone.badge}`}>
          {w.load === "free"
            ? weekLoadLabel("free", lang)
            : msg(lang, "week.loadBadge", { load: weekLoadLabel(w.load, lang), n: w.taskCount })}
        </span>
      </div>

      {w.exams.length > 0 && (
        <ul className="space-y-1.5">
          {w.exams.map((e) => {
            const course = e.course_id ? courseById.get(e.course_id) : undefined;
            const time = formatExamTime(e, lang);
            return (
              <li key={e.id}>
                <Link
                  href="/exams"
                  className={`flex items-baseline gap-2 rounded-card border-l-4 bg-background px-3 py-1.5 text-sm ${
                    EXAM_TYPE_TONE[e.exam_type ?? "other"].border
                  }`}
                >
                  <span className="w-11 shrink-0 text-muted">{shortDay(e.starts_at!, lang)}</span>
                  <span className="min-w-0 flex-1">
                    {examLabel(e, course, labelMode, lang)}
                    {(time || e.location) && (
                      <span className="block text-xs text-muted">
                        {[time, e.location].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {w.tasks.length > 0 && (
        <ul className="divide-y divide-line">
          {w.tasks.map((t) => {
            const course = t.course_id ? courseById.get(t.course_id) : undefined;
            const category = t.category_id ? categoryById.get(t.category_id) : undefined;
            const overdue = !t.done && new Date(t.due_at!).getTime() < now.getTime();
            const meta = [
              course && courseLabel(course, labelMode),
              category?.name,
              t.due_has_time &&
                `${toBangkokParts(t.due_at!).time}${lang === "th" ? " น." : ""}`,
            ].filter(Boolean);
            return (
              <li key={t.id} className="flex items-baseline gap-2 py-1.5 text-sm">
                {course ? (
                  <CourseDot course={course} className="relative -top-px h-2 w-2" />
                ) : (
                  <span className="w-2 shrink-0" aria-hidden />
                )}
                <span className={`w-11 shrink-0 ${overdue ? "text-danger" : "text-muted"}`}>
                  {shortDay(t.due_at!, lang)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={t.done ? "text-muted line-through" : ""}>
                    {t.done && "✓ "}
                    {t.title}
                  </span>
                  {meta.length > 0 && (
                    <span className="block text-xs text-muted">
                      {meta.join(" · ")}
                      {overdue && <span className="text-danger"> · {msg(lang, "task.overdueSuffix")}</span>}
                    </span>
                  )}
                  {meta.length === 0 && overdue && (
                    <span className="block text-xs text-danger">{msg(lang, "task.overdueSuffix")}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {w.doneCount > 0 && (
        <p className="text-xs text-muted">
          {msg(lang, "week.doneOf", { done: w.doneCount, total: w.taskCount })}
        </p>
      )}
    </li>
  );
}
