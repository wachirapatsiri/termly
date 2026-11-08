"use client";

import { createContext, useContext } from "react";
import { DEFAULT_YEAR_MODE, type YearMode } from "@/lib/year-mode";

// ส่งค่า "แสดงปีเป็น พ.ศ./ค.ศ." ให้ทุก component ฝั่ง client ในหน้า โดยไม่ต้องส่ง prop ต่อกันหลายชั้น
// ครอบด้วย <WithYearMode> (components/with-year-mode.tsx) ในแต่ละหน้า
const YearModeContext = createContext<YearMode>(DEFAULT_YEAR_MODE);

export function YearModeProvider({ mode, children }: { mode: YearMode; children: React.ReactNode }) {
  return <YearModeContext value={mode}>{children}</YearModeContext>;
}

export function useYearMode(): YearMode {
  return useContext(YearModeContext);
}
