// สรุปหัวหน้างาน (lib/summary.ts) — npm run test:ai-unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeTasks } from "../lib/summary.ts";

// พุธ 11 พ.ย. 2026 12:00 เวลาไทย → สัปดาห์นี้ = จันทร์ 9 – อาทิตย์ 15 พ.ย.
const now = new Date("2026-11-11T05:00:00Z");
const at = (date: string, time = "16:59") => `${date}T${time}:00Z`;

test("นับงานสัปดาห์นี้ (รวมที่เสร็จ) + เลยกำหนด + ยังไม่มีวันส่ง", () => {
  const s = summarizeTasks(
    [
      { due_at: at("2026-11-09"), done: true }, // จันทร์นี้ เสร็จแล้ว
      { due_at: at("2026-11-10"), done: false }, // เมื่อวาน ยังไม่เสร็จ → เลยกำหนด
      { due_at: at("2026-11-15"), done: false }, // อาทิตย์นี้
      { due_at: at("2026-11-16"), done: false }, // สัปดาห์หน้า
      { due_at: at("2026-11-02"), done: false }, // สัปดาห์ก่อน เลยกำหนด
      { due_at: null, done: false },
      { due_at: null, done: true },
    ],
    [],
    now,
  );
  assert.equal(s.weekTotal, 3);
  assert.equal(s.weekDone, 1);
  assert.equal(s.weekLoad, "medium");
  assert.equal(s.overdue, 2);
  assert.equal(s.noDue, 1);
  assert.equal(s.nextExam, null);
});

test("สอบถัดไป: ข้ามสอบที่ผ่านไปแล้ว/ยังไม่ประกาศวัน, ดูไกลเกิน 14 วันได้", () => {
  const s = summarizeTasks(
    [],
    [
      { id: "past", starts_at: at("2026-11-10", "02:00") },
      { id: "none", starts_at: null },
      { id: "far", starts_at: at("2026-12-20", "02:00") },
      { id: "soon", starts_at: at("2026-12-01", "02:00") },
    ],
    now,
  );
  assert.equal(s.nextExam?.id, "soon");
  assert.equal(s.nextExam?.daysLeft, 20);
});

test("สอบวันนี้นับเป็นสอบถัดไป (อีก 0 วัน)", () => {
  const s = summarizeTasks([], [{ id: "today", starts_at: at("2026-11-11", "01:00") }], now);
  assert.equal(s.nextExam?.daysLeft, 0);
});
