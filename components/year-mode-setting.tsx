"use client";

import { useOptimistic, useTransition } from "react";
import { setYearMode } from "@/app/settings/actions";
import { formatDue } from "@/lib/dates";
import { YEAR_MODE_OPTIONS, type YearMode } from "@/lib/year-mode";

export function YearModeSetting({ current, sampleIso }: { current: YearMode; sampleIso: string }) {
  const [mode, setOptimisticMode] = useOptimistic(current);
  const [, startTransition] = useTransition();

  const choose = (value: YearMode) =>
    startTransition(async () => {
      setOptimisticMode(value);
      const fd = new FormData();
      fd.set("mode", value);
      await setYearMode(fd);
    });

  return (
    <fieldset className="space-y-3">
      <legend className="font-medium">แสดงปีเป็น</legend>
      <div className="space-y-2">
        {YEAR_MODE_OPTIONS.map((o) => (
          <label
            key={o.value}
            className={`flex cursor-pointer items-center gap-3 rounded-card border bg-surface p-3 ${
              mode === o.value ? "border-accent" : "border-line"
            }`}
          >
            <input
              type="radio"
              name="year_mode"
              value={o.value}
              checked={mode === o.value}
              onChange={() => choose(o.value)}
              className="h-4 w-4 accent-accent"
            />
            <span className="flex-1">{o.label}</span>
            <span className="text-sm text-muted">{formatDue(sampleIso, false, o.value)}</span>
          </label>
        ))}
      </div>
      <p className="text-xs text-muted">
        เปลี่ยนเฉพาะวันที่ที่แสดงในแอป · ปฏิทินตอนเลือกวันที่ใช้ภาษาตามที่ตั้งไว้ในมือถือ ·
        AI อ่านเอกสารได้ทั้ง พ.ศ. และ ค.ศ. เหมือนเดิม
      </p>
    </fieldset>
  );
}
