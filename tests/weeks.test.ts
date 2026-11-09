// มุมมองรายสัปดาห์ (lib/weeks.ts) — npm run test:ai-unit
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildWeeks,
  formatWeekRange,
  shortDay,
  weekLoad,
  weekOffsetLabel,
  weekStartOf,
  MIN_WEEKS,
} from "../lib/weeks.ts";

// จันทร์ 9 พ.ย. 2026 10:00 เวลาไทย
const now = new Date("2026-11-09T03:00:00Z");

test("weekStartOf: ยึดวันจันทร์ตามเวลาไทย", () => {
  assert.equal(weekStartOf("2026-11-11T07:30:00Z"), "2026-11-09"); // พุธ
  assert.equal(weekStartOf("2026-11-09T00:00:00+07:00"), "2026-11-09"); // จันทร์ 00:00
  assert.equal(weekStartOf("2026-11-15T23:59:00+07:00"), "2026-11-09"); // อาทิตย์ 23:59
  assert.equal(weekStartOf("2026-11-15T17:30:00Z"), "2026-11-16"); // = จันทร์ 00:30 ไทย
  assert.equal(weekStartOf("2027-01-01T05:00:00Z"), "2026-12-28"); // ข้ามปี
});

test("weekLoad: 0 ว่าง, 1–2 เบา, 3–4 ปานกลาง, ≥ 5 หนัก", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 9].map(weekLoad), [
    "free", "light", "light", "medium", "medium", "heavy", "heavy",
  ]);
});

test("buildWeeks: แบ่งสัปดาห์ นับงาน (รวมที่เสร็จแล้ว) ไม่นับสอบ", () => {
  const t = (due_at: string | null, done = false) => ({ due_at, done });
  const tasks = [
    t("2026-11-15T16:59:00Z"), // อาทิตย์ 23:59 ไทย → สัปดาห์นี้
    t("2026-11-10T16:59:00Z", true), // อังคาร (เสร็จแล้ว) → สัปดาห์นี้
    t("2026-11-15T17:30:00Z"), // จันทร์ถัดไป → สัปดาห์หน้า
    t("2026-11-02T16:59:00Z"), // สัปดาห์ที่แล้ว → ไม่แสดง
    t(null), // ไม่มีวันส่ง → ไม่แสดง
    ...Array.from({ length: 5 }, () => t("2026-12-30T05:00:00Z")), // 30 ธ.ค. = 5 งาน
  ];
  const exams = [{ starts_at: "2026-11-12T02:00:00Z" }, { starts_at: null }];
  const weeks = buildWeeks(tasks, exams, now);

  assert.equal(weeks[0].start, "2026-11-09");
  assert.equal(weeks[0].end, "2026-11-15");
  assert.equal(weeks[0].taskCount, 2);
  assert.equal(weeks[0].doneCount, 1);
  assert.equal(weeks[0].exams.length, 1);
  assert.equal(weeks[0].load, "light");
  // เรียงตามวันส่ง
  assert.equal(weeks[0].tasks[0].due_at, "2026-11-10T16:59:00Z");
  assert.equal(weeks[1].taskCount, 1);
  // ถึงสัปดาห์สุดท้ายที่มีงาน (28 ธ.ค. = offset 7) และสัปดาห์ว่างระหว่างทางยังอยู่
  assert.equal(weeks.length, 8);
  assert.equal(weeks[7].start, "2026-12-28");
  assert.equal(weeks[7].load, "heavy");
  assert.equal(weeks[3].load, "free");
});

test("buildWeeks: ไม่มีงานเลย → แสดงอย่างน้อย MIN_WEEKS สัปดาห์", () => {
  assert.equal(buildWeeks([], [], now).length, MIN_WEEKS);
});

test("formatWeekRange / weekOffsetLabel / shortDay", () => {
  assert.equal(formatWeekRange("2026-11-09", "2026-11-15", "be", now), "9–15 พ.ย.");
  assert.equal(formatWeekRange("2026-11-30", "2026-12-06", "be", now), "30 พ.ย. – 6 ธ.ค.");
  assert.equal(
    formatWeekRange("2026-12-28", "2027-01-03", "be", now),
    "28 ธ.ค. 2569 – 3 ม.ค. 2570",
  );
  assert.equal(formatWeekRange("2027-01-04", "2027-01-10", "ce", now), "4–10 ม.ค. 2027");
  assert.equal(weekOffsetLabel(0), "สัปดาห์นี้");
  assert.equal(weekOffsetLabel(1), "สัปดาห์หน้า");
  assert.equal(weekOffsetLabel(3), "อีก 3 สัปดาห์");
  assert.equal(shortDay("2026-11-11T07:30:00Z"), "พ. 11");
  assert.equal(shortDay("2026-11-15T17:30:00Z"), "จ. 16");
});
