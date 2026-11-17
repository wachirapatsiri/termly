"use client";

import { useOptimistic, useTransition } from "react";
import { setCourseLabelMode } from "@/app/settings/actions";
import { useT } from "@/components/lang";
import {
  COURSE_LABEL_OPTIONS,
  courseLabel,
  type CourseLabelMode,
} from "@/lib/course-label";

// ตัวอย่างวิชาไว้แสดงพรีวิว (ใช้วิชาแรกของผู้ใช้ ถ้ามี)
export function CourseLabelSetting({
  current,
  sample,
}: {
  current: CourseLabelMode;
  sample: { name: string; code: string | null };
}) {
  const tr = useT();
  const [mode, setOptimisticMode] = useOptimistic(current);
  const [, startTransition] = useTransition();

  const choose = (value: CourseLabelMode) =>
    startTransition(async () => {
      setOptimisticMode(value);
      const fd = new FormData();
      fd.set("mode", value);
      await setCourseLabelMode(fd);
    });

  return (
    <fieldset className="space-y-3">
      <legend className="font-medium">{tr("set.courseLabel.legend")}</legend>
      <div className="space-y-2">
        {COURSE_LABEL_OPTIONS.map((o) => (
          <label
            key={o.value}
            className={`flex cursor-pointer items-center gap-3 rounded-card border bg-surface p-3 ${
              mode === o.value ? "border-accent" : "border-line"
            }`}
          >
            <input
              type="radio"
              name="mode"
              value={o.value}
              checked={mode === o.value}
              onChange={() => choose(o.value)}
              className="h-4 w-4 accent-accent"
            />
            <span className="flex-1">{tr(`opt.courseLabel.${o.value}`)}</span>
            <span className="text-sm text-muted">{courseLabel(sample, o.value)}</span>
          </label>
        ))}
      </div>
      <p className="text-xs text-muted">
        {tr("set.courseLabel.hint")}
      </p>
    </fieldset>
  );
}
