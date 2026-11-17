import { test } from "node:test";
import assert from "node:assert/strict";
import { MESSAGE_KEYS, MESSAGES, t } from "../lib/messages.ts";
import { DEFAULT_LANG, LANG_OPTIONS, isLang } from "../lib/i18n.ts";

test("i18n: ภาษาไทยและอังกฤษมีคีย์ครบเท่ากัน ไม่มีข้อความว่าง", () => {
  const th = Object.keys(MESSAGES.th).sort();
  const en = Object.keys(MESSAGES.en).sort();
  assert.deepEqual(en, th);
  for (const lang of ["th", "en"] as const) {
    for (const key of MESSAGE_KEYS) assert.ok(MESSAGES[lang][key].trim().length > 0, `${lang}:${key} ว่าง`);
  }
});

test("i18n: ข้อความอังกฤษไม่ได้เป็นภาษาไทย (ยกเว้นคีย์ที่ตั้งใจให้เหมือนกัน)", () => {
  const sameOnPurpose = new Set(["settings.language"]); // "ภาษา / Language" ใช้ 2 ภาษาในข้อความเดียว
  for (const key of MESSAGE_KEYS) {
    if (sameOnPurpose.has(key)) continue;
    assert.doesNotMatch(MESSAGES.en[key], /[฀-๿]/, `en:${key} ยังมีตัวอักษรไทย`);
  }
});

test("i18n: ตัวแปร {n} ในข้อความ 2 ภาษาต้องตรงกัน และ t() แทนค่าให้", () => {
  const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const key of MESSAGE_KEYS) assert.deepEqual(vars(MESSAGES.en[key]), vars(MESSAGES.th[key]), key);
  assert.equal(t("th", "home.note.free", { n: 10 }), "ช่วงทดลองใช้ฟรี · AI 10 ครั้ง/วัน");
  assert.equal(t("en", "home.note.free", { n: 10 }), "Free during the trial · 10 AI uses per day");
  // ไม่ส่งตัวแปร = คง {n} ไว้ให้เห็นว่าลืม
  assert.match(t("en", "home.note.free"), /\{n\}/);
});

test("i18n: isLang / ค่าตั้งต้น / ตัวเลือก", () => {
  assert.equal(DEFAULT_LANG, "th");
  assert.ok(isLang("en") && isLang("th"));
  assert.ok(!isLang("fr") && !isLang(undefined) && !isLang(null));
  assert.deepEqual(LANG_OPTIONS.map((o) => o.value), ["th", "en"]);
});

test("i18n: ฟังก์ชันวันที่/สัปดาห์/นับถอยหลังรองรับ en", async () => {
  const { formatDue, dueGroupLabel } = await import("../lib/dates.ts");
  const { countdownLabel, examTypeLabel, formatExamTime } = await import("../lib/exams.ts");
  const { shortDay, weekOffsetLabel, weekLoadLabel, formatWeekRange } = await import("../lib/weeks.ts");
  const iso = "2026-11-11T07:30:00.000Z"; // พุธ 11 พ.ย. 14:30 เวลาไทย
  assert.equal(formatDue(iso, true, "ce", "en"), "Wed 11 Nov 2026 · 14:30");
  assert.equal(formatDue(iso, false, "be", "en"), "Wed 11 Nov 2569");
  assert.equal(formatDue(iso, false, "be"), "พุธ 11 พ.ย. 2569"); // ไทยเหมือนเดิม
  assert.equal(dueGroupLabel("overdue", "en"), "Overdue");
  assert.equal(dueGroupLabel("overdue"), "เลยกำหนด");
  assert.equal(countdownLabel(5, "en"), "In 5 days");
  assert.equal(countdownLabel(5), "อีก 5 วัน");
  assert.equal(examTypeLabel("midterm", "en"), "Midterm exam");
  assert.equal(weekOffsetLabel(3, "en"), "In 3 weeks");
  assert.equal(weekLoadLabel("heavy", "en"), "Heavy");
  assert.equal(shortDay(iso, "en"), "Wed 11");
  assert.equal(formatWeekRange("2026-11-09", "2026-11-15", "ce", new Date(iso), "en"), "9–15 Nov");
  const e = { starts_at: iso, ends_at: "2026-11-11T09:30:00.000Z", has_time: true };
  assert.equal(formatExamTime(e, "en"), "14:30–16:30");
  assert.equal(formatExamTime(e), "14:30–16:30 น.");
});
