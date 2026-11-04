"use client";

import { useCallback, useState } from "react";
import { deleteTask, setTaskDone } from "@/app/tasks/actions";
import { formatDue } from "@/lib/dates";
import type { Course, Task } from "@/lib/types";
import { TaskForm } from "@/components/task-form";

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

  if (editing) {
    return (
      <li className="rounded-card border border-accent/40 bg-white p-4">
        <TaskForm task={task} courses={courses} onSuccess={close} onCancel={close} />
      </li>
    );
  }

  return (
    <li className="flex gap-3 rounded-card border border-line bg-white p-4">
      {/* ติ๊กเสร็จ / ยกเลิกเสร็จ */}
      <form action={setTaskDone}>
        <input type="hidden" name="id" value={task.id} />
        <input type="hidden" name="done" value={String(!task.done)} />
        <button
          type="submit"
          aria-label={task.done ? "ทำเครื่องหมายว่ายังไม่เสร็จ" : "ทำเครื่องหมายว่าเสร็จแล้ว"}
          className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border text-xs ${
            task.done ? "border-accent bg-accent text-white" : "border-muted/60"
          }`}
        >
          {task.done ? "✓" : ""}
        </button>
      </form>

      <div className="min-w-0 flex-1 space-y-1">
        <p className={`font-medium break-words ${task.done ? "text-muted line-through" : ""}`}>
          {task.title}
        </p>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {task.due_at ? (
            <span className={overdue ? "text-red-600" : "text-muted"}>
              {formatDue(task.due_at, task.due_has_time)}
              {overdue && " · เลยกำหนด"}
            </span>
          ) : (
            <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800">
              ⚠ ยังไม่กำหนดวันส่ง
            </span>
          )}
          {course && (
            <span className="text-muted">· {course.code || course.name}</span>
          )}
        </div>

        {task.notes && (
          <p className="text-sm whitespace-pre-line break-words text-muted">{task.notes}</p>
        )}

        <div className="flex gap-4 pt-1 text-sm">
          <button type="button" onClick={() => setEditing(true)} className="text-accent">
            แก้ไข
          </button>
          <form
            action={deleteTask}
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
