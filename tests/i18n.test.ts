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
