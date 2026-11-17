"use client";

import { useCallback, useOptimistic, useState } from "react";
import { deleteTask, setTaskDone } from "@/app/tasks/actions";
import { useYearMode } from "@/components/year-mode";
import { useLang, useT } from "@/components/lang";
import { formatDue } from "@/lib/dates";
import { courseLabel, type CourseLabelMode } from "@/lib/course-label";
import type { Course, Task, TaskCategory } from "@/lib/types";
import { TaskForm } from "@/components/task-form";
import { useTaskSelection } from "@/components/task-selection";
import { CourseDot } from "@/components/course-dot";
import { courseColor } from "@/lib/course-color";

export function TaskItem({
  task,
  course,
  courses,
  category,
  categories,
  overdue,
  labelMode,
}: {
  task: Task;
  course?: Course;
  courses: Course[];
  category?: TaskCategory;
  categories: TaskCategory[];
  labelMode: CourseLabelMode; // แสดงวิชาเป็นรหัส/ชื่อ ตามที่ตั้งค่าไว้
  overdue: boolean; // คำนวณฝั่งเซิร์ฟเวอร์ เพื่อให้ผลตรงกันทั้งสองฝั่ง
}) {
  const tr = useT();
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
      <li className="rounded-card border border-accent/40 bg-surface p-4">
        <TaskForm
          task={task}
          courses={courses}
          categories={categories}
          onSuccess={close}
          onCancel={close}
        />
      </li>
    );
  }

  // โหมดเลือกหลายรายการ: แตะทั้งการ์ดเพื่อเลือก/ไม่เลือก
  if (sel?.selecting) {
    const checked = sel.selected.has(task.id);
    return (
      <li>
        <label
          className={`flex cursor-pointer gap-3 rounded-card border bg-surface p-4 ${
            checked ? "border-accent bg-accent/5" : "border-line"
          }`}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={() => sel.toggle(task.id)}
            className="mt-1 h-5 w-5 shrink-0 accent-accent"
          />
          <TaskInfo
            task={task}
            course={course}
            category={category}
            overdue={overdue}
            done={done}
            labelMode={labelMode}
          />
        </label>
      </li>
    );
  }

  return (
    <li
      className={`flex gap-3 rounded-card border border-line bg-surface p-4 transition-opacity duration-300 motion-safe:animate-fade-in ${
        course ? "border-l-4" : ""
      } ${done ? "opacity-70" : ""}`}
      // แถบซ้ายสีประจำวิชา
      style={course ? { borderLeftColor: courseColor(course) } : undefined}
    >
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
          aria-label={done ? tr("task.markUndone") : tr("task.markDone")}
          className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border text-xs transition-colors hover:border-accent active:scale-90 ${
            done ? "border-accent bg-accent text-white motion-safe:animate-pop" : "border-muted/60"
          }`}
        >
          {done ? "✓" : ""}
        </button>
      </form>

      <div className="min-w-0 flex-1 space-y-1">
        <TaskInfo
          task={task}
          course={course}
          category={category}
          overdue={overdue}
          done={done}
          labelMode={labelMode}
        />

        <div className="flex gap-4 pt-1 text-sm">
          <button type="button" onClick={() => setEditing(true)} className="text-accent">
            {tr("task.edit")}
          </button>
          <form
            action={async (formData) => {
              setOptimisticRemoved(true);
              await deleteTask(formData);
            }}
            onSubmit={(e) => {
              if (!confirm(tr("task.confirmDelete", { title: task.title }))) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={task.id} />
            <button type="submit" className="text-danger">
              {tr("task.delete")}
            </button>
          </form>
        </div>
      </div>
    </li>
  );
}

// ชื่องาน + ประเภท + วันส่ง + วิชา + หมายเหตุ (ใช้ทั้งโหมดปกติและโหมดเลือก)
function TaskInfo({
  task,
  course,
  category,
  overdue,
  done,
  labelMode,
}: {
  task: Task;
  course?: Course;
  category?: TaskCategory;
  overdue: boolean;
  done: boolean;
  labelMode: CourseLabelMode;
}) {
  const yearMode = useYearMode();
  const lang = useLang();
  const tr = useT();
  return (
    <div className="min-w-0 flex-1 space-y-1">
      <p
        className={`font-medium break-words transition-colors ${done ? "text-muted line-through" : ""}`}
      >
        {task.title}
      </p>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {category && (
          <span className="rounded border border-line bg-background px-1.5 py-0.5 text-xs text-muted">
            {category.name}
          </span>
        )}
        {task.due_at ? (
          <span className={overdue && !done ? "text-danger" : "text-muted"}>
            {formatDue(task.due_at, task.due_has_time, yearMode, lang)}
            {overdue && !done && ` · ${tr("task.overdueSuffix")}`}
          </span>
        ) : (
          <span className="rounded border border-warn-line bg-warn-soft px-1.5 py-0.5 text-xs text-warn">
            {tr("task.noDueBadge")}
          </span>
        )}
        {course && (
          <span className="inline-flex items-center gap-1.5 text-muted">
            <CourseDot course={course} />
            {courseLabel(course, labelMode)}
          </span>
        )}
      </div>

      {task.notes && (
        <p className="text-sm whitespace-pre-line break-words text-muted">{task.notes}</p>
      )}
    </div>
  );
}
