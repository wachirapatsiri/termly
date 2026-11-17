"use client";

import { createContext, useContext } from "react";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n";
import { t, type MessageKey } from "@/lib/messages";

// ส่งภาษาของแอปให้ client component ในหน้า (เหมือน YearModeProvider) — ครอบด้วย <WithLang> ในแต่ละหน้า
const LangContext = createContext<Lang>(DEFAULT_LANG);

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext value={lang}>{children}</LangContext>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

// const tr = useT(); tr("task.add")
export function useT() {
  const lang = useLang();
  return (key: MessageKey, vars?: Record<string, string | number>) => t(lang, key, vars);
}
