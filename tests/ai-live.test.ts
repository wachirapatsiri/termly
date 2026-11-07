// ทดสอบกับ AI จริง ด้วยข้อความตัวอย่างใน tests/fixtures/ (3 แบบแต่งเอง + 2 แบบจำลองจากเอกสารจริงของผู้ใช้ ตัดข้อมูลส่วนตัวออก) — npm run test:ai
// ⚠ เสียเงินจริง (Sonnet 5.5 ประมาณ 0.5 บาท/ไฟล์) ต้องมี ANTHROPIC_API_KEY ใน .env.local
// สมมติว่า "วันนี้" = ศุกร์ 6 พ.ย. 2569 เพื่อให้ผลคงที่
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extractWithClaude, isMockMode } from "../lib/ai/claude.ts";
import { normalizeTasks } from "../lib/ai/normalize.ts";
import type { ExtractedTask } from "../lib/ai/schema.ts";

const TODAY = "2026-11-06";
const skip = isMockMode() ? "ไม่มี ANTHROPIC_API_KEY (หรือ AI_MODE=mock) — ข้ามการทดสอบ AI จริง" : false;

async function run(file: string): Promise<ExtractedTask[]> {
  const text = readFileSync(new URL(`./fixtures/${file}`, import.meta.url), "utf8");
  const tasks = normalizeTasks(await extractWithClaude(text, TODAY), [], TODAY);
  console.log(`\n── ${file} ──`);
  for (const t of tasks) {
    console.log(
      `  [${t.confidence.padEnd(6)}] ${t.kind.padEnd(12)} ${t.due_date ?? "—".padEnd(10)} ${t.due_time ?? "     "}${t.end_time ? `–${t.end_time}` : ""} ${t.title}` +
        (t.warnings.length ? `  ⚠ ${t.warnings.join(" / ")}` : ""),
    );
  }
  return tasks;
}

const find = (tasks: ExtractedTask[], re: RegExp) => tasks.find((t) => re.test(t.title));

test("1) ซิลลาบัสตาราง ปี พ.ศ.", { skip }, async () => {
  const tasks = await run("1-syllabus-table.txt");
  assert.ok(tasks.length >= 5 && tasks.length <= 6, `ควรได้ 5 งาน (ได้ ${tasks.length})`);
  assert.equal(find(tasks, /1|Descriptive/i)?.due_date, "2026-11-13");
  const hw2 = find(tasks, /Visualization|ครั้งที่ 2/i);
  assert.equal(hw2?.due_date, "2026-11-27");
  assert.equal(hw2?.due_time, "23:59");
  assert.equal(find(tasks, /Regression|ครั้งที่ 3/i)?.due_date, "2027-01-08");
  const mid = find(tasks, /กลางภาค|midterm/i);
  assert.equal(mid?.due_date, "2026-12-16");
  assert.equal(mid?.kind, "midterm");
  assert.equal(mid?.due_time, "09:00");
  assert.equal(mid?.end_time, "12:00");
  assert.equal(find(tasks, /Visualization|ครั้งที่ 2/i)?.kind, "homework");
});

test("2) ประกาศภาษาพูด วันสัมพัทธ์", { skip }, async () => {
  const tasks = await run("2-line-announcement.txt");
  const sheet = find(tasks, /ใบงาน|บทที่ 5/);
  assert.equal(sheet?.due_date, "2026-11-13", "ศุกร์หน้า = 13 พ.ย.");
  assert.notEqual(sheet?.confidence, "high", "วันสัมพัทธ์ไม่ควร high");
  const quiz = find(tasks, /quiz/i);
  assert.equal(quiz?.due_date, "2026-11-10", "อังคารนี้ = 10 พ.ย.");
  assert.equal(quiz?.kind, "quiz", "quiz ในคาบ = งาน ไม่ใช่สอบ");
  const project = find(tasks, /โปรเจกต์|project/i);
  assert.ok(project, "ต้องมีโปรเจกต์");
  assert.equal(project.due_date, null, "โปรเจกต์ยังไม่ประกาศวัน ต้องไม่เดา");
  assert.equal(project.confidence, "low");
  assert.equal(project.kind, "project");
});

test("3) ไทยปนอังกฤษ + วันที่กำกวม", { skip }, async () => {
  const tasks = await run("3-mixed-ambiguous.txt");
  const lab1 = find(tasks, /Lab 1/i);
  assert.equal(lab1?.due_date, "2026-11-20");
  assert.equal(lab1?.due_time, "23:59");
  assert.equal(find(tasks, /Assignment 1|calculator/i)?.due_date, "2026-12-04");
  for (const re of [/Lab 2/i, /Midterm|กลางภาค/i, /Final|Project/i]) {
    const t = find(tasks, re);
    assert.ok(t, `ต้องมีรายการ ${re}`);
    assert.equal(t.confidence, "low", `${t.title} วันที่ไม่ชัด ต้องเป็น low`);
  }
  assert.ok(!find(tasks, /office/i), "office hours ไม่ใช่งาน");
});

test("4) หน้างาน Canvas: ใช้ Due ไม่ใช่ Submitted/Available", { skip }, async () => {
  const tasks = await run("4-canvas-assignment.txt");
  assert.equal(tasks.length, 1, `ควรได้ 1 งาน (ได้ ${tasks.length})`);
  const [t] = tasks;
  assert.equal(t.due_date, "2026-07-17");
  assert.equal(t.due_time, "12:30");
  assert.equal(t.course_code, "204383");
  assert.match(t.course_name ?? "", /image processing/i);
});

test("5) ซิลลาบัสไม่มีปี: เดาปีจากวันในสัปดาห์ + ใกล้วันนี้", { skip }, async () => {
  const tasks = await run("5-syllabus-no-year.txt");
  const mid = find(tasks, /กลางภาค|midterm/i);
  assert.equal(mid?.due_date, "2026-08-30", "อาทิตย์ 30 ส.ค. = ปี 2026");
  assert.equal(mid?.due_time, "15:30");
  assert.equal(mid?.end_time, "18:30");
  assert.equal(mid?.kind, "midterm");
  assert.notEqual(mid?.confidence, "high", "ไม่มีปีในเอกสาร ไม่ควร high");
  const fin = find(tasks, /ปลายภาค|final/i);
  assert.equal(fin?.due_date, "2026-10-26");
  assert.equal(fin?.due_time, "08:00");
  assert.equal(fin?.kind, "final");
  assert.ok(!find(tasks, /เตรียมสอบ|เข้าพรรษา|intro/i), "สัปดาห์เตรียมสอบ/วันหยุดไม่ใช่งาน");
});
