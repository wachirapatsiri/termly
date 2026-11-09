"use client";

import { useEffect } from "react";
import { THEME_COOKIE, applyTheme, type ThemeMode } from "@/lib/theme";

// ธีมที่บันทึกไว้กับบัญชี (user_settings) อาจต่างจาก cookie ในเครื่องนี้ เช่น เพิ่งตั้งจากอีกเครื่อง
// → ใส่ธีมตามบัญชี แล้วจำลง cookie ให้ครั้งหน้าสคริปต์ใน <head> ใส่ถูกตั้งแต่แรก (ไม่กะพริบ)
export function ThemeSync({ theme }: { theme: ThemeMode }) {
  useEffect(() => {
    const current = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`))?.[1];
    if (current === theme) return;
    applyTheme(theme);
    document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
  }, [theme]);
  return null;
}
