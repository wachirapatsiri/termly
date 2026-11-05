"use client";

import Link from "next/link";
import { useCallback, useOptimistic, useState } from "react";
import { deleteCourse } from "@/app/courses/actions";
import type { Course } from "@/lib/types";
import { CourseForm } from "@/components/course-form";

export function CourseItem({
  course,
  pendingCount,
}: {
  course: Course;
  pendingCount: number; // จำนวนงานที่ยังไม่เสร็จในวิชานี้
}) {
  const [editing, setEditing] = useState(false);
  const close = useCallback(() => setEditing(false), []);
  // ลบแล้วหายจากหน้าจอทันที ไม่ต้องรอเซิร์ฟเวอร์
  const [removed, setOptimisticRemoved] = useOptimistic(false);

  if (removed) return null;

  if (editing) {
    return (
      <li className="rounded-card border border-accent/40 bg-white p-4">
        <CourseForm course={course} onSuccess={close} onCancel={close} />
      </li>
    );
  }

  return (
    <li className="space-y-2 rounded-card border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {course.code && <p className="text-sm text-muted">{course.code}</p>}
          <p className="font-medium break-words">{course.name}</p>
        </div>
        <Link
          href={`/tasks?course=${course.id}`}
          className="shrink-0 rounded border border-line px-2 py-0.5 text-sm text-muted"
        >
          งานค้าง {pendingCount}
        </Link>
      </div>

      <div className="flex gap-4 text-sm">
        <button type="button" onClick={() => setEditing(true)} className="text-accent">
          แก้ไข
        </button>
        <form
          action={async (formData) => {
            setOptimisticRemoved(true);
            await deleteCourse(formData);
          }}
          onSubmit={(e) => {
            const msg = `ลบวิชา "${course.name}" ?\nงานในวิชานี้จะยังอยู่ แค่ไม่ผูกกับวิชาแล้ว`;
            if (!confirm(msg)) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={course.id} />
          <button type="submit" className="text-red-600">
            ลบ
          </button>
        </form>
      </div>
    </li>
  );
}
