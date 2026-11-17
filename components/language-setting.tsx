"use client";

import { useOptimistic, useTransition } from "react";
import { setLanguage } from "@/app/settings/actions";
import { LANG_OPTIONS, type Lang } from "@/lib/i18n";

function useChoose(current: Lang) {
  const [lang, setOptimistic] = useOptimistic(current);
  const [pending, startTransition] = useTransition();
  const choose = (value: Lang) =>
    startTransition(async () => {
      setOptimistic(value);
      document.documentElement.lang = value;
      const fd = new FormData();
      fd.set("lang", value);
      await setLanguage(fd);
    });
  return { lang, pending, choose };
}

// ตัวเลือกภาษาในหน้า ⚙ (ปุ่มวิทยุเหมือนตัวเลือกธีม)
export function LanguageSetting({ current, legend, hint }: { current: Lang; legend: string; hint: string }) {
  const { lang, choose } = useChoose(current);
  return (
    <fieldset className="space-y-3">
      <legend className="font-medium">{legend}</legend>
      <div className="grid grid-cols-2 gap-2">
        {LANG_OPTIONS.map((o) => (
          <label
            key={o.value}
            className={`flex cursor-pointer items-center justify-center rounded-card border bg-surface px-2 py-3 text-sm transition active:scale-95 ${
              lang === o.value ? "border-accent text-accent" : "border-line"
            }`}
          >
            <input
              type="radio"
              name="language"
              value={o.value}
              checked={lang === o.value}
              onChange={() => choose(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
      <p className="text-xs text-muted">{hint}</p>
    </fieldset>
  );
}

// ปุ่มสลับ ไทย | English ตัวเล็ก สำหรับหน้าแรก/หน้าเข้าสู่ระบบ (ยังไม่ล็อกอินก็เปลี่ยนได้ จำใน cookie)
export function LanguageSwitch({ current }: { current: Lang }) {
  const { lang, pending, choose } = useChoose(current);
  return (
    <div
      role="group"
      aria-label="Language"
      className={`inline-flex rounded-card border border-line bg-surface p-0.5 text-sm ${pending ? "opacity-70" : ""}`}
    >
      {LANG_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => choose(o.value)}
          aria-pressed={lang === o.value}
          className={`rounded-[calc(var(--radius-card)-2px)] px-3 py-1 transition-colors active:scale-95 ${
            lang === o.value ? "bg-accent text-white" : "text-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
