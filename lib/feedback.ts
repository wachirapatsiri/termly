// ตัวเลือกในฟอร์มความเห็น (ตรงกับ check constraint ใน migration 0006)
import { PRO_PRICES } from "./plans.ts";

export const MAX_NOTE_LENGTH = 1000;
export const MAX_MESSAGE_LENGTH = 2000;

export const AI_ACCURACY_OPTIONS = [
  { value: "mostly_right", label: "ถูกเกือบหมด" },
  { value: "some_fixes", label: "ต้องแก้บ้าง" },
  { value: "many_wrong", label: "ผิดเยอะ" },
  { value: "not_tried", label: "ยังไม่ได้ลอง" },
] as const;

export const PRICE_OPTIONS = [
  ...PRO_PRICES.map((p) => ({ value: String(p), label: `${p} บาท/เทอม` })),
  { value: "free", label: "ใช้แค่แบบฟรีก็พอ" },
] as const;

export const EMAIL_LOGIN_OPTIONS = [
  { value: "want", label: "อยากให้มี" },
  { value: "google_ok", label: "Google อย่างเดียวพอแล้ว" },
] as const;

export type FeedbackInput = {
  rating: number | null;
  rating_note: string | null;
  ai_accuracy: string | null;
  ai_note: string | null;
  price: string | null;
  price_note: string | null;
  email_login: string | null;
  login_note: string | null;
  message: string | null;
};

type Get = (name: string) => unknown;

function text(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

function choice(v: unknown, options: readonly { value: string }[]): string | null {
  return typeof v === "string" && options.some((o) => o.value === v) ? v : null;
}

// อ่านค่าจากฟอร์ม → ค่าที่บันทึกได้ (ค่าแปลก = ไม่ตอบข้อนั้น) + บอกว่าว่างทั้งฟอร์มไหม
export function parseFeedback(get: Get): { input: FeedbackInput; empty: boolean } {
  const r = Number(get("rating"));
  const input: FeedbackInput = {
    rating: Number.isInteger(r) && r >= 1 && r <= 5 ? r : null,
    rating_note: text(get("rating_note"), MAX_NOTE_LENGTH),
    ai_accuracy: choice(get("ai_accuracy"), AI_ACCURACY_OPTIONS),
    ai_note: text(get("ai_note"), MAX_NOTE_LENGTH),
    price: choice(get("price"), PRICE_OPTIONS),
    price_note: text(get("price_note"), MAX_NOTE_LENGTH),
    email_login: choice(get("email_login"), EMAIL_LOGIN_OPTIONS),
    login_note: text(get("login_note"), MAX_NOTE_LENGTH),
    message: text(get("message"), MAX_MESSAGE_LENGTH),
  };
  const empty = Object.values(input).every((v) => v === null);
  return { input, empty };
}
