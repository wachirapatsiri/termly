"use client";

import { useOptimistic, useTransition } from "react";
import { setTheme } from "@/app/settings/actions";
import { useT } from "@/components/lang";
import { THEME_OPTIONS, applyTheme, type ThemeMode } from "@/lib/theme";

export function ThemeSetting({ current }: { current: ThemeMode }) {
  const tr = useT();
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
      <legend className="font-medium">{tr("set.theme.legend")}</legend>
      <div className="grid grid-cols-3 gap-2">
        {THEME_OPTIONS.map((o) => (
          <label
            key={o.value}
            className={`flex cursor-pointer items-center justify-center rounded-card border bg-surface px-2 py-3 text-sm transition active:scale-95 ${
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
            {tr(`opt.theme.${o.value}`)}
          </label>
        ))}
      </div>
      <p className="text-xs text-muted">
        {tr("set.theme.hint")}
      </p>
    </fieldset>
  );
}
