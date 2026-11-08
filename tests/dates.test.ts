// แสดงวันที่ พ.ศ./ค.ศ. ตามที่ผู้ใช้ตั้งค่า (lib/dates.ts formatDue) — npm run test:ai-unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDue } from "../lib/dates.ts";

const iso = "2026-11-11T07:30:00Z"; // พุธ 11 พ.ย. 14:30 เวลาไทย

test("formatDue: ค่าเริ่มต้น = พ.ศ.", () => {
  assert.equal(formatDue(iso, false), "พุธ 11 พ.ย. 2569");
  assert.equal(formatDue(iso, true), "พุธ 11 พ.ย. 2569 · 14:30 น.");
});

test("formatDue: เลือก ค.ศ. → ชื่อวัน/เดือนยังเป็นไทย เปลี่ยนแค่ปี", () => {
  assert.equal(formatDue(iso, false, "ce"), "พุธ 11 พ.ย. 2026");
  assert.equal(formatDue(iso, true, "ce"), "พุธ 11 พ.ย. 2026 · 14:30 น.");
  // ใกล้เที่ยงคืน: ปีต้องตามเวลาไทย (31 ธ.ค. 20:00 UTC = 1 ม.ค. เวลาไทย)
  assert.match(formatDue("2026-12-31T20:00:00Z", false, "ce"), /1 ม\.ค\. 2027$/);
  assert.match(formatDue("2026-12-31T20:00:00Z", false, "be"), /1 ม\.ค\. 2570$/);
});

test("untilBangkokMidnight: นับถึง 00:00 เวลาไทย", async () => {
  const { untilBangkokMidnight } = await import("../lib/dates.ts");
  // 20:48 เวลาไทย (13:48 UTC) → อีก 3 ชม. 12 นาที
  assert.equal(untilBangkokMidnight(new Date("2026-11-08T13:48:00Z")), "3 ชม. 12 นาที");
  // 02:47 เวลาไทยของวันที่ 9 (19:47 UTC วันที่ 8) → อีก 21 ชม. 13 นาที
  assert.equal(untilBangkokMidnight(new Date("2026-11-08T19:47:00Z")), "21 ชม. 13 นาที");
  assert.equal(untilBangkokMidnight(new Date("2026-11-08T16:15:00Z")), "45 นาที"); // 23:15
  assert.equal(untilBangkokMidnight(new Date("2026-11-08T15:00:00Z")), "2 ชม."); // 22:00
  assert.equal(untilBangkokMidnight(new Date("2026-11-08T16:59:50Z")), "1 นาที"); // 23:59:50
});
