"use client";

import { useCallback, useOptimistic, useState } from "react";
import { deleteTask, setTaskDone } from "@/app/tasks/actions";
import { formatDue } from "@/lib/dates";
import type { Course, Task } from "@/lib/types";
import { TaskForm } from "@/components/task-form";
import { useTaskSelection } from "@/components/task-selection";

export function TaskItem({
  task,
  course,
  courses,
  overdue,
}: {
  task: Task;
  course?: Course;
  courses: Course[];
  overdue: boolean; // คำนวณฝั่งเซิร์ฟเวอร์ เพื่อให้ผลตรงกันทั้งสองฝั่ง
}) {
  const [editing, setEditing] = useState(false);
  const close = useCallback(() => setEditing(false), []);

  // Optimistic UI: เปลี่ยนหน้าจอทันทีที่กด ไม่ต้องรอเซิร์ฟเวอร์
  // ถ้าเซิร์ฟเวอร์บันทึกไม่สำเร็จ หน้าจอจะกลับเป็นค่าจริงเองหลังโหลดข้อมูลใหม่
  const [ownDone, setOptimisticDone] = useOptimistic(task.done);
  const [removed, setOptimisticRemoved] = useOptimistic(false);
  const sel = useTaskSelection();
  const done = ownDone || !!sel?.doneIds.has(task.id);

  if (removed || sel?.hidden.has(task.id)) return null;

  if (editing) {
    return (
      <li className="rounded-card border border-accent/40 bg-white p-4">
        <TaskForm task={task} courses={courses} onSuccess={close} onCancel={close} />
      </li>
    );
  }

  // โหมดเลือกหลายรายการ: แตะทั้งการ์ดเพื่อเลือก/ไม่เลือก
  if (sel?.selecting) {
    const checked = sel.selected.has(task.id);
    return (
      <li>
        <label
          className={`flex cursor-pointer gap-3 rounded-card border bg-white p-4 ${
            checked ? "border-accent bg-accent/5" : "border-line"
          }`}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={() => sel.toggle(task.id)}
            className="mt-1 h-5 w-5 shrink-0 accent-accent"
          />
          <TaskInfo task={task} course={course} overdue={overdue} done={done} />
        </label>
      </li>
    );
  }

  return (
    <li className="flex gap-3 rounded-card border border-line bg-white p-4">
      {/* ติ๊กเสร็จ / ยกเลิกเสร็จ */}
      <form
        action={async (formData) => {
          setOptimisticDone(!done);
          await setTaskDone(formData);
        }}
      >
        <input type="hidden" name="id" value={task.id} />
        <input type="hidden" name="done" value={String(!done)} />
        <button
          type="submit"
          aria-label={done ? "ทำเครื่องหมายว่ายังไม่เสร็จ" : "ทำเครื่องหมายว่าเสร็จแล้ว"}
          className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border text-xs ${
            done ? "border-accent bg-accent text-white" : "border-muted/60"
          }`}
        >
          {done ? "✓" : ""}
        </button>
      </form>

      <div className="min-w-0 flex-1 space-y-1">
        <TaskInfo task={task} course={course} overdue={overdue} done={done} />

        <div className="flex gap-4 pt-1 text-sm">
          <button type="button" onClick={() => setEditing(true)} className="text-accent">
            แก้ไข
          </button>
          <form
            action={async (formData) => {
              setOptimisticRemoved(true);
              await deleteTask(formData);
            }}
            onSubmit={(e) => {
              if (!confirm(`ลบงาน "${task.title}" ?`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={task.id} />
            <button type="submit" className="text-red-600">
              ลบ
            </button>
          </form>
        </div>
      </div>
    </li>
  );
}

// ชื่องาน + วันส่ง + วิชา + หมายเหตุ (ใช้ทั้งโหมดปกติและโหมดเลือก)
function TaskInfo({
  task,
  course,
  overdue,
  done,
}: {
  task: Task;
  course?: Course;
  overdue: boolean;
  done: boolean;
}) {
  return (
    <div className="min-w-0 flex-1 space-y-1">
      <p className={`font-medium break-words ${done ? "text-muted line-through" : ""}`}>
        {task.title}
      </p>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {task.due_at ? (
          <span className={overdue && !done ? "text-red-600" : "text-muted"}>
            {formatDue(task.due_at, task.due_has_time)}
            {overdue && !done && " · เลยกำหนด"}
          </span>
        ) : (
          <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800">
            ⚠ ยังไม่กำหนดวันส่ง
          </span>
        )}
        {course && <span className="text-muted">· {course.code || course.name}</span>}
      </div>

      {task.notes && (
        <p className="text-sm whitespace-pre-line break-words text-muted">{task.notes}</p>
      )}
    </div>
  );
}
