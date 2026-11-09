"use client";

import { useActionState, useEffect, useState } from "react";
import { createExam, updateExam, type ExamFormState } from "@/app/exams/actions";
import { toBangkokParts } from "@/lib/dates";
import { EXAM_TYPES, EXAM_TYPE_LABEL, type ExamType } from "@/lib/exams";
import type { CalendarEvent, Course } from "@/lib/types";
import { ConfirmBox, DefaultSubmit } from "@/components/confirm-box";

const inputClass =
  "w-full rounded-card border border-line bg-surface px-3 py-2 text-base outline-none focus:border-accent";

// ช่องที่ให้โฟกัสเมื่อเปิดฟอร์มจากป้าย "⚠ ไม่ระบุ…"
export type ExamField = "date" | "start_time" | "location";

// ฟอร์มเดียวใช้ทั้ง "เพิ่มสอบ" (ไม่มี exam) และ "แก้ไขสอบ" (มี exam)
export function ExamForm({
  exam,
  courses,
  focus,
  defaults,
  onSuccess,
  onCancel,
}: {
  exam?: CalendarEvent;
  courses: Course[];
  focus?: ExamField;
  // ค่าตั้งต้นตอนเพิ่มใหม่ (เช่น กด "+ เพิ่ม" จากการ์ดวิชา → เลือกวิชาและชนิดไว้ให้)
  defaults?: { exam_type?: ExamType; course_id?: string };
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [state, formAction, pending] = useActionState<ExamFormState, FormData>(
    exam ? updateExam : createExam,
    {},
  );

  useEffect(() => {
    if (state.ok) onSuccess?.();
  }, [state, onSuccess]);

  const start = exam?.starts_at ? toBangkokParts(exam.starts_at) : null;
  const end = exam?.ends_at ? toBangkokParts(exam.ends_at) : null;
  // "ไม่เพิ่ม" ในกล่องถามสอบซ้ำ → ซ่อนกล่อง + ล้างฟอร์ม (remount ด้วย key)
  const [cancelled, setCancelled] = useState<ExamFormState | null>(null);
  const [formKey, setFormKey] = useState(0);
  const isCancelled = cancelled === state;
  const v = (isCancelled ? undefined : state.values) ?? {
    exam_type: exam?.exam_type ?? defaults?.exam_type ?? "midterm",
    course_id: exam?.course_id ?? defaults?.course_id ?? "",
    title: exam?.title ?? "",
    date: start?.date ?? "",
    start_time: start && exam?.has_time ? start.time : "",
    end_time: end?.time ?? "",
    location: exam?.location ?? "",
    notes: exam?.notes ?? "",
  };

  return (
    <form key={formKey} action={formAction} className="space-y-3">
      {/* ต้องอยู่ก่อนปุ่มอื่น: กด Enter = บันทึกปกติ ไม่ใช่ปุ่มในกล่องถาม */}
      <DefaultSubmit />
      {exam && <input type="hidden" name="id" value={exam.id} />}

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-sm text-muted">ชนิดสอบ</span>
          <select name="exam_type" defaultValue={v.exam_type} className={inputClass}>
            {EXAM_TYPES.map((t) => (
              <option key={t} value={t}>
                {EXAM_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-muted">วิชา</span>
          <select name="course_id" defaultValue={v.course_id} className={inputClass}>
            <option value="">— ไม่ระบุ —</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code ? `${c.code} ${c.name}` : c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm text-muted">ชื่อ (ไม่ใส่ก็ได้)</span>
        <input
          name="title"
          maxLength={300}
          defaultValue={v.title}
          placeholder="ตั้งให้อัตโนมัติ เช่น สอบกลางภาค 204383"
          className={inputClass}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm text-muted">วันสอบ</span>
        <input
          type="date"
          name="date"
          defaultValue={v.date}
          autoFocus={focus === "date"}
          className={inputClass}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-sm text-muted">เวลาเริ่ม</span>
          <input
            type="time"
            name="start_time"
            defaultValue={v.start_time}
            autoFocus={focus === "start_time"}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-muted">เวลาจบ</span>
          <input type="time" name="end_time" defaultValue={v.end_time} className={inputClass} />
        </label>
      </div>
      <p className="text-xs text-muted">
        ยังไม่ประกาศวันหรือเวลา เว้นว่างไว้ได้ แล้วค่อยกลับมาเติม
      </p>

      <label className="block space-y-1">
        <span className="text-sm text-muted">สถานที่</span>
        <input
          name="location"
          maxLength={300}
          defaultValue={v.location}
          autoFocus={focus === "location"}
          placeholder="เช่น ห้อง 301 ตึก SCB1"
          className={inputClass}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm text-muted">หมายเหตุ</span>
        <textarea
          name="notes"
          rows={2}
          maxLength={2000}
          defaultValue={v.notes}
          placeholder="เช่น ขอบเขต บทที่ 1–5, ให้นำเครื่องคิดเลขได้"
          className={inputClass}
        />
      </label>

      {state.duplicate && !isCancelled && (
        <ConfirmBox
          message={<>มี “{state.duplicate}” อยู่แล้ว — ยังจะเพิ่มอีกไหม?</>}
          actions={[{ intent: "add_anyway", label: "เพิ่มต่อ" }]}
          onCancel={() => {
            setCancelled(state);
            setFormKey((k) => k + 1);
          }}
        />
      )}

      {state.error && (
        <p className="rounded-card border border-danger-line bg-danger-soft p-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-card bg-accent px-4 py-2.5 font-medium text-white disabled:opacity-60"
        >
          {pending ? "กำลังบันทึก…" : exam ? "บันทึกการแก้ไข" : "เพิ่มสอบ"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-card border border-line px-4 py-2.5"
          >
            ยกเลิก
          </button>
        )}
      </div>
    </form>
  );
}
