// หัวหน้า "งานของฉัน": ตัวเลขสรุป 3 ช่อง (server component)
import Link from "next/link";
import { countdownLabel } from "@/lib/exams";
import { WEEK_LOAD_LABEL, type WeekLoad } from "@/lib/weeks";
import type { TaskSummary } from "@/lib/summary";
import type { Course } from "@/lib/types";
import { CourseDot } from "@/components/course-dot";

const LOAD_TEXT: Record<WeekLoad, string> = {
  free: "text-muted",
  light: "text-info",
  medium: "text-warn",
  heavy: "text-danger",
};

const tile =
  "flex min-w-0 flex-col gap-1 rounded-card border border-line bg-surface p-3 transition hover:border-accent/50 active:scale-[0.98] motion-safe:animate-fade-in lg:p-4";

export function TaskSummaryTiles<E extends { exam_type: string | null; course_id: string | null }>({
  summary: s,
  nextExamLabel,
  nextExamCourse,
  weekHref,
  listHref,
}: {
  summary: TaskSummary<E>;
  nextExamLabel: string | null;
  nextExamCourse?: Course;
  weekHref: string;
  listHref: string;
}) {
  const pct = s.weekTotal ? Math.round((s.weekDone / s.weekTotal) * 100) : 0;
  return (
    <div className="grid grid-cols-3 gap-2 lg:gap-4" aria-label="สรุป">
      <Link href={weekHref} className={tile}>
        <span className="text-xs text-muted">สัปดาห์นี้</span>
        <span className="text-2xl leading-tight font-semibold lg:text-3xl">
          {s.weekTotal}
          <span className="ml-1 text-sm font-normal text-muted">งาน</span>
        </span>
        <span className={`text-xs ${LOAD_TEXT[s.weekLoad]}`}>
          {s.weekLoad === "free" ? "ว่าง 🌿" : WEEK_LOAD_LABEL[s.weekLoad]}
        </span>
        {s.weekTotal > 0 && (
          <span
            className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`เสร็จแล้ว ${s.weekDone} จาก ${s.weekTotal} งาน`}
          >
            <span
              className="block h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </span>
        )}
      </Link>

      <Link href={listHref} className={tile}>
        <span className="text-xs text-muted">เลยกำหนด</span>
        <span
          className={`text-2xl leading-tight font-semibold lg:text-3xl ${s.overdue ? "text-danger" : ""}`}
        >
          {s.overdue}
          <span className="ml-1 text-sm font-normal text-muted">งาน</span>
        </span>
        <span className={`text-xs ${s.noDue ? "text-warn" : "text-muted"}`}>
          {s.noDue ? `⚠ ไม่มีวันส่ง ${s.noDue}` : s.overdue ? "รีบเคลียร์นะ" : "ไม่มีค้าง 🎉"}
        </span>
      </Link>

      <Link href="/exams" className={tile}>
        <span className="text-xs text-muted">สอบถัดไป</span>
        {s.nextExam ? (
          <>
            <span
              className={`text-2xl leading-tight font-semibold lg:text-3xl ${
                s.nextExam.daysLeft <= 3 ? "text-danger" : ""
              }`}
            >
              {s.nextExam.daysLeft <= 1 ? (
                countdownLabel(s.nextExam.daysLeft)
              ) : (
                <>
                  {s.nextExam.daysLeft}
                  <span className="ml-1 text-sm font-normal text-muted">วัน</span>
                </>
              )}
            </span>
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
              {nextExamCourse && <CourseDot course={nextExamCourse} />}
              <span className="truncate">{nextExamLabel}</span>
            </span>
          </>
        ) : (
          <>
            <span className="text-2xl leading-tight font-semibold text-muted lg:text-3xl">–</span>
            <span className="text-xs text-muted">ยังไม่มีวันสอบ</span>
          </>
        )}
      </Link>
    </div>
  );
}
