// แพ็กเกจที่ "วางแผนไว้" — ยังไม่เก็บเงินจริง ใช้แสดงในหน้าความเห็นเพื่อถามราคา/ฟีเจอร์ที่อยากได้
// โควตา AI ผู้ใช้กำหนด 9 พ.ย.; ช่วงทดลองทุกคนได้ AI_DAILY_LIMIT (10) ครั้ง/วันรวมกัน ตาม lib/ai/limits.ts
// แนวคิด (ปรับ 9 พ.ย.): ฟรี = จดงานได้ครบทั้งเทอม (ให้ติดใช้), Pro = "ไม่พลาด deadline ทั้งเทอม" + ได้ฟีเจอร์ใหม่ก่อน
// ถ้าจะเปิดใช้จริง: เพิ่มคอลัมน์ plan + แยกนับ input_type text / pdf+image ใน lib/ai/usage.ts
export const PLAN_LIMITS = {
  free: { text: 5, file: 5 },
  pro: { text: 10, file: 20 },
} as const;

export const PRO_PRICES = [49, 79, 99] as const; // บาท/เทอม

// ฟีเจอร์ Pro ที่ถามในฟอร์มว่าอยากได้ไหน (ตรงกับ check constraint feedback.pro_features ใน migration 0006)
export const PRO_FEATURE_OPTIONS = [
  { value: "reminders", icon: "🔔", label: "แจ้งเตือนก่อนส่งงาน/สอบ" },
  { value: "calendar_sync", icon: "📅", label: "ปฏิทินอัปเดตเองอัตโนมัติ" },
  { value: "grade_calc", icon: "🎯", label: "คำนวณ “ไฟนอลต้องได้เท่าไหร่”" },
  { value: "recurring", icon: "🔁", label: "งานที่ส่งซ้ำทุกสัปดาห์" },
  { value: "more_ai", icon: "✨", label: "ใช้ AI ได้มากขึ้น" },
] as const;

export type PlanCell = string | boolean;

// แถวในตารางเทียบแพ็กเกจ: true = ได้, false = ไม่ได้, ข้อความ = รายละเอียด; soon = ยังไม่ได้ทำ
export const PLAN_FEATURES: { label: string; free: PlanCell; pro: PlanCell; soon?: boolean }[] = [
  { label: "งาน · สอบ · วิชา · แผนรายสัปดาห์", free: "ไม่จำกัด", pro: "ไม่จำกัด" },
  { label: "ส่งออกไฟล์ปฏิทิน (.ics)", free: true, pro: true },
  {
    label: "AI อ่านข้อความที่วาง",
    free: `${PLAN_LIMITS.free.text} ครั้ง/วัน`,
    pro: `${PLAN_LIMITS.pro.text} ครั้ง/วัน`,
  },
  {
    label: "AI อ่าน PDF / รูปแคป",
    free: `${PLAN_LIMITS.free.file} ครั้ง/วัน`,
    pro: `${PLAN_LIMITS.pro.file} ครั้ง/วัน`,
  },
  { label: "🔔 แจ้งเตือนก่อนส่งงาน/สอบ", free: false, pro: true, soon: true },
  { label: "📅 ปฏิทินอัปเดตเอง ไม่ต้องส่งออกใหม่", free: false, pro: true, soon: true },
  { label: "🎯 คำนวณ “ไฟนอลต้องได้เท่าไหร่”", free: false, pro: true, soon: true },
  { label: "🔁 งานที่ส่งซ้ำทุกสัปดาห์", free: false, pro: true, soon: true },
  { label: "🚀 ฟีเจอร์ใหม่ที่เพิ่มในอนาคต", free: false, pro: "ได้ก่อน" },
];
