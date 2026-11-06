// ตรวจคำตอบตัวอย่างของโหมดจำลอง (ถอดจากเอกสารจริงของผู้ใช้) — npm run test:ai-unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEMO_SETS, findDemoSets } from "../lib/ai/demo-samples.ts";
import { normalizeTasks } from "../lib/ai/normalize.ts";
import { AiResultSchema } from "../lib/ai/schema.ts";

const TODAY = "2026-11-06";

test("ทุกชุดผ่าน Zod schema", () => {
  for (const s of DEMO_SETS) {
    assert.ok(AiResultSchema.safeParse({ tasks: s.tasks }).success, s.label);
  }
});

test("วันในสัปดาห์ในต้นฉบับตรงกับวันที่ทุกรายการ", () => {
  for (const s of DEMO_SETS) {
    for (const t of normalizeTasks(s.tasks, [], TODAY)) {
      assert.ok(!t.warnings.some((w) => w.includes("วันในสัปดาห์")), `${s.label}: ${t.title}`);
    }
  }
});

test("จับเอกสารจากข้อความที่วาง", () => {
  const pick = (text: string) => findDemoSets(text).map((s) => s.label);
  assert.deepEqual(pick("HW07 Bayes Net Due: Mon, 14 Sep 2026 23:59"), ["Canvas: HW07 Bayes Net"]);
  assert.deepEqual(pick("Lec #1 Data transformation\nDue: Sun, 19 Jul 2026 23:59"), [
    "Canvas: Lec #1 Data transformation",
  ]);
  assert.deepEqual(pick("229223 การโปรแกรมสา หรบัวิทยาการข้อมลู (Programming for Data Science)"), [
    "ซิลลาบัส 229223 Programming for Data Science (PDF)",
  ]);
  assert.equal(pick("HW11 Learning ... 04 (Individual) Spirits").length, 2); // วางหลายเอกสาร
  assert.deepEqual(pick("ข้อความอื่น ๆ"), []);
});

test("วางซิลลาบัสทั้งหน้า ไม่ดึงวิชาอื่นที่ถูกอ้างถึงปนมา", () => {
  const ip = `Course Syllabus of 204383 Image Processing in Semester 1/2569 B.E.
วิชา ว.คพ. 383 (204383) การประมวลผลภาพ (Image Processing)
เงื่อนไขที่ต้องผ่านก่อน (Prerequisite) 204203 or 204212 or 229223; and 206111
วันเรียน อังคาร และ ศุกร์ 11:00 – 12:30 น.
1. สอบกลางภาค วันศุกร์ที่ 28 สิงหาคม พ.ศ. 2569 เวลา 8:00 – 11:00 น.
2. สอบไล่ วันอาทิตย์ที่ 25 ตุลาคม พ.ศ. 2569 เวลา 8:00 – 11:00 น.`;
  assert.deepEqual(
    findDemoSets(ip).map((s) => s.label),
    ["ซิลลาบัส 204383 Image Processing"],
  );
  // ก๊อปจาก PDF แล้ววรรณยุกต์หาย ก็ยังจับได้
  assert.equal(findDemoSets("204383 ... สอบไล วันอาทิตย").length, 1);

  const ai = `Course syllabus
204471: Artificial Intelligence
วันสำคัญ
สอบกลางภาค: วันอาทิตย์ที่ 30 สิงหาคม 15:30 - 18:30 น.
สอบปลายภาค: วันจันทร์ที่ 26 ตุลาคม 8:00 - 11:00 น.
13 | 28 September & 1 October | Learning`;
  assert.deepEqual(
    findDemoSets(ai).map((s) => s.label),
    ["ซิลลาบัส 204471 Artificial Intelligence"],
  );
});

test("หน้างาน Canvas ที่มีเมนู Syllabus ไม่ถูกนับเป็นซิลลาบัส", () => {
  const page = "204471-Artificial Intelligence > Assignments > HW07 Bayes Net\nSyllabus\nDue: Mon, 14 Sep 2026 23:59";
  assert.deepEqual(findDemoSets(page).map((s) => s.label), ["Canvas: HW07 Bayes Net"]);
});

test("229223 (ปีขัดกันเอง) ถูกเตือนทุกรายการ", () => {
  const [pds] = findDemoSets("229223 Programming for Data Science");
  const out = normalizeTasks(pds.tasks, [], TODAY);
  assert.equal(out.length, 6);
  for (const t of out) {
    assert.equal(t.confidence, "low", t.title);
    assert.ok(t.warnings.some((w) => w.includes("ไม่ตรงกับเทอมนี้")), t.title);
  }
});
