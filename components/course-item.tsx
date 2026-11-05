"use client";

import Link from "next/link";
import { useCallback, useOptimistic, useState } from "react";
import { deleteCourse } from "@/app/courses/actions";
import type { Course } from "@/lib/types";
import { CourseForm } from "@/components/course-form";

export function CourseItem({
  course,
  pendingCount,
  totalCount,
}: {
  course: Course;
  pendingCount: number; // งานที่ยังไม่เสร็จในวิชานี้
  totalCount: number; // งานทั้งหมดในวิชานี้ (รวมที่เสร็จแล้ว)
}) {
  const [mode, setMode] = useState<"view" | "edit" | "confirmDelete">("view");
  const close = useCallback(() => setMode("view"), []);
  // ลบแล้วหายจากหน้าจอทันที ไม่ต้องรอเซิร์ฟเวอร์
  const [removed, setOptimisticRemoved] = useOptimistic(false);

  if (removed) return null;

  if (mode === "edit") {
    return (
      <li className="rounded-card border border-accent/40 bg-white p-4">
        <CourseForm course={course} onSuccess={close} onCancel={close} />
      </li>
    );
  }

  // ปุ่มลบ 1 แบบ (ส่ง delete_tasks ไปด้วย)
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

      {mode === "confirmDelete" ? (
        <div className="space-y-2 rounded-card border border-red-200 bg-red-50/50 p-3">
          <p className="text-sm">
            ลบวิชา &quot;{course.name}&quot;
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
            แก้ไข
          </button>
          <button
            type="button"
            onClick={() => setMode("confirmDelete")}
            className="text-red-600"
          >
            ลบ
          </button>
        </div>
      )}
    </li>
  );
}
