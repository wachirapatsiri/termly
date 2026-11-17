"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createCourse,
  updateCourse,
  type CourseFormState,
} from "@/app/courses/actions";
import type { Course } from "@/lib/types";
import { ConfirmBox, DefaultSubmit } from "@/components/confirm-box";
import { useLang, useT } from "@/components/lang";
import {
  COURSE_COLOR_COUNT,
  courseColorName,
  colorVar,
  courseColorIndex,
  isCourseColor,
} from "@/lib/course-color";

const inputClass =
  "w-full rounded-card border border-line bg-surface px-3 py-2 text-base outline-none focus:border-accent";

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
  const lang = useLang();
  const tr = useT();
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
  // สีประจำวิชา: "" = อัตโนมัติ (ค่าตั้งต้น), "0"–"7" = เลือกเอง
  const savedColor = isCourseColor(course?.color) ? String(course.color) : "";
  const [color, setColor] = useState<string>(state.values?.color ?? savedColor);
  const autoIndex = course ? courseColorIndex({ id: course.id }) : 0;
  const similarLabel = similar ? [similar.code, similar.name].filter(Boolean).join(" ") : "";

  return (
    <form key={formKey} action={formAction} className="space-y-3">
      {/* ต้องอยู่ก่อนปุ่มอื่น: กด Enter = บันทึกปกติ ไม่ใช่ปุ่มในกล่องถาม */}
      <DefaultSubmit />
      {course && <input type="hidden" name="id" value={course.id} />}

      <div className="grid grid-cols-[1fr_7.5rem] gap-3">
        <label className="block space-y-1">
          <span className="text-sm text-muted">{tr("course.name")}</span>
          <input
            ref={nameRef}
            name="name"
            required
            maxLength={200}
            defaultValue={v.name}
            placeholder={tr("course.namePlaceholder")}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-muted">{tr("course.code")}</span>
          <input
            name="code"
            maxLength={50}
            defaultValue={v.code}
            placeholder={tr("course.codePlaceholder")}
            className={inputClass}
          />
        </label>
      </div>

      <fieldset className="space-y-1.5">
        <legend className="text-sm text-muted">{tr("course.color")}</legend>
        {/* ส่งเฉพาะตอนเปลี่ยนสี — ยังไม่ได้รัน migration 0005 ก็ยังแก้ชื่อ/รหัสวิชาได้ */}
        {color !== savedColor && <input type="hidden" name="color" value={color} />}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setColor("")}
            aria-pressed={color === ""}
            className={`rounded-full border px-2.5 py-1 text-xs transition active:scale-95 ${
              color === "" ? "border-accent text-accent" : "border-line text-muted"
            }`}
          >
            {tr("course.colorAuto")}
            {course && (
              <span
                aria-hidden
                className="ml-1.5 inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: colorVar(autoIndex) }}
              />
            )}
          </button>
          {Array.from({ length: COURSE_COLOR_COUNT }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setColor(String(i))}
              aria-label={tr("course.colorAria", { name: courseColorName(i, lang) })}
              aria-pressed={color === String(i)}
              className={`h-7 w-7 rounded-full transition active:scale-90 ${
                color === String(i)
                  ? "ring-2 ring-foreground ring-offset-2 ring-offset-surface"
                  : "hover:scale-110"
              }`}
              style={{ backgroundColor: colorVar(i) }}
            />
          ))}
        </div>
      </fieldset>

      {similar && (
        <ConfirmBox
          message={tr("course.similar", { label: similarLabel })}
          actions={
            course
              ? [{ intent: "add_anyway", label: tr("course.notSameSave"), primary: true }]
              : [
                  {
                    intent: `replace:${similar.id}`,
                    label: tr("course.replaceOld"),
                    primary: true,
                  },
                  { intent: "add_anyway", label: tr("course.notSameAdd") },
                ]
          }
          cancelLabel={course ? tr("course.cancel") : tr("course.useExisting")}
          onCancel={() => {
            setCancelled(state);
            if (!course) setFormKey((k) => k + 1);
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
          {pending ? tr("course.saving") : course ? tr("course.saveEdit") : tr("course.add")}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-card border border-line px-4 py-2.5"
          >
            {tr("course.cancel")}
          </button>
        )}
      </div>
    </form>
  );
}
