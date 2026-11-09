// แพ็กเกจที่ "วางแผนไว้" (ผู้ใช้กำหนด 9 พ.ย.) — ยังไม่เก็บเงินจริง ใช้แสดงในหน้าความเห็นเพื่อถามราคา
// ช่วงทดลองทุกคนได้ AI_DAILY_LIMIT (10) ครั้ง/วันรวมกัน ตาม lib/ai/limits.ts
// ถ้าจะเปิดใช้จริง: เพิ่มคอลัมน์ plan + แยกนับ input_type text / pdf+image ใน lib/ai/usage.ts
export const PLAN_LIMITS = {
  free: { text: 5, file: 5 },
  pro: { text: 10, file: 20 },
} as const;

export const PRO_PRICES = [49, 79, 99] as const; // บาท/เทอม

// แถวในตารางเทียบแพ็กเกจ: true = ได้, false = ไม่ได้, ข้อความ = รายละเอียด
export const PLAN_FEATURES: { label: string; free: string | boolean; pro: string | boolean; soon?: boolean }[] = [
  { label: "งาน · สอบ · วิชา (เพิ่มเอง)", free: "ไม่จำกัด", pro: "ไม่จำกัด" },
  { label: "แผนรายสัปดาห์ · ส่งออกปฏิทิน · ธีม", free: true, pro: true },
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
  { label: "ลิงก์ปฏิทินอัปเดตเอง", free: false, pro: true, soon: true },
  { label: "คำนวณเกรด “ไฟนอลต้องได้เท่าไหร่”", free: false, pro: true, soon: true },
];
