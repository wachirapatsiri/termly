// ทดสอบฟังก์ชันของสอบ + การเช็กงานซ้ำ (ไม่เรียก AI ไม่ต่อฐานข้อมูล) — npm run test:ai-unit
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildExamTimes,
  countdownLabel,
  formatExamTime,
  upcomingExams,
} from "../lib/exams.ts";
import { batchDuplicates, findDuplicate, isLikelyDuplicate, type DupItem } from "../lib/duplicates.ts";

test("buildExamTimes: ไม่รู้วัน / รู้แค่วัน / มีเวลาเริ่ม–จบ", () => {
  assert.deepEqual(buildExamTimes(null, null, null), {
    ok: true,
    starts_at: null,
    ends_at: null,
    has_time: false,
  });
  // รู้แค่วัน = 00:00 เวลาไทย = 17:00 UTC ของวันก่อน
  assert.deepEqual(buildExamTimes("2026-12-01", null, null), {
    ok: true,
    starts_at: "2026-11-30T17:00:00.000Z",
    ends_at: null,
    has_time: false,
  });
  assert.deepEqual(buildExamTimes("2026-12-01", "09:00", "12:00"), {
    ok: true,
    starts_at: "2026-12-01T02:00:00.000Z",
    ends_at: "2026-12-01T05:00:00.000Z",
    has_time: true,
  });
});

test("buildExamTimes: ค่าผิดได้ข้อความ error ภาษาไทย", () => {
  assert.equal(buildExamTimes(null, "09:00", null).ok, false); // มีเวลาแต่ไม่มีวัน
  assert.equal(buildExamTimes("2026-12-01", null, "12:00").ok, false); // มีแต่เวลาจบ
  assert.equal(buildExamTimes("2026-12-01", "12:00", "09:00").ok, false); // จบก่อนเริ่ม
  assert.equal(buildExamTimes("2026-02-31", null, null).ok, false); // วันไม่มีจริง
});

test("formatExamTime + countdownLabel", () => {
  const t = buildExamTimes("2026-12-01", "09:00", "12:00");
  assert.ok(t.ok);
  assert.equal(formatExamTime(t), "09:00–12:00 น.");
  assert.equal(formatExamTime({ starts_at: t.starts_at, ends_at: null, has_time: false }), null);
  assert.equal(countdownLabel(0), "วันนี้");
  assert.equal(countdownLabel(1), "พรุ่งนี้");
  assert.equal(countdownLabel(5), "อีก 5 วัน");
  assert.equal(countdownLabel(-1), "ผ่านไปแล้ว");
});

test("upcomingExams: เฉพาะวันนี้ถึง 14 วันข้างหน้า เรียงตามวัน", () => {
  const now = new Date("2026-11-08T10:00:00+07:00");
  const at = (d: string) => buildExamTimes(d, null, null) as { starts_at: string };
  const exams = [
    { id: "far", ...at("2026-11-30") }, // 22 วัน
    { id: "soon", ...at("2026-11-13") }, // 5 วัน
    { id: "today", ...at("2026-11-08") }, // วันนี้ (00:00 ผ่านไปแล้วแต่ยังเป็นวันสอบ)
    { id: "past", ...at("2026-11-07") },
    { id: "edge", ...at("2026-11-22") }, // 14 วันพอดี
    { id: "unknown", starts_at: null },
  ];
  const got = upcomingExams(exams, now);
  assert.deepEqual(
    got.map((e) => [e.id, e.daysLeft]),
    [
      ["today", 0],
      ["soon", 5],
      ["edge", 14],
    ],
  );
});

const task = (o: Partial<DupItem>): DupItem => ({
  kind: "task",
  title: "การบ้าน 1",
  date: "2026-11-20",
  course_id: "c1",
  ...o,
});

test("งานซ้ำ: ชื่อเดียวกัน (ไม่สนช่องว่าง/ตัวพิมพ์) วันเดียวกัน", () => {
  assert.ok(isLikelyDuplicate(task({ title: "HW 1" }), task({ title: "hw1" })));
  assert.ok(isLikelyDuplicate(task({}), task({ date: null }))); // ฝั่งหนึ่งยังไม่รู้วัน
  assert.ok(isLikelyDuplicate(task({ course_id: null }), task({}))); // ฝั่งหนึ่งไม่ระบุวิชา
});

test("งานไม่ซ้ำ: คนละวัน / คนละวิชา / คนละชนิด / ชื่อต่าง", () => {
  assert.ok(!isLikelyDuplicate(task({}), task({ date: "2026-11-27" })));
  assert.ok(!isLikelyDuplicate(task({}), task({ course_id: "c2" })));
  assert.ok(!isLikelyDuplicate(task({}), task({ kind: "exam" })));
  assert.ok(!isLikelyDuplicate(task({}), task({ title: "การบ้าน 2" })));
  assert.ok(!isLikelyDuplicate(task({ course_id: "new:204383" }), task({})));
});

test("สอบกลางภาควิชาเดียวกัน = ซ้ำ แม้ชื่อ/วันต่างกัน; สอบอื่น ๆ ต้องชื่อตรง", () => {
  const exam = (o: Partial<DupItem>) =>
    task({ kind: "exam", title: "สอบกลางภาค", exam_type: "midterm", ...o });
  assert.ok(isLikelyDuplicate(exam({}), exam({ title: "Midterm", date: "2026-12-01" })));
  assert.ok(!isLikelyDuplicate(exam({}), exam({ exam_type: "final", title: "Final" })));
  assert.ok(!isLikelyDuplicate(exam({}), exam({ course_id: "c2" })));
  assert.ok(
    !isLikelyDuplicate(
      exam({ exam_type: "other", title: "สอบย่อย 1" }),
      exam({ exam_type: "other", title: "สอบย่อย 2" }),
    ),
  );
});

test("findDuplicate + batchDuplicates", () => {
  const existing = [task({ title: "รายงาน" }), task({})];
  assert.equal(findDuplicate(task({ title: "การบ้าน1" }), existing), existing[1]);
  assert.equal(findDuplicate(task({ title: "Lab 3" }), existing), undefined);
  assert.deepEqual(
    [...batchDuplicates([task({}), task({ title: "Lab" }), task({ title: "การบ้าน 1 " })])],
    [2],
  );
});

import { examsOverlap, findOverlaps } from "../lib/exams.ts";
import { findSimilarCourse, similarCourseName } from "../lib/duplicates.ts";

const slot = (start: string | null, end: string | null, date = "2026-12-29") =>
  buildExamTimes(date, start, end) as { starts_at: string; ends_at: string | null; has_time: boolean };

test("เวลาสอบชน: ทับกัน / เริ่มพร้อมกัน / เริ่มกลางช่วง", () => {
  assert.ok(examsOverlap(slot("08:00", "11:00"), slot("08:00", "10:00")));
  assert.ok(examsOverlap(slot("08:00", "11:00"), slot("09:00", "12:00")));
  assert.ok(examsOverlap(slot("08:00", "11:00"), slot("09:00", null))); // ไม่รู้เวลาจบ
  assert.ok(examsOverlap(slot("08:00", null), slot("08:00", null)));
});

test("เวลาสอบไม่ชน: ต่อกันพอดี / คนละวัน / ไม่รู้เวลา", () => {
  assert.ok(!examsOverlap(slot("08:00", "11:00"), slot("11:00", "13:00")));
  assert.ok(!examsOverlap(slot("08:00", "11:00"), slot("11:00", null)));
  assert.ok(!examsOverlap(slot("08:00", "11:00"), slot("08:00", "11:00", "2026-12-30")));
  assert.ok(!examsOverlap(slot("08:00", "11:00"), slot(null, null))); // รู้แค่วัน
  assert.ok(!examsOverlap(slot("08:00", null), slot("09:00", null)));
});

test("findOverlaps: คืนรายการที่ชนของแต่ละตัว", () => {
  const list = [slot("08:00", "11:00"), slot("11:00", "13:00"), slot("09:00", "10:00")];
  const got = findOverlaps(list);
  assert.deepEqual([...got.keys()], [0, 2]);
  assert.equal(got.get(0)?.[0], list[2]);
});

test("วิชาคล้ายกัน: รหัสเดียวกัน / ชื่อพิมพ์ตกหล่น / ไม่นับตัวเอง", () => {
  const courses = [
    { id: "a", name: "Data Engineering", code: "204426" },
    { id: "b", name: "สถิติเบื้องต้น", code: null },
  ];
  assert.equal(findSimilarCourse({ name: "Data Engineerin", code: "204426" }, courses)?.id, "a");
  assert.equal(findSimilarCourse({ name: "Data Engineerin", code: null }, courses)?.id, "a");
  assert.equal(findSimilarCourse({ name: "อะไรก็ได้", code: " 204426" }, courses)?.id, "a");
  assert.equal(findSimilarCourse({ name: "สถิติเบื้องต้น", code: "STAT1" }, courses)?.id, "b");
  assert.equal(findSimilarCourse({ id: "a", name: "Data Engineering", code: "204426" }, courses), undefined);
  assert.equal(findSimilarCourse({ name: "Image Processing", code: "204383" }, courses), undefined);
  assert.ok(!similarCourseName("Lab", "Lab 2")); // ชื่อสั้นเกินไป ไม่เดา
});
