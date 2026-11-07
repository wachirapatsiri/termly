// คำตอบตัวอย่างสำหรับโหมดจำลอง: ถอดจากเอกสารจริงที่ผู้ใช้ส่งมา (Claude ในแชทอ่านตามกติกาใน prompt.ts)
// วางข้อความจากเอกสารเหล่านี้ในหน้า /import → ได้งานชุดนี้ (ไม่ต้องเรียก AI ไม่เสียเงิน)
// เก็บเฉพาะชื่องาน/วิชา/วันที่ ไม่มีข้อมูลส่วนตัว (ชื่ออาจารย์, อีเมล, เบอร์โทร)
import type { AiTask } from "./schema.ts";

type DemoSet = {
  label: string; // ชื่อไฟล์ที่แสดงให้ผู้ใช้รู้ว่าแอปจับได้ว่าเป็นเอกสารไหน
  // เจอ "ทุกคำ" ในกลุ่มใดกลุ่มหนึ่ง = ตรง (ไม่สนตัวพิมพ์เล็ก/ใหญ่)
  // มีหลายกลุ่มเผื่อข้อความที่ก๊อปจาก PDF ภาษาไทยเพี้ยน (เช่น สระ/วรรณยุกต์หาย)
  keywords: string[][];
  tasks: AiTask[];
};

const IP = { course_code: "204383", course_name: "Image Processing" };
const AI = { course_code: "204471", course_name: "Artificial Intelligence" };
const DE = { course_code: "204426", course_name: "Data Engineering" };
const PDS = { course_code: "229223", course_name: "Programming for Data Science" };

export const DEMO_SETS: DemoSet[] = [
  {
    label: "Canvas: 02 [Group] Vector to Raster Image",
    keywords: [["vector to raster"]],
    tasks: [
      {
        title: "02 [Group] Vector to Raster Image with Your Colors",
        kind: "homework",
        ...IP,
        due_date: "2026-07-03",
        due_time: "12:30",
        end_time: null,
        location: null,
        due_date_confidence: "high",
        raw_date_text: "Due: Fri, 3 Jul 2026 12:30",
        note: "งานกลุ่ม 1–3 คน ส่ง PNG + PDF โค้ด",
      },
    ],
  },
  {
    label: "Canvas: 04 (Individual) Spirits",
    keywords: [["spirits"]],
    tasks: [
      {
        title: "04 (Individual) Spirits",
        kind: "homework",
        ...IP,
        due_date: "2026-07-14",
        due_time: "16:00",
        end_time: null,
        location: null,
        due_date_confidence: "high",
        raw_date_text: "Due: Tue, 14 Jul 2026 16:00",
        note: "งานเดี่ยว ส่ง PDF จาก ipynb + รูปผลลัพธ์",
      },
    ],
  },
  {
    label: "Canvas: Lec #1 Data transformation",
    keywords: [["data transformation", "due"]],
    tasks: [
      {
        title: "Lec #1 Data transformation",
        kind: "homework",
        ...DE,
        due_date: "2026-07-19",
        due_time: "23:59",
        end_time: null,
        location: null,
        due_date_confidence: "high",
        raw_date_text: "Due: Sun, 19 Jul 2026 23:59",
        note: "ตอบด้วยลายมือ ส่ง jpg หรือ pdf",
      },
    ],
  },
  {
    label: "Canvas: HW07 Bayes Net",
    keywords: [["bayes net"]],
    tasks: [
      {
        title: "HW07 Bayes Net",
        kind: "homework",
        ...AI,
        due_date: "2026-09-14",
        due_time: "23:59",
        end_time: null,
        location: null,
        due_date_confidence: "high",
        raw_date_text: "Due: Mon, 14 Sep 2026 23:59",
        note: "ตอบด้วยลายมือ ส่ง PDF",
      },
    ],
  },
  {
    label: "Canvas: HW11 Learning",
    keywords: [["hw11"]],
    tasks: [
      {
        title: "HW11 Learning",
        kind: "homework",
        ...AI,
        due_date: "2026-10-09",
        due_time: "23:59",
        end_time: null,
        location: null,
        due_date_confidence: "high",
        raw_date_text: "Due: Fri, 9 Oct 2026 23:59",
        note: "ตอบด้วยลายมือ ส่ง PDF",
      },
    ],
  },
  {
    label: "ซิลลาบัส 204383 Image Processing",
    keywords: [
      ["204383", "สอบกลางภาค"],
      ["204383", "สอบไล"],
    ],
    tasks: [
      {
        title: "สอบกลางภาค",
        kind: "midterm",
        ...IP,
        due_date: "2026-08-28",
        due_time: "08:00",
        end_time: "11:00",
        location: null,
        due_date_confidence: "high",
        raw_date_text: "วันศุกร์ที่ 28 สิงหาคม พ.ศ. 2569 เวลา 8:00 – 11:00 น.",
        note: "Open-book",
      },
      {
        title: "สอบไล่ (ปลายภาค)",
        kind: "final",
        ...IP,
        due_date: "2026-10-25",
        due_time: "08:00",
        end_time: "11:00",
        location: null,
        due_date_confidence: "high",
        raw_date_text: "วันอาทิตย์ที่ 25 ตุลาคม พ.ศ. 2569 เวลา 8:00 – 11:00 น.",
        note: "Open-book",
      },
    ],
  },
  {
    label: "ซิลลาบัส 204471 Artificial Intelligence",
    keywords: [
      ["204471", "สอบกลางภาค"],
      ["204471", "วันสำคัญ"],
    ],
    tasks: [
      {
        title: "สอบกลางภาค",
        kind: "midterm",
        ...AI,
        due_date: "2026-08-30",
        due_time: "15:30",
        end_time: "18:30",
        location: null,
        due_date_confidence: "medium",
        raw_date_text: "วันอาทิตย์ที่ 30 สิงหาคม 15:30 - 18:30 น.",
        note: null,
      },
      {
        title: "สอบปลายภาค",
        kind: "final",
        ...AI,
        due_date: "2026-10-26",
        due_time: "08:00",
        end_time: "11:00",
        location: null,
        due_date_confidence: "medium",
        raw_date_text: "วันจันทร์ที่ 26 ตุลาคม 8:00 - 11:00 น.",
        note: null,
      },
      {
        title: "นำเสนองาน",
        kind: "presentation",
        ...AI,
        due_date: null,
        due_time: null,
        end_time: null,
        location: null,
        due_date_confidence: "low",
        raw_date_text: "สัปดาห์ที่ 15: 12 & 15 October (นำเสนอ)",
        note: "ตารางเรียน Tentative",
      },
    ],
  },
  {
    // เอกสารนี้ปีขัดกันเอง (หัวเอกสาร 2565 แต่วันสอบ 2567) → ระบบควรเตือนทุกรายการ
    label: "ซิลลาบัส 229223 Programming for Data Science (PDF)",
    // ซิลลาบัสวิชาอื่นอาจมี "229223" เป็นวิชาที่ต้องผ่านก่อน → ต้องเจอชื่อวิชาด้วย
    keywords: [
      ["229223", "programming for data science"],
      ["229223", "การโปรแกรม"],
    ],
    tasks: [
      ...(
        [
          ["Quiz 1: Function + Conditionals", "2024-07-03", "3 กรกฎาคม (ปฏิบัติการ) / Jul 03"],
          ["Quiz 2: Conditionals + String", "2024-07-24", "24 กรกฎาคม (ปฏิบัติการ) / Jul 24"],
          ["Quiz 3: Loop 1D / Recursion", "2024-09-25", "25 กันยายน (ปฏิบัติการ) / Sep 25"],
          ["Quiz 4: Nested Loop", "2024-10-09", "9 ตุลาคม (ปฏิบัติการ) / Oct 09"],
        ] as const
      ).map(
        ([title, date, raw]): AiTask => ({
          title,
          kind: "quiz",
          ...PDS,
          due_date: date,
          due_time: null,
          end_time: null,
          location: null,
          due_date_confidence: "medium",
          raw_date_text: raw,
          note: "Lab Quiz 5% (ไม่ระบุปี อนุมานจากปีสอบ 2567)",
        }),
      ),
      {
        title: "สอบกลางภาค",
        kind: "midterm",
        ...PDS,
        due_date: "2024-09-11",
        due_time: "09:00",
        end_time: "12:00",
        location: null,
        due_date_confidence: "high",
        raw_date_text: "สอบกลางภาค 11 กันยายน 2567 9:00-12:00",
        note: null,
      },
      {
        title: "สอบปลายภาค",
        kind: "final",
        ...PDS,
        due_date: "2024-10-20",
        due_time: "15:30",
        end_time: "18:30",
        location: null,
        due_date_confidence: "high",
        raw_date_text: "สอบปลายภาค 20 ตุลาคม 2567 15:30-18:30",
        note: null,
      },
    ],
  },
];

// หาเอกสารตัวอย่างที่ตรงกับข้อความที่วาง (วางหลายเอกสารพร้อมกันได้)
export function findDemoSets(text: string): DemoSet[] {
  const t = text.toLowerCase();
  return DEMO_SETS.filter((s) =>
    s.keywords.some((group) => group.every((k) => t.includes(k.toLowerCase()))),
  );
}
