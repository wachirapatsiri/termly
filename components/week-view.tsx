// มุมมองรายสัปดาห์ของหน้างาน (/tasks?view=week) — server component
// นับจำนวนงานต่อสัปดาห์ (จันทร์–อาทิตย์) เพื่อบอกว่าสัปดาห์ไหนงานหนัก; สอบแสดงในสัปดาห์แต่ไม่นับรวม
import Link from "next/link";
import { courseLabel, type CourseLabelMode } from "@/lib/course-label";
import { EXAM_TYPE_TONE, examLabel } from "@/lib/exam-display";
import { formatExamTime } from "@/lib/exams";
import {
  HEAVY_WEEK_TASKS,
  MEDIUM_WEEK_TASKS,
  WEEK_LOAD_LABEL,
  buildWeeks,
  formatWeekRange,
  shortDay,
  weekOffsetLabel,
  type Week,
  type WeekLoad,
} from "@/lib/weeks";
import { toBangkokParts } from "@/lib/dates";
import type { YearMode } from "@/lib/year-mode";
import type { CalendarEvent, Course, Task, TaskCategory } from "@/lib/types";

export type WeekExam = Pick<
  CalendarEvent,
  "id" | "course_id" | "title" | "exam_type" | "starts_at" | "ends_at" | "has_time" | "location"
>;

// เขียนชื่อคลาสเต็ม ๆ ให้ Tailwind หาเจอ
const LOAD_TONE: Record<WeekLoad, { badge: string; bar: string }> = {
  free: { badge: "border-line bg-background text-muted", bar: "bg-line" },
  light: { badge: "border-blue-200 bg-blue-50 text-accent", bar: "bg-accent/50" },
  medium: { badge: "border-amber-200 bg-amber-50 text-amber-800", bar: "bg-amber-400" },
  heavy: { badge: "border-red-200 bg-red-50 text-red-700", bar: "bg-red-500" },
};

export function WeekView({
  tasks,
  exams,
  courses,
  categories,
  labelMode,
  yearMode,
  now,
}: {
  tasks: Task[];
  exams: WeekExam[];
  courses: Course[];
  categories: TaskCategory[];
  labelMode: CourseLabelMode;
  yearMode: YearMode;
  now: Date;
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
      <section className="space-y-3 rounded-card border border-line bg-white p-4" aria-label="ภาพรวมรายสัปดาห์">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-medium">ภาพรวม</h2>
          <p className="text-xs text-muted">
            {heavyCount > 0 ? `งานหนัก ${heavyCount} สัปดาห์` : "ยังไม่มีสัปดาห์งานหนัก"}
          </p>
        </div>
        <div className="-mx-4 overflow-x-auto px-4">
          <ol className="flex min-w-full items-end gap-1.5">
            {weeks.map((w) => (
              <li key={w.start} className="flex min-w-7 flex-1 flex-col items-center gap-1">
                <a
                  href={`#w-${w.start}`}
                  aria-label={`${weekOffsetLabel(w.offset)} ${w.taskCount} งาน`}
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
                  {w.offset === 0 ? "นี้" : Number(w.start.slice(8, 10))}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-xs text-muted">
          ตัวเลขใต้แท่ง = วันจันทร์ของสัปดาห์ · {MEDIUM_WEEK_TASKS}–{HEAVY_WEEK_TASKS - 1} งาน = ปานกลาง ·{" "}
          {HEAVY_WEEK_TASKS} งานขึ้นไป = หนัก (สอบไม่นับ)
        </p>
      </section>

      {(overdueBefore > 0 || noDue > 0) && (
        <div className="space-y-1 text-sm">
          {overdueBefore > 0 && (
            <p className="text-red-600">
              เลยกำหนดจากสัปดาห์ก่อน {overdueBefore} งาน ·{" "}
              <Link href="/tasks" className="underline">
                ดูในรายการ
              </Link>
            </p>
          )}
          {noDue > 0 && (
            <p className="text-amber-700">
              ⚠ ยังไม่กำหนดวันส่ง {noDue} งาน (ไม่อยู่ในสัปดาห์ไหน) ·{" "}
              <Link href="/tasks" className="underline">
                ไปเติมวันส่ง
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
}: {
  week: Week<Task, WeekExam>;
  courseById: Map<string, Course>;
  categoryById: Map<string, TaskCategory>;
  labelMode: CourseLabelMode;
  yearMode: YearMode;
  now: Date;
}) {
  const range = formatWeekRange(w.start, w.end, yearMode, now);
  const empty = w.taskCount === 0 && w.exams.length === 0;
  const tone = LOAD_TONE[w.load];

  return (
    <li
      id={`w-${w.start}`}
      className={`scroll-mt-4 rounded-card border bg-white ${
        w.offset === 0 ? "border-accent" : "border-line"
      } ${empty ? "px-4 py-2.5" : "space-y-3 p-4"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="min-w-0 text-sm">
          <span className={`font-medium ${w.offset === 0 ? "text-accent" : ""}`}>
            {weekOffsetLabel(w.offset)}
          </span>{" "}
          <span className="text-muted">· {range}</span>
        </h3>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${tone.badge}`}>
          {w.load === "free"
            ? "ว่าง"
            : `${WEEK_LOAD_LABEL[w.load]} · ${w.taskCount} งาน`}
        </span>
      </div>

      {w.exams.length > 0 && (
        <ul className="space-y-1.5">
          {w.exams.map((e) => {
            const course = e.course_id ? courseById.get(e.course_id) : undefined;
            const time = formatExamTime(e);
            return (
              <li key={e.id}>
                <Link
                  href="/exams"
                  className={`flex items-baseline gap-2 rounded-card border-l-4 bg-background px-3 py-1.5 text-sm ${
                    EXAM_TYPE_TONE[e.exam_type ?? "other"].border
                  }`}
                >
                  <span className="w-11 shrink-0 text-muted">{shortDay(e.starts_at!)}</span>
                  <span className="min-w-0 flex-1">
                    📝 {examLabel(e, course, labelMode)}
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
              t.due_has_time && `${toBangkokParts(t.due_at!).time} น.`,
            ].filter(Boolean);
            return (
              <li key={t.id} className="flex items-baseline gap-2 py-1.5 text-sm">
                <span className={`w-11 shrink-0 ${overdue ? "text-red-600" : "text-muted"}`}>
                  {shortDay(t.due_at!)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={t.done ? "text-muted line-through" : ""}>
                    {t.done && "✓ "}
                    {t.title}
                  </span>
                  {meta.length > 0 && (
                    <span className="block text-xs text-muted">
                      {meta.join(" · ")}
                      {overdue && <span className="text-red-600"> · เลยกำหนด</span>}
                    </span>
                  )}
                  {meta.length === 0 && overdue && (
                    <span className="block text-xs text-red-600">เลยกำหนด</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {w.doneCount > 0 && (
        <p className="text-xs text-muted">
          เสร็จแล้ว {w.doneCount}/{w.taskCount} งาน
        </p>
      )}
    </li>
  );
}
