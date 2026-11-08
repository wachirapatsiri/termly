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
