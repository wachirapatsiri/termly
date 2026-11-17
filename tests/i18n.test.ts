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

test("i18n: buildExamTimes error + ชื่อสีวิชา รองรับ en", async () => {
  const { buildExamTimes } = await import("../lib/exams.ts");
  const { courseColorName } = await import("../lib/course-color.ts");
  const r = buildExamTimes("2026-12-01", "12:00", "09:00", "en");
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.error, "End time must be after the start time");
  const th = buildExamTimes("2026-12-01", "12:00", "09:00");
  assert.equal(!th.ok && th.error, "เวลาจบต้องหลังเวลาเริ่ม");
  assert.equal(courseColorName(0, "en"), "Blue");
  assert.equal(courseColorName(0), "น้ำเงิน");
});

test("i18n: คำเตือนของ AI / ตรวจไฟล์ / AiError / เวลารีเซ็ต รองรับ en", async () => {
  const { normalizeTasks } = await import("../lib/ai/normalize.ts");
  const { checkUploads } = await import("../lib/ai/files.ts");
  const { aiError } = await import("../lib/ai/errors.ts");
  const { untilBangkokMidnight } = await import("../lib/dates.ts");
  const task = {
    title: "HW1", kind: "homework" as const, course_code: null, course_name: null,
    due_date: "2026-02-30", due_time: null, end_time: null, location: null,
    due_date_confidence: "high" as const, raw_date_text: null, note: null,
  };
  const [en] = normalizeTasks([task], [], "2026-11-17", "en");
  assert.ok(en.warnings.some((w) => /doesn't exist/.test(w)));
  assert.ok(!en.warnings.some((w) => /[฀-๿]/.test(w)));
  const [th] = normalizeTasks([task], [], "2026-11-17");
  assert.ok(th.warnings.some((w) => /ไม่มีอยู่จริง/.test(w)));
  // ไม่มีวัน → "The due date is unknown"
  const [none] = normalizeTasks([{ ...task, due_date: null }], [], "2026-11-17", "en");
  assert.equal(none.warnings[0], "The due date is unknown");
  // ไฟล์
  const bad = checkUploads([{ name: "a.txt", bytes: new Uint8Array([1, 2, 3]) }], "en");
  assert.equal(!bad.ok && bad.error, 'File "a.txt" isn\'t supported — use a PDF or an image (JPG, PNG, WEBP)');
  // AiError: message ไทย + key สำหรับแปล
  const e = aiError("ai.gQuota", true);
  assert.match(e.message, /โควตา/);
  assert.equal(t("en", e.key!, e.vars), "The free AI quota is temporarily full. Wait a minute and try again (or try tomorrow).");
  assert.match(untilBangkokMidnight(new Date("2026-11-17T10:00:00Z"), "en"), /^\d+ h( \d+ min)?$|^\d+ min$/);
});

test("i18n: แพ็กเกจ / คำยืนยันลบ / ไฟล์ปฏิทิน รองรับ en", async () => {
  const { planFeatures } = await import("../lib/plans.ts");
  const { isDeleteWord } = await import("../lib/account.ts");
  const { taskToIcs, examToIcs } = await import("../lib/ics.ts");
  const rows = planFeatures("en");
  assert.equal(rows[2].free, "5/day");
  assert.ok(rows.every((r) => !/[฀-๿]/.test(r.label)));
  assert.equal(planFeatures()[2].free, "5 ครั้ง/วัน");
  assert.ok(isDeleteWord("ลบ") && isDeleteWord(" delete ") && isDeleteWord("DELETE"));
  assert.ok(!isDeleteWord("del") && !isDeleteWord(""));
  const task = {
    id: "1", title: "HW", due_at: "2026-12-01T05:00:00.000Z", due_has_time: false, notes: null, done: true,
  };
  const en = taskToIcs(task, { courseName: "Stats", lang: "en" })!;
  assert.equal(en.description, "✅ Done\nCourse: Stats\nDue today (no time given)\nFrom Termly");
  const th = taskToIcs(task, { courseName: "สถิติ" })!;
  assert.match(th.description ?? "", /วิชา: สถิติ/);
  const exam = { id: "2", starts_at: "2026-12-01T05:00:00.000Z", ends_at: null, has_time: true, location: null, notes: null };
  assert.match(examToIcs(exam, { label: "Midterm", lang: "en" })!.description ?? "", /End time not set/);
});
