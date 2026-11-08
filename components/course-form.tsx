"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createCourse,
  updateCourse,
  type CourseFormState,
} from "@/app/courses/actions";
import type { Course } from "@/lib/types";
import { ConfirmBox, DefaultSubmit } from "@/components/confirm-box";

const inputClass =
  "w-full rounded-card border border-line bg-white px-3 py-2 text-base outline-none focus:border-accent";

// ฟอร์มเดียวใช้ทั้ง "เพิ่มวิชา" (ไม่มี course) และ "แก้ไขวิชา" (มี course)
export function CourseForm({
  course,
  onSuccess,
  onCancel,
}: {
  course?: Course;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [state, formAction, pending] = useActionState<CourseFormState, FormData>(
    course ? updateCourse : createCourse,
    {},
  );
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    onSuccess?.();
    // เพิ่มวิชาเสร็จ → เคอร์เซอร์กลับไปช่องชื่อ พร้อมเพิ่มวิชาถัดไปได้เลย
    if (!course) nameRef.current?.focus();
  }, [state, onSuccess, course]);

  // ยกเลิกในกล่องถามวิชาซ้ำ: เพิ่มใหม่ → ล้างฟอร์ม, แก้ไข → แค่ซ่อนกล่อง
  const [cancelled, setCancelled] = useState<CourseFormState | null>(null);
  const [formKey, setFormKey] = useState(0);
  const isCancelled = cancelled === state;
  const v = (isCancelled && !course ? undefined : state.values) ?? {
    name: course?.name ?? "",
    code: course?.code ?? "",
  };
  const similar = state.similar && !isCancelled ? state.similar : null;
  const similarLabel = similar ? [similar.code, similar.name].filter(Boolean).join(" ") : "";

  return (
    <form key={formKey} action={formAction} className="space-y-3">
      {/* ต้องอยู่ก่อนปุ่มอื่น: กด Enter = บันทึกปกติ ไม่ใช่ปุ่มในกล่องถาม */}
      <DefaultSubmit />
      {course && <input type="hidden" name="id" value={course.id} />}

      <div className="grid grid-cols-[1fr_7.5rem] gap-3">
        <label className="block space-y-1">
          <span className="text-sm text-muted">ชื่อวิชา</span>
          <input
            ref={nameRef}
            name="name"
            required
            maxLength={200}
            defaultValue={v.name}
            placeholder="เช่น สถิติเบื้องต้น"
            className={inputClass}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-muted">รหัสวิชา</span>
          <input
            name="code"
            maxLength={50}
            defaultValue={v.code}
            placeholder="ไม่ใส่ก็ได้"
            className={inputClass}
          />
        </label>
      </div>

      {similar && (
        <ConfirmBox
          message={
            <>
              มีวิชา “{similarLabel}” อยู่แล้ว (รหัสเดียวกันหรือชื่อคล้ายกัน) — เป็นวิชาเดียวกันไหม?
            </>
          }
          actions={
            course
              ? [{ intent: "add_anyway", label: "ไม่ใช่ บันทึกต่อ", primary: true }]
              : [
                  {
                    intent: `replace:${similar.id}`,
                    label: "ใช่ แก้วิชาเดิมเป็นชื่อนี้",
                    primary: true,
                  },
                  { intent: "add_anyway", label: "ไม่ใช่ เพิ่มเป็นวิชาใหม่" },
                ]
          }
          cancelLabel={course ? "ยกเลิก" : "ใช่ ใช้วิชาเดิม (ไม่เพิ่ม)"}
          onCancel={() => {
            setCancelled(state);
            if (!course) setFormKey((k) => k + 1);
          }}
        />
      )}

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
          {pending ? "กำลังบันทึก…" : course ? "บันทึกการแก้ไข" : "เพิ่มวิชา"}
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
