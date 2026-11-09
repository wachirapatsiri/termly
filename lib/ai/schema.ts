// รูปแบบข้อมูลที่ AI ต้องตอบกลับ (ตรวจด้วย Zod)
// ใช้ทั้งเป็น "แบบฟอร์ม" ที่ส่งให้ Claude (structured output) และตรวจซ้ำฝั่งเรา
import { z } from "zod";
import { EXAM_TYPE_LABEL, type ExamType } from "../exams.ts";
import type { AiUsage } from "./usage.ts";

export const CONFIDENCE = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCE)[number];

// ประเภทรายการ: 3 แบบแรก = สอบ (บันทึกลงตาราง events) ที่เหลือ = งาน (บันทึกลง tasks)
export const ITEM_KINDS = [
  "midterm",
  "final",
  "exam_other",
  "homework",
  "quiz",
  "lab",
  "project",
  "report",
  "presentation",
  "other",
] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

// ชนิดสอบ + ชื่อภาษาไทย อยู่ที่ lib/exams.ts (ใช้ร่วมกับหน้า /exams)
export { EXAM_TYPE_LABEL, type ExamType };

// ประเภทของ AI → ชนิดสอบ (null = ไม่ใช่สอบ)
export function examTypeOf(kind: ItemKind): ExamType | null {
  if (kind === "midterm") return "midterm";
  if (kind === "final") return "final";
  if (kind === "exam_other") return "other";
  return null;
}

// ประเภทของ AI → ชื่อประเภทงานตั้งต้น (ตรงกับ supabase/migrations/0002)
export const KIND_CATEGORY: Record<Exclude<ItemKind, "midterm" | "final" | "exam_other">, string> = {
  homework: "การบ้าน",
  quiz: "Quiz",
  lab: "Lab",
  project: "โปรเจกต์",
  report: "รายงาน",
  presentation: "นำเสนอ",
  other: "อื่น ๆ",
};

export const AiTaskSchema = z.object({
  title: z.string().describe("ชื่องานหรือชื่อการสอบสั้น ๆ เช่น 'รายงานบทที่ 3', 'Quiz 2', 'สอบกลางภาค'"),
  kind: z
    .enum(ITEM_KINDS)
    .describe(
      "midterm = สอบกลางภาค, final = สอบปลายภาค/สอบไล่, exam_other = สอบอื่นตามตารางสอบ, homework = การบ้าน/แบบฝึกหัด, quiz = quiz ในคาบ, lab, project = โปรเจกต์, report = รายงาน, presentation = นำเสนอ, other = อื่น ๆ",
    ),
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
    .describe("วันส่ง (หรือวันสอบ) รูปแบบ YYYY-MM-DD ปี ค.ศ. เท่านั้น ถ้าไม่รู้วันแน่ชัดให้เป็น null"),
  due_time: z
    .string()
    .nullable()
    .describe("เวลาส่ง (หรือเวลาเริ่มสอบ) รูปแบบ HH:MM (24 ชม.) ถ้าเอกสารไม่ระบุเวลาให้เป็น null"),
  end_time: z
    .string()
    .nullable()
    .describe("เวลาสอบเสร็จ รูปแบบ HH:MM (เฉพาะสอบ) ถ้าไม่ระบุหรือไม่ใช่สอบให้เป็น null"),
  location: z
    .string()
    .nullable()
    .describe("สถานที่สอบ เช่น 'ห้อง 301 ตึก 30 ปี' (เฉพาะสอบ) ถ้าไม่ระบุให้เป็น null"),
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
  kind: ItemKind;
  course_code: string | null; // รหัสวิชาตามที่ AI อ่านได้
  course_name: string | null; // ชื่อวิชาตามที่ AI อ่านได้
  course_id: string | null; // จับคู่กับวิชาของผู้ใช้ได้ (ถ้ามี)
  due_date: string | null; // YYYY-MM-DD ค.ศ.
  due_time: string | null; // HH:MM (สอบ = เวลาเริ่ม)
  end_time: string | null; // HH:MM เวลาสอบเสร็จ (เฉพาะสอบ)
  location: string | null; // สถานที่สอบ
  confidence: Confidence;
  raw_date_text: string | null;
  note: string | null;
  warnings: string[]; // ข้อความเตือนภาษาไทย ให้ผู้ใช้ตรวจ
};

export type ExtractResponse =
  // mock_sources = ชื่อเอกสารตัวอย่างที่โหมดจำลองจับได้ (ว่าง = ใช้ชุดตัวอย่างทั่วไป)
  // mock_files = โหมดจำลองได้รับไฟล์แนบ แต่ยังอ่านไฟล์จริงไม่ได้
  | {
      ok: true;
      tasks: ExtractedTask[];
      mock: boolean;
      mock_sources?: string[];
      mock_files?: boolean;
      mock_reason?: string; // ทำไมเป็นโหมดจำลอง (ช่วยเช็กการตั้งค่า env)
      usage?: AiUsage; // ใช้ AI วันนี้ไปแล้วเท่าไร (ไม่มี = โหมดจำลอง)
      redacted?: { emails: number; phones: number }; // ข้อมูลส่วนตัวที่ตัดออกก่อนส่ง AI
    }
  | { ok: false; error: string; usage?: AiUsage };
