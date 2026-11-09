// โควตา AI (lib/ai/usage.ts) + ตัดข้อมูลส่วนตัวก่อนส่ง AI (lib/ai/redact.ts) — ฟรี ไม่เรียก AI
import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeUsage, usageBlock, bangkokDayStartIso } from "../lib/ai/usage.ts";
import { AI_DAILY_ATTEMPT_LIMIT, AI_DAILY_LIMIT } from "../lib/ai/limits.ts";
import { redactPersonal } from "../lib/ai/redact.ts";

const rows = (ok: number, failed: number) => [
  ...Array.from({ length: ok }, () => ({ success: true })),
  ...Array.from({ length: failed }, () => ({ success: false })),
];

test("นับโควตาเฉพาะครั้งที่สำเร็จ", () => {
  const u = summarizeUsage(rows(3, 4));
  assert.deepEqual(u, { used: 3, limit: AI_DAILY_LIMIT, attempts: 7 });
  assert.equal(usageBlock(u), null);
});

test("ครบ 10 ครั้งที่สำเร็จ = ใช้ไม่ได้", () => {
  assert.equal(usageBlock(summarizeUsage(rows(AI_DAILY_LIMIT, 0))), "quota");
});

test("ล้มเหลวเยอะเกินเพดานรวม = กันสแปม", () => {
  assert.equal(usageBlock(summarizeUsage(rows(2, AI_DAILY_ATTEMPT_LIMIT - 2))), "attempts");
  assert.equal(usageBlock(summarizeUsage(rows(2, AI_DAILY_ATTEMPT_LIMIT - 3))), null);
});

test("เริ่มวันตามเวลาไทย", () => {
  assert.equal(bangkokDayStartIso("2026-11-09"), "2026-11-08T17:00:00.000Z");
});

test("ตัดอีเมลและเบอร์โทร", () => {
  const r = redactPersonal(
    "ติดต่อ อ.สมชาย somchai.k@cmu.ac.th โทร 081-234-5678 หรือ 02 123 4567 / +66 89 123 4567 / 0812345678 / 0-2218-6956",
  );
  assert.equal(r.emails, 1);
  assert.equal(r.phones, 5);
  assert.doesNotMatch(r.text, /@|5678|4567|6956/);
  assert.match(r.text, /\[อีเมล\]/);
  assert.match(r.text, /\[เบอร์โทร\]/);
});

test("ไม่ตัดรหัสวิชา วันที่ เวลา", () => {
  const src =
    "204383 Data Mining, 2110101 Com Prog, 01418112 (KU) ส่ง HW1 13/11/2569 23:59 สอบ 09:00-12:00 ห้อง 30-301 คะแนน 100 ชิ้นงาน 2026-11-13 สอบ 09-11-2026 1 ชม. รหัส 6510501234";
  const r = redactPersonal(src);
  assert.equal(r.text, src);
  assert.equal(r.phones + r.emails, 0);
});
