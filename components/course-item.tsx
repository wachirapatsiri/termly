"use client";

import Link from "next/link";
import { useCallback, useOptimistic, useState, useTransition } from "react";
import { deleteCourse, setCourseNoExam } from "@/app/courses/actions";
import { deleteTask, setTaskDone } from "@/app/tasks/actions";
import { useYearMode } from "@/components/year-mode";
import { formatDue } from "@/lib/dates";
import { EXAM_TYPE_LABEL, formatExamTime, type ExamType } from "@/lib/exams";
import type { CalendarEvent, Course } from "@/lib/types";
import { CourseForm } from "@/components/course-form";
import { ExamForm } from "@/components/exam-form";
import { EXAM_TYPE_TONE } from "@/lib/exam-display";

// งานค้างของวิชา (ข้อมูลเท่าที่การ์ดวิชาต้องใช้)
export type CourseTask = {
  id: string;
  title: string;
  due_at: string | null;
  due_has_time: boolean;
  overdue: boolean; // คำนวณฝั่งเซิร์ฟเวอร์
};

// สอบของวิชา (ข้อมูลเท่าที่การ์ดวิชาต้องใช้)
export type CourseExam = CalendarEvent & {
  past: boolean;
  overlapsWith: string[]; // สอบที่เวลาชนกัน (คำนวณฝั่งเซิร์ฟเวอร์)
};

export function CourseItem({
  course,
  courses,
  pendingTasks,
  totalCount,
  exams,
  similarTo,
}: {
  course: Course;
  courses: Course[]; // ไว้ให้ฟอร์มแก้สอบเลือกวิชาได้
  pendingTasks: CourseTask[]; // งานที่ยังไม่เสร็จในวิชานี้ (เรียงตามวันส่งแล้ว)
  totalCount: number; // งานทั้งหมดในวิชานี้ (รวมที่เสร็จแล้ว)
  exams: CourseExam[]; // สอบของวิชานี้ (เรียงตามวันแล้ว)
  similarTo?: Course; // วิชาที่น่าจะซ้ำกัน (รหัสเดียวกัน/ชื่อคล้าย)
}) {
  const yearMode = useYearMode();
  const [mode, setMode] = useState<"view" | "edit" | "confirmDelete">("view");
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setMode("view"), []);
  // ลบแล้วหายจากหน้าจอทันที ไม่ต้องรอเซิร์ฟเวอร์
  const [removed, setOptimisticRemoved] = useOptimistic(false);
  // งานที่เพิ่งติ๊กเสร็จ/ลบ → ซ่อนจากรายการทันที
  const [hiddenTasks, hideTask] = useOptimistic<Set<string>, string>(
    new Set(),
    (cur, id) => new Set([...cur, id]),
  );

  if (removed) return null;

  if (mode === "edit") {
    return (
      <li className="rounded-card border border-accent/40 bg-white p-4">
        <CourseForm course={course} onSuccess={close} onCancel={close} />
      </li>
    );
  }

  const visibleTasks = pendingTasks.filter((t) => !hiddenTasks.has(t.id));

  // ปุ่มลบวิชา 1 แบบ (ส่ง delete_tasks ไปด้วย)
  const deleteButton = (deleteTasks: boolean, label: string, className: string) => (
    <form
      action={async (formData) => {
        setOptimisticRemoved(true);
        await deleteCourse(formData);
      }}
    >
      <input type="hidden" name="id" value={course.id} />
      <input type="hidden" name="delete_tasks" value={String(deleteTasks)} />
      <button type="submit" className={`w-full rounded-card px-4 py-2.5 text-sm ${className}`}>
        {label}
      </button>
    </form>
  );

  return (
    <li className="space-y-3 rounded-card border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {course.code && <p className="text-sm text-muted">{course.code}</p>}
          <p className="font-medium break-words">{course.name}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`shrink-0 rounded border px-2 py-0.5 text-sm ${
            open ? "border-accent text-accent" : "border-line text-muted"
          }`}
        >
          งานค้าง {visibleTasks.length} {open ? "▴" : "▾"}
        </button>
      </div>

      {similarTo && (
        <p className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800">
          ⚠ อาจซ้ำกับวิชา {similarTo.code ? `${similarTo.code} ` : ""}
          {similarTo.name} — ถ้าเป็นวิชาเดียวกัน ลบอันที่ไม่ใช้ได้
        </p>
      )}

      {open && (
        <div className="space-y-2 border-t border-line pt-3">
          <h3 className="text-sm font-medium text-muted">งานค้าง</h3>
          {visibleTasks.length === 0 ? (
            <p className="text-sm text-muted">ไม่มีงานค้างในวิชานี้ 🎉</p>
          ) : (
            <ul className="space-y-1">
              {visibleTasks.map((t) => (
                <li key={t.id} className="flex items-start gap-3 py-1">
                  {/* ติ๊กว่าเสร็จ */}
                  <form
                    action={async (formData) => {
                      hideTask(t.id);
                      await setTaskDone(formData);
                    }}
                  >
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="done" value="true" />
                    <button
                      type="submit"
                      aria-label={`ทำเครื่องหมายว่า "${t.title}" เสร็จแล้ว`}
                      className="mt-0.5 h-5 w-5 rounded border border-muted/60"
                    />
                  </form>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm break-words">{t.title}</p>
                    {t.due_at ? (
                      <p className={`text-xs ${t.overdue ? "text-red-600" : "text-muted"}`}>
                        {formatDue(t.due_at, t.due_has_time, yearMode)}
                        {t.overdue && " · เลยกำหนด"}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-700">⚠ ยังไม่กำหนดวันส่ง</p>
                    )}
                  </div>

                  {/* ลบงาน */}
                  <form
                    action={async (formData) => {
                      hideTask(t.id);
                      await deleteTask(formData);
                    }}
                    onSubmit={(e) => {
                      if (!confirm(`ลบงาน "${t.title}" ?`)) e.preventDefault();
                    }}
                  >
                    <input type="hidden" name="id" value={t.id} />
                    <button
                      type="submit"
                      aria-label={`ลบงาน "${t.title}"`}
                      className="px-1 text-lg leading-none text-muted hover:text-red-600"
                    >
                      ×
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <Link href={`/tasks?course=${course.id}`} className="block text-sm text-accent">
            เพิ่ม/แก้งานของวิชานี้ในหน้างาน →
          </Link>

        </div>
      )}

      {/* สอบแสดงตลอด ไม่ต้องกด (กดกางเฉพาะงานค้าง) */}
      <CourseExams course={course} courses={courses} exams={exams} />

      {mode === "confirmDelete" ? (
        <div className="space-y-2 rounded-card border border-red-200 bg-red-50/50 p-3">
          <p className="text-sm">
            ลบวิชา &quot;{course.name}&quot;
            {exams.length > 0 && <> — สอบของวิชานี้ {exams.length} รายการจะถูกลบด้วย</>}
            {totalCount > 0 && <> — มีงานในวิชานี้ {totalCount} ชิ้น จะทำอย่างไรกับงาน?</>}
          </p>
          {totalCount > 0 ? (
            <>
              {deleteButton(false, "ลบแค่วิชา (เก็บงานไว้)", "border border-line bg-white")}
              {deleteButton(true, `ลบวิชาพร้อมงาน ${totalCount} ชิ้น`, "bg-red-600 text-white")}
            </>
          ) : (
            deleteButton(false, "ลบวิชา", "bg-red-600 text-white")
          )}
          <button
            type="button"
            onClick={close}
            className="w-full rounded-card px-4 py-2 text-sm text-muted"
          >
            ยกเลิก
          </button>
        </div>
      ) : (
        <div className="flex gap-4 text-sm">
          <button type="button" onClick={() => setMode("edit")} className="text-accent">
            แก้ไขวิชา
          </button>
          <button
            type="button"
            onClick={() => setMode("confirmDelete")}
            className="text-red-600"
          >
            ลบวิชา
          </button>
        </div>
      )}
    </li>
  );
}

// ส่วน "สอบ" ในการ์ดวิชา: กลางภาค/ปลายภาคเป็นหลัก บรรทัดละชนิด + สอบอื่น ๆ แยกด้านล่าง
function CourseExams({
  course,
  courses,
  exams,
}: {
  course: Course;
  courses: Course[];
  exams: CourseExam[];
}) {
  // ฟอร์มที่เปิดอยู่: id สอบที่กำลังแก้ หรือ "new:<ชนิด>" = กำลังเพิ่มสอบชนิดนั้น
  const [editing, setEditing] = useState<string | null>(null);
  const close = useCallback(() => setEditing(null), []);
  const formFor = (key: string, exam?: CourseExam, type?: ExamType) =>
    editing === key && (
      <div className="rounded-card border border-accent/40 bg-white p-3">
        <ExamForm
          exam={exam}
          courses={courses}
          defaults={{ exam_type: type, course_id: course.id }}
          onSuccess={close}
          onCancel={close}
        />
      </div>
    );
  // ติ๊ก "ไม่มีสอบ" แล้วเปลี่ยนบนจอทันที (บันทึกไม่ผ่าน → กลับค่าเดิม + ขึ้นข้อความ)
  const [noExam, setNoExam] = useOptimistic(
    { midterm: !!course.no_midterm, final: !!course.no_final },
    (cur, patch: Partial<Record<"midterm" | "final", boolean>>) => ({ ...cur, ...patch }),
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const ofType = (t: ExamType) => exams.filter((e) => (e.exam_type ?? "other") === t);
  const others = ofType("other");

  const toggle = (type: "midterm" | "final") => {
    const value = !noExam[type];
    setError(null);
    startTransition(async () => {
      setNoExam({ [type]: value });
      try {
        const res = await setCourseNoExam(course.id, type, value);
        if (!res.ok) setError(res.error);
      } catch {
        setError("บันทึกไม่สำเร็จ ลองรีเฟรชหน้าแล้วลองใหม่");
      }
    });
  };

  return (
    <div className="space-y-2 border-t border-line pt-3">
      <ul className="space-y-2">
        {(["midterm", "final"] as const).map((t) => {
          const list = ofType(t);
          const tone = EXAM_TYPE_TONE[t];
          return (
            <li key={t} className="space-y-2">
              <div className="flex items-start gap-2">
                <span className={`shrink-0 rounded border px-1.5 py-0.5 text-xs ${tone.badge}`}>
                  {EXAM_TYPE_LABEL[t].replace("สอบ", "")}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  {list.length > 0 ? (
                    list.map((e) => (
                      <ExamLine key={e.id} exam={e} onEdit={() => setEditing(e.id)} />
                    ))
                  ) : (
                    // ยังไม่มีข้อมูล → ไม่เตือน แค่ให้ติ๊กได้ว่าไม่มีสอบ
                    <div className="flex items-center justify-between gap-2 text-sm text-muted">
                      <span>
                        {noExam[t] ? `ไม่มี${EXAM_TYPE_LABEL[t]}` : "ยังไม่มีข้อมูล"}
                        {!noExam[t] && (
                          <button
                            type="button"
                            onClick={() => setEditing(`new:${t}`)}
                            className="ml-2 text-accent"
                          >
                            + เพิ่ม
                          </button>
                        )}
                      </span>
                      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={noExam[t]}
                          disabled={pending}
                          onChange={() => toggle(t)}
                          className="h-4 w-4 accent-accent"
                        />
                        ไม่มีสอบ
                      </label>
                    </div>
                  )}
                </div>
              </div>
              {formFor(`new:${t}`, undefined, t)}
              {list.map((e) => <div key={e.id}>{formFor(e.id, e)}</div>)}
            </li>
          );
        })}
        {others.length > 0 && (
          <li className="flex items-start gap-2">
            <span
              className={`shrink-0 rounded border px-1.5 py-0.5 text-xs ${EXAM_TYPE_TONE.other.badge}`}
            >
              อื่น ๆ
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              {others.map((e) => (
                <ExamLine key={e.id} exam={e} showTitle onEdit={() => setEditing(e.id)} />
              ))}
            </div>
          </li>
        )}
        {others.map((e) => (
          <li key={`form-${e.id}`} className="empty:hidden">
            {formFor(e.id, e)}
          </li>
        ))}
        <li className="space-y-2">
          {editing !== "new:other" && (
            <button
              type="button"
              onClick={() => setEditing("new:other")}
              className="text-xs text-accent"
            >
              + เพิ่มสอบอื่น ๆ (Quiz ใหญ่, สอบย่อย)
            </button>
          )}
          {formFor("new:other", undefined, "other")}
        </li>
      </ul>
      {error && (
        <p role="alert" className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function ExamLine({
  exam,
  showTitle,
  onEdit,
}: {
  exam: CourseExam;
  showTitle?: boolean;
  onEdit: () => void;
}) {
  const yearMode = useYearMode();
  const time = formatExamTime(exam);
  return (
    <div className={`space-y-0.5 text-sm ${exam.past ? "text-muted" : ""}`}>
      {showTitle && <p className="break-words">{exam.title}</p>}
      <p>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`แก้ไข ${exam.title}`}
          className="float-right ml-2 text-xs text-accent"
        >
          แก้ไข
        </button>
        {exam.starts_at ? formatDue(exam.starts_at, false, yearMode) : (
          <span className="text-amber-700">⚠ ยังไม่ประกาศวันสอบ</span>
        )}
        {time && <span className="text-muted"> · {time}</span>}
        {exam.past && " · สอบแล้ว"}
      </p>
      {exam.location && <p className="text-xs text-muted">📍 {exam.location}</p>}
      {exam.overlapsWith.length > 0 && !exam.past && (
        <p className="text-xs text-red-700">⚠ เวลาชนกับ {exam.overlapsWith.join(", ")}</p>
      )}
    </div>
  );
}
