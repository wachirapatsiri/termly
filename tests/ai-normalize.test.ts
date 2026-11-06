// ทดสอบการตรวจ/เกลาคำตอบของ AI (ไม่เรียก AI จริง ไม่เสียเงิน) — npm run test:ai-unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchCourse, normalizeTasks } from "../lib/ai/normalize.ts";
import { AiResultSchema, type AiTask } from "../lib/ai/schema.ts";

const TODAY = "2026-11-06";
const COURSES = [
  { id: "c1", name: "การวิเคราะห์ข้อมูลเบื้องต้น", code: "DS201" },
  { id: "c2", name: "สถิติ", code: "STAT102" },
  { id: "c3", name: "Programming Fundamentals", code: null },
];

function task(overrides: Partial<AiTask>): AiTask {
  return {
    title: "การบ้าน",
    course: null,
    due_date: "2026-11-13",
    due_time: null,
    due_date_confidence: "high",
    raw_date_text: "13 พ.ย. 69",
    note: null,
    ...overrides,
  };
}

test("รายการปกติผ่านโดยไม่มีคำเตือน", () => {
  const [t] = normalizeTasks([task({ due_time: "23:59" })], [], TODAY);
  assert.equal(t.due_date, "2026-11-13");
  assert.equal(t.due_time, "23:59");
  assert.equal(t.confidence, "high");
  assert.deepEqual(t.warnings, []);
});

test("AI ลืมแปลงปี พ.ศ. → แปลงให้ + เตือน + ลด confidence", () => {
  const [t] = normalizeTasks([task({ due_date: "2569-12-16" })], [], TODAY);
  assert.equal(t.due_date, "2026-12-16");
  assert.equal(t.confidence, "medium");
  assert.match(t.warnings.join(), /พ\.ศ\./);
});

test("วันที่ไม่มีจริง → ไม่เดา ตั้งเป็น null + low", () => {
  const [t] = normalizeTasks([task({ due_date: "2026-02-30" })], [], TODAY);
  assert.equal(t.due_date, null);
  assert.equal(t.confidence, "low");
  assert.ok(t.warnings.length >= 2);
});

test("วันที่ผิดรูปแบบ → null + low", () => {
  const [t] = normalizeTasks([task({ due_date: "next friday" })], [], TODAY);
  assert.equal(t.due_date, null);
  assert.equal(t.confidence, "low");
});

test("ปีห่างจากปัจจุบันมาก → เก็บวันไว้แต่เตือน + low", () => {
  const [t] = normalizeTasks([task({ due_date: "2030-01-10" })], [], TODAY);
  assert.equal(t.due_date, "2030-01-10");
  assert.equal(t.confidence, "low");
});

test("ไม่มีวันส่งแต่ AI บอกมั่นใจ → บังคับเป็น low", () => {
  const [t] = normalizeTasks([task({ due_date: null, due_date_confidence: "high" })], [], TODAY);
  assert.equal(t.confidence, "low");
  assert.equal(t.warnings[0], "ยังไม่รู้วันส่ง");
});

test("เวลาแบบ 9.00 แปลงเป็น 09:00, เวลาไม่มีวันที่ถูกทิ้ง", () => {
  const [a, b] = normalizeTasks(
    [task({ due_time: "9.00" }), task({ title: "ข", due_date: null, due_time: "10:00" })],
    [],
    TODAY,
  );
  assert.equal(a.due_time, "09:00");
  assert.equal(b.due_time, null);
});

test("ชื่องานว่างถูกตัดทิ้ง และเรียงตามวันส่ง (ไม่มีวันไว้ท้าย)", () => {
  const out = normalizeTasks(
    [
      task({ title: "  " }),
      task({ title: "ไม่มีวัน", due_date: null, due_date_confidence: "low" }),
      task({ title: "หลัง", due_date: "2026-12-01" }),
      task({ title: "ก่อน", due_date: "2026-11-10" }),
    ],
    [],
    TODAY,
  );
  assert.deepEqual(out.map((t) => t.title), ["ก่อน", "หลัง", "ไม่มีวัน"]);
});

test("จับคู่วิชา: รหัส, ชื่อ, ไม่ชัดไม่เลือก", () => {
  assert.equal(matchCourse("DS 201 การวิเคราะห์ข้อมูล", COURSES), "c1");
  assert.equal(matchCourse("stat102", COURSES), "c2");
  assert.equal(matchCourse("CS105 Programming Fundamentals", COURSES), "c3");
  assert.equal(matchCourse("ฟิสิกส์", COURSES), null);
  assert.equal(matchCourse(null, COURSES), null);
});

test("Zod ปฏิเสธคำตอบผิดรูปแบบ", () => {
  assert.equal(AiResultSchema.safeParse({ tasks: [{ title: "x" }] }).success, false);
  assert.equal(AiResultSchema.safeParse({ items: [] }).success, false);
  assert.equal(AiResultSchema.safeParse({ tasks: [] }).success, true);
});
