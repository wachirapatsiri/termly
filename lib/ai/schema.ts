// รูปแบบข้อมูลที่ AI ต้องตอบกลับ (ตรวจด้วย Zod)
// ใช้ทั้งเป็น "แบบฟอร์ม" ที่ส่งให้ Claude (structured output) และตรวจซ้ำฝั่งเรา
import { z } from "zod";

export const CONFIDENCE = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCE)[number];

export const AiTaskSchema = z.object({
  title: z.string().describe("ชื่องานสั้น ๆ เช่น 'รายงานบทที่ 3', 'Quiz 2'"),
  course_code: z
    .string()
    .nullable()
    .describe("รหัสวิชาตัวเลข/ตัวอักษร เช่น '204383', 'CS101' ถ้าไม่มีให้เป็น null"),
  course_name: z
    .string()
    .nullable()
    .describe("ชื่อวิชา เช่น 'Image Processing' หรือ 'การประมวลผลภาพ' ถ้าไม่มีให้เป็น null"),
  due_date: z
    .string()
    .nullable()
    .describe("วันส่งรูปแบบ YYYY-MM-DD ปี ค.ศ. เท่านั้น ถ้าไม่รู้วันแน่ชัดให้เป็น null"),
  due_time: z
    .string()
    .nullable()
    .describe("เวลาส่งรูปแบบ HH:MM (24 ชม.) ถ้าเอกสารไม่ระบุเวลาให้เป็น null"),
  due_date_confidence: z
    .enum(CONFIDENCE)
    .describe("high = เขียนวันที่ชัดเจน, medium = ต้องอนุมานเล็กน้อย, low = ไม่ชัด/ต้องเดา"),
  raw_date_text: z
    .string()
    .nullable()
    .describe("ข้อความวันที่ตามต้นฉบับ เช่น 'ศุกร์หน้า', '15 พ.ย. 69', 'สัปดาห์ที่ 10'"),
  note: z.string().nullable().describe("รายละเอียดสั้น ๆ ที่สำคัญ เช่น ส่งทางไหน, กี่หน้า"),
});

export const AiResultSchema = z.object({
  tasks: z.array(AiTaskSchema),
});

export type AiTask = z.infer<typeof AiTaskSchema>;
export type AiResult = z.infer<typeof AiResultSchema>;

// รายการที่ผ่านการตรวจฝั่งเราแล้ว พร้อมส่งให้หน้าเว็บ
export type ExtractedTask = {
  title: string;
  course_code: string | null; // รหัสวิชาตามที่ AI อ่านได้
  course_name: string | null; // ชื่อวิชาตามที่ AI อ่านได้
  course_id: string | null; // จับคู่กับวิชาของผู้ใช้ได้ (ถ้ามี)
  due_date: string | null; // YYYY-MM-DD ค.ศ.
  due_time: string | null; // HH:MM
  confidence: Confidence;
  raw_date_text: string | null;
  note: string | null;
  warnings: string[]; // ข้อความเตือนภาษาไทย ให้ผู้ใช้ตรวจ
};

export type ExtractResponse =
  // mock_sources = ชื่อเอกสารตัวอย่างที่โหมดจำลองจับได้ (ว่าง = ใช้ชุดตัวอย่างทั่วไป)
  | { ok: true; tasks: ExtractedTask[]; mock: boolean; mock_sources?: string[] }
  | { ok: false; error: string };
