// แพ็กเกจที่ "วางแผนไว้" — ยังไม่เก็บเงินจริง ใช้แสดงในหน้าความเห็นเพื่อถามราคา/ฟีเจอร์ที่อยากได้
// โควตา AI ผู้ใช้กำหนด 9 พ.ย.; ช่วงทดลองทุกคนได้ AI_DAILY_LIMIT (10) ครั้ง/วันรวมกัน ตาม lib/ai/limits.ts
// แนวคิด (ปรับ 9 พ.ย.): ฟรี = จดงานได้ครบทั้งเทอม (ให้ติดใช้), Pro = "ไม่พลาด deadline ทั้งเทอม" + ได้ฟีเจอร์ใหม่ก่อน
// ถ้าจะเปิดใช้จริง: เพิ่มคอลัมน์ plan + แยกนับ input_type text / pdf+image ใน lib/ai/usage.ts
import { t } from "./messages.ts";
import type { Lang } from "./i18n.ts";

export const PLAN_LIMITS = {
  free: { text: 5, file: 5 },
  pro: { text: 10, file: 20 },
} as const;

export const PRO_PRICES = [49, 79, 99] as const; // บาท/เทอม

// ฟีเจอร์ Pro ที่ถามในฟอร์มว่าอยากได้ไหน (ตรงกับ check constraint feedback.pro_features ใน migration 0006)
export const PRO_FEATURE_OPTIONS = [
  { value: "reminders", label: "แจ้งเตือนก่อนส่งงาน/สอบ" },
  { value: "calendar_sync", label: "ปฏิทินอัปเดตเองอัตโนมัติ" },
  { value: "grade_calc", label: "คำนวณ “ไฟนอลต้องได้เท่าไหร่”" },
  { value: "recurring", label: "งานที่ส่งซ้ำทุกสัปดาห์" },
  { value: "more_ai", label: "ใช้ AI ได้มากขึ้น" },
] as const;

export type PlanCell = string | boolean;

// แถวในตารางเทียบแพ็กเกจ: true = ได้, false = ไม่ได้, ข้อความ = รายละเอียด; soon = ยังไม่ได้ทำ
export function planFeatures(lang: Lang = "th"): { label: string; free: PlanCell; pro: PlanCell; soon?: boolean }[] {
  const unlimited = t(lang, "plan.unlimited");
  const perDay = (n: number) => t(lang, "plan.perDay", { n });
  return [
    { label: t(lang, "plan.row.basics"), free: unlimited, pro: unlimited },
    { label: t(lang, "plan.row.ics"), free: true, pro: true },
    { label: t(lang, "plan.row.aiText"), free: perDay(PLAN_LIMITS.free.text), pro: perDay(PLAN_LIMITS.pro.text) },
    { label: t(lang, "plan.row.aiFile"), free: perDay(PLAN_LIMITS.free.file), pro: perDay(PLAN_LIMITS.pro.file) },
    { label: t(lang, "plan.row.reminders"), free: false, pro: true, soon: true },
    { label: t(lang, "plan.row.calendarSync"), free: false, pro: true, soon: true },
    { label: t(lang, "plan.row.gradeCalc"), free: false, pro: true, soon: true },
    { label: t(lang, "plan.row.recurring"), free: false, pro: true, soon: true },
    { label: t(lang, "plan.row.future"), free: false, pro: t(lang, "plan.earlyAccess") },
  ];
}
