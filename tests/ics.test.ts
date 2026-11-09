// ส่งออกปฏิทิน .ics (lib/ics.ts) — npm run test:ai-unit
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildIcs,
  courseSelected,
  escapeText,
  examToIcs,
  foldLine,
  icsQuery,
  parseIcsOptions,
  taskToIcs,
  utcStamp,
} from "../lib/ics.ts";

const now = new Date("2026-11-09T03:00:00Z");
const task = (over: Partial<Parameters<typeof taskToIcs>[0]> = {}) => ({
  id: "t1",
  title: "HW1",
  due_at: "2026-11-13T16:59:00Z", // ศุกร์ 13 พ.ย. 23:59 ไทย
  due_has_time: true,
  notes: null,
  done: false,
  ...over,
});

test("escapeText / utcStamp", () => {
  assert.equal(escapeText("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
  assert.equal(utcStamp("2026-11-13T16:59:00.000Z"), "20261113T165900Z");
});

test("foldLine: พับที่ 75 ไบต์ ไม่ตัดกลางตัวอักษรไทย", () => {
  const line = "SUMMARY:" + "ก".repeat(60); // 8 + 180 ไบต์
  const folded = foldLine(line);
  const parts = folded.split("\r\n");
  assert.ok(parts.length > 1);
  const enc = new TextEncoder();
  for (const p of parts) assert.ok(enc.encode(p).length <= 75);
  for (const p of parts.slice(1)) assert.ok(p.startsWith(" "));
  assert.equal(parts.map((p, i) => (i ? p.slice(1) : p)).join(""), line);
  assert.equal(foldLine("SHORT:ok"), "SHORT:ok");
});

test("taskToIcs: มีเวลา = 30 นาทีจบตรงเวลาส่ง, มีวิชา/ประเภท", () => {
  const it = taskToIcs(task(), { courseLabel: "DS101", courseName: "สถิติ", category: "การบ้าน" })!;
  assert.equal(it.title, "[DS101] HW1");
  assert.equal(it.allDay, false);
  assert.equal(it.end, "2026-11-13T16:59:00Z");
  assert.equal(it.start, "2026-11-13T16:29:00.000Z");
  assert.match(it.description!, /วิชา: สถิติ\nประเภท: การบ้าน/);
});

test("taskToIcs: รู้แค่วัน = ทั้งวัน, เสร็จแล้วมี ✅, ไม่มีวัน = null", () => {
  const it = taskToIcs(task({ due_has_time: false, done: true }), {})!;
  assert.equal(it.allDay, true);
  assert.equal(it.title, "✅ HW1");
  assert.match(it.description!, /ไม่ระบุเวลา/);
  assert.equal(taskToIcs(task({ due_at: null }), {}), null);
});

test("examToIcs: ไม่รู้เวลาจบ = 1 ชม., ไม่รู้เวลา = ทั้งวัน, ไม่มีวัน = null", () => {
  const exam = {
    id: "e1",
    starts_at: "2026-12-15T02:00:00Z", // 09:00 ไทย
    ends_at: null,
    has_time: true,
    location: "ห้อง 301",
    notes: null,
  };
  const a = examToIcs(exam, { label: "สอบกลางภาค DS101" })!;
  assert.equal(a.title, "📝 สอบกลางภาค DS101");
  assert.equal(a.end, "2026-12-15T03:00:00.000Z");
  assert.equal(a.location, "ห้อง 301");
  const b = examToIcs({ ...exam, ends_at: "2026-12-15T05:00:00Z" }, { label: "x" })!;
  assert.equal(b.end, "2026-12-15T05:00:00Z");
  const c = examToIcs({ ...exam, starts_at: "2026-12-14T17:00:00Z", has_time: false }, { label: "x" })!;
  assert.equal(c.allDay, true);
  assert.equal(examToIcs({ ...exam, starts_at: null }, { label: "x" }), null);
});

test("buildIcs: โครงไฟล์ + วันทั้งวันใช้วันตามเวลาไทย + เตือน 1 วันก่อน", () => {
  const ics = buildIcs(
    [
      taskToIcs(task(), { courseLabel: "DS101" })!,
      // 00:00 ไทย 15 ธ.ค. = 17:00Z 14 ธ.ค. → ต้องเป็นวันที่ 15
      examToIcs(
        { id: "e1", starts_at: "2026-12-14T17:00:00Z", ends_at: null, has_time: false, location: "ตึก A, ชั้น 2", notes: null },
        { label: "สอบปลายภาค DS101" },
      )!,
    ],
    now,
  );
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.ok(!/[^\r]\n/.test(ics), "ทุกบรรทัดต้องจบด้วย CRLF");
  assert.match(ics, /UID:task-t1@termly/);
  assert.match(ics, /DTSTAMP:20261109T030000Z/);
  assert.match(ics, /DTSTART:20261113T162900Z\r\nDTEND:20261113T165900Z/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261215\r\nDTEND;VALUE=DATE:20261216/);
  assert.match(ics, /LOCATION:ตึก A\\, ชั้น 2/);
  assert.match(ics, /TRIGGER:-P1D/);
  assert.match(ics, /TRIGGER:-PT15H/);
  assert.equal(ics.match(/BEGIN:VEVENT/g)?.length, 2);
});

test("parseIcsOptions / icsQuery / courseSelected", () => {
  assert.deepEqual(parseIcsOptions(new URLSearchParams("")), {
    pending: true,
    done: false,
    exams: true,
    courses: null,
  });
  const o = { pending: false, done: true, exams: true, courses: ["c1", "none"] };
  assert.deepEqual(parseIcsOptions(new URLSearchParams(icsQuery(o))), o);
  assert.equal(courseSelected("c1", null), true);
  assert.equal(courseSelected("c2", ["c1"]), false);
  assert.equal(courseSelected(null, ["none"]), true);
  assert.equal(courseSelected(null, ["c1"]), false);
});
