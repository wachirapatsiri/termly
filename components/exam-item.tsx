"use client";

import { useCallback, useOptimistic, useState } from "react";
import { deleteExam } from "@/app/exams/actions";
import { formatDue } from "@/lib/dates";
import { EXAM_TYPE_LABEL, countdownLabel, formatExamTime } from "@/lib/exams";
import { courseLabel, type CourseLabelMode } from "@/lib/course-label";
import type { CalendarEvent, Course } from "@/lib/types";
import { ExamForm, type ExamField } from "@/components/exam-form";

// การ์ดสอบ 1 รายการ — ช่องที่ยังไม่มีข้อมูลขึ้น "⚠ ไม่ระบุ…" กดแล้วเปิดฟอร์มแก้ช่องนั้นเลย
export function ExamItem({
  exam,
  course,
  courses,
  labelMode,
  daysLeft,
}: {
  exam: CalendarEvent;
  course?: Course;
  courses: Course[];
  labelMode: CourseLabelMode;
  daysLeft: number | null; // คำนวณฝั่งเซิร์ฟเวอร์ (null = ยังไม่รู้วัน)
}) {
  const [editing, setEditing] = useState<{ focus?: ExamField } | null>(null);
  const close = useCallback(() => setEditing(null), []);
  const [removed, setOptimisticRemoved] = useOptimistic(false);

  if (removed) return null;

  if (editing) {
    return (
      <li className="rounded-card border border-accent/40 bg-white p-4">
        <ExamForm
          exam={exam}
          courses={courses}
          focus={editing.focus}
          onSuccess={close}
          onCancel={close}
        />
      </li>
    );
  }

  const time = formatExamTime(exam);
  const past = daysLeft !== null && daysLeft < 0;
  const missing = (label: string, focus: ExamField) => (
    <button
      type="button"
      onClick={() => setEditing({ focus })}
      className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800"
    >
      ⚠ {label} · เติม
    </button>
  );

  return (
    <li className="space-y-2 rounded-card border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="rounded border border-accent/30 bg-accent/5 px-1.5 py-0.5 text-accent">
              📝 {EXAM_TYPE_LABEL[exam.exam_type ?? "other"]}
            </span>
            {course && <span className="text-muted">{courseLabel(course, labelMode)}</span>}
          </div>
          <p className={`font-medium break-words ${past ? "text-muted" : ""}`}>{exam.title}</p>
        </div>
        {daysLeft !== null && !past && <Countdown days={daysLeft} />}
      </div>

      <div className="space-y-1 text-sm">
        <p>
          {exam.starts_at ? formatDue(exam.starts_at, false) : missing("ไม่ระบุวันสอบ", "date")}
        </p>
        {exam.starts_at && (
          <p className="text-muted">{time ?? missing("ไม่ระบุเวลา", "start_time")}</p>
        )}
        <p className="break-words text-muted">
          {exam.location ? `📍 ${exam.location}` : missing("ไม่ระบุสถานที่", "location")}
        </p>
      </div>

      {exam.notes && (
        <p className="text-sm whitespace-pre-line break-words text-muted">{exam.notes}</p>
      )}

      <div className="flex gap-4 pt-1 text-sm">
        <button type="button" onClick={() => setEditing({})} className="text-accent">
          แก้ไข
        </button>
        <form
          action={async (formData) => {
            setOptimisticRemoved(true);
            await deleteExam(formData);
          }}
          onSubmit={(e) => {
            if (!confirm(`ลบ "${exam.title}" ?`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={exam.id} />
          <button type="submit" className="text-red-600">
            ลบ
          </button>
        </form>
      </div>
    </li>
  );
}

// ป้ายนับถอยหลัง: ≤ 3 วันสีแดง, ≤ 14 วันสีเน้น, ไกลกว่านั้นสีจาง
export function Countdown({ days }: { days: number }) {
  const tone =
    days <= 3
      ? "border-red-200 bg-red-50 text-red-700"
      : days <= 14
        ? "border-accent/30 bg-accent/5 text-accent"
        : "border-line text-muted";
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${tone}`}>
      {countdownLabel(days)}
    </span>
  );
}
