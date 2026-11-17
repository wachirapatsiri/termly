"use client";

import { useOptimistic, useTransition } from "react";
import { setYearMode } from "@/app/settings/actions";
import { useLang, useT } from "@/components/lang";
import { formatDue } from "@/lib/dates";
import { YEAR_MODE_OPTIONS, type YearMode } from "@/lib/year-mode";

export function YearModeSetting({ current, sampleIso }: { current: YearMode; sampleIso: string }) {
  const lang = useLang();
  const tr = useT();
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
      <legend className="font-medium">{tr("set.year.legend")}</legend>
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
            <span className="flex-1">{tr(`opt.year.${o.value}`)}</span>
            <span className="text-sm text-muted">{formatDue(sampleIso, false, o.value, lang)}</span>
          </label>
        ))}
      </div>
      <p className="text-xs text-muted">
        {tr("set.year.hint")}
      </p>
    </fieldset>
  );
}
