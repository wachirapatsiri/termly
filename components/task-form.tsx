"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import {
  createTask,
  updateTask,
  type TaskFormState,
} from "@/app/tasks/actions";
import { toBangkokParts } from "@/lib/dates";
import type { Course, Task } from "@/lib/types";

const inputClass =
  "w-full rounded-card border border-line bg-white px-3 py-2 text-base outline-none focus:border-accent";

// ฟอร์มเดียวใช้ทั้ง "เพิ่มงาน" (ไม่มี task) และ "แก้ไขงาน" (มี task)
export function TaskForm({
  task,
  courses,
  defaultCourseId,
  onSuccess,
  onCancel,
}: {
  task?: Task;
  courses: Course[];
  defaultCourseId?: string; // วิชาที่เลือกไว้ล่วงหน้า (เช่น ตอนกรองดูวิชาเดียว)

  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [state, formAction, pending] = useActionState<TaskFormState, FormData>(
    task ? updateTask : createTask,
    {},
  );

  useEffect(() => {
    if (state.ok) onSuccess?.();
  }, [state, onSuccess]);

  // ค่าเริ่มต้น: ถ้าบันทึกไม่ผ่านใช้ค่าที่เพิ่งกรอก, ถ้าแก้ไขใช้ค่าเดิมของงาน
  const due = task?.due_at ? toBangkokParts(task.due_at) : null;
  const v = state.values ?? {
    title: task?.title ?? "",
    due_date: due?.date ?? "",
    due_time: due && task?.due_has_time ? due.time : "",
    notes: task?.notes ?? "",
    course_id: task ? (task.course_id ?? "") : (defaultCourseId ?? ""),
  };

  return (
    <form action={formAction} className="space-y-3">
      {task && <input type="hidden" name="id" value={task.id} />}

      <label className="block space-y-1">
        <span className="text-sm text-muted">ชื่องาน</span>
        <input
          name="title"
          required
          maxLength={300}
          defaultValue={v.title}
          placeholder="เช่น รายงานบทที่ 3"
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-sm text-muted">วันส่ง</span>
          <input
            type="date"
            name="due_date"
            defaultValue={v.due_date}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-muted">เวลา (ไม่ใส่ก็ได้)</span>
          <input
            type="time"
            name="due_time"
            defaultValue={v.due_time}
            className={inputClass}
          />
        </label>
      </div>
      <p className="text-xs text-muted">
        ยังไม่รู้วันส่ง เว้นว่างไว้ได้ — งานจะขึ้นป้าย &quot;ยังไม่กำหนดวันส่ง&quot;
      </p>

      {courses.length === 0 && (
        <p className="text-sm text-muted">
          อยากผูกงานกับวิชา?{" "}
          <Link href="/courses" className="text-accent">
            เพิ่มวิชาก่อน
          </Link>
        </p>
      )}

      {courses.length > 0 && (
        <label className="block space-y-1">
          <span className="text-sm text-muted">วิชา</span>
          <select
            name="course_id"
            defaultValue={v.course_id}
            className={inputClass}
          >
            <option value="">— ไม่ระบุ —</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code ? `${c.code} ${c.name}` : c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block space-y-1">
        <span className="text-sm text-muted">หมายเหตุ</span>
        <textarea
          name="notes"
          rows={2}
          maxLength={2000}
          defaultValue={v.notes}
          className={inputClass}
        />
      </label>

      {state.error && (
        <p className="rounded-card border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-card bg-accent px-4 py-2.5 font-medium text-white disabled:opacity-60"
        >
          {pending ? "กำลังบันทึก…" : task ? "บันทึกการแก้ไข" : "เพิ่มงาน"}
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
