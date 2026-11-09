"use client";

import { useOptimistic, useTransition } from "react";
import { setTheme } from "@/app/settings/actions";
import { THEME_OPTIONS, applyTheme, type ThemeMode } from "@/lib/theme";

export function ThemeSetting({ current }: { current: ThemeMode }) {
  const [mode, setOptimisticMode] = useOptimistic(current);
  const [, startTransition] = useTransition();

  const choose = (value: ThemeMode) => {
    applyTheme(value); // เปลี่ยนทันที ไม่ต้องรอเซิร์ฟเวอร์
    startTransition(async () => {
      setOptimisticMode(value);
      const fd = new FormData();
      fd.set("mode", value);
      await setTheme(fd);
    });
  };

  return (
    <fieldset className="space-y-3">
      <legend className="font-medium">ธีมสี</legend>
      <div className="grid grid-cols-3 gap-2">
        {THEME_OPTIONS.map((o) => (
          <label
            key={o.value}
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-card border bg-surface px-2 py-3 text-sm transition active:scale-95 ${
              mode === o.value ? "border-accent text-accent" : "border-line"
            }`}
          >
            <input
              type="radio"
              name="theme"
              value={o.value}
              checked={mode === o.value}
              onChange={() => choose(o.value)}
              className="sr-only"
            />
            <span aria-hidden className="text-xl">
              {o.icon}
            </span>
            {o.label}
          </label>
        ))}
      </div>
      <p className="text-xs text-muted">
        &quot;ตามเครื่อง&quot; = มืด/สว่างตามที่ตั้งไว้ในมือถือหรือคอม · จำไว้กับบัญชี
      </p>
    </fieldset>
  );
}
