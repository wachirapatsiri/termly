// ภาษาของแอป: ไทย (ค่าตั้งต้น) / อังกฤษ — ข้อความอยู่ใน lib/messages.ts
export type Lang = "th" | "en";

export const LANG_COOKIE = "lang";
export const DEFAULT_LANG: Lang = "th";

export const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: "th", label: "ไทย" },
  { value: "en", label: "English" },
];

export function isLang(v: unknown): v is Lang {
  return v === "th" || v === "en";
}

// สคริปต์เล็ก ๆ ใน <head>: อ่าน cookie แล้วใส่ lang บน <html> ก่อนหน้าเว็บแสดง (ให้ screen reader/เบราว์เซอร์รู้ภาษา)
export const LANG_INIT_SCRIPT = `try{var m=document.cookie.match(/(?:^|; )${LANG_COOKIE}=(th|en)(?:;|$)/);if(m)document.documentElement.lang=m[1]}catch(e){}`;
