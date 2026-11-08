// ขีดจำกัดการใช้ AI (กันค่าใช้จ่ายบาน) — ดูกฎใน CLAUDE.md
export const AI_DAILY_LIMIT = 10; // ครั้ง/ผู้ใช้/วัน (นับจากตาราง ai_usage)
export const MAX_TEXT_LENGTH = 20_000; // ตัวอักษร (~ซิลลาบัส 5–8 หน้า)

// ไฟล์แนบ (เซสชัน 8): Vercel รับ body ได้ไม่เกิน 4.5 MB ต่อคำขอ → จำกัดรวม 4 MB (ผู้ใช้เลือก 8 พ.ย.)
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // ขนาดรวมทุกไฟล์ต่อครั้ง
export const MAX_IMAGES = 5; // รูปได้สูงสุด 5 รูป หรือ PDF 1 ไฟล์ ต่อการใช้ AI 1 ครั้ง
export const IMAGE_MAX_EDGE = 2000; // px — เบราว์เซอร์ย่อรูปก่อนส่ง (ไฟล์เล็ก ส่งเร็ว ใช้ token น้อย)
