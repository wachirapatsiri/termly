// ธีมสี: ตามมือถือ/คอม (system) / สว่าง / มืด — ผู้ใช้เลือกที่หน้า ⚙
// ค่าจริงของสีอยู่ใน app/globals.css (:root / [data-theme="dark"] / prefers-color-scheme)
export type ThemeMode = "system" | "light" | "dark";

// cookie นี้ต้องให้ JavaScript อ่านได้ (ไม่ใช่ httpOnly) — สคริปต์ใน <head> อ่านเพื่อใส่ธีมก่อนหน้าเว็บขึ้น กันจอกะพริบ
export const THEME_COOKIE = "theme";
export const DEFAULT_THEME: ThemeMode = "system";

export const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: "system", label: "ตามเครื่อง", icon: "📱" },
  { value: "light", label: "สว่าง", icon: "☀️" },
  { value: "dark", label: "มืด", icon: "🌙" },
];

export function isThemeMode(v: unknown): v is ThemeMode {
  return v === "system" || v === "light" || v === "dark";
}

// ใส่/เอาออก data-theme บน <html> (ฝั่งเบราว์เซอร์) — system = ไม่ใส่ ให้ CSS ดูตามเครื่องเอง
export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "system") delete root.dataset.theme;
  else root.dataset.theme = mode;
}

// สคริปต์เล็ก ๆ ที่รันใน <head> ก่อนหน้าเว็บแสดง: อ่าน cookie แล้วใส่ data-theme
export const THEME_INIT_SCRIPT = `try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark)(?:;|$)/);if(m)document.documentElement.dataset.theme=m[1]}catch(e){}`;
