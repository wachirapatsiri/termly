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
  assert.equal(pick("วิชา 229223 การโปรแกรม").length, 1);
  assert.equal(pick("HW11 Learning ... 04 (Individual) Spirits").length, 2); // วางหลายเอกสาร
  assert.deepEqual(pick("ข้อความอื่น ๆ"), []);
});

test("229223 (ปีขัดกันเอง) ถูกเตือนทุกรายการ", () => {
  const [pds] = findDemoSets("229223");
  const out = normalizeTasks(pds.tasks, [], TODAY);
  assert.equal(out.length, 6);
  for (const t of out) {
    assert.equal(t.confidence, "low", t.title);
    assert.ok(t.warnings.some((w) => w.includes("ไม่ตรงกับเทอมนี้")), t.title);
  }
});
