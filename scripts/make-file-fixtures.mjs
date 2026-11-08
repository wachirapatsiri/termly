// สร้างไฟล์ทดสอบ PDF / รูป จากข้อความสมมติใน tests/fixtures/ (ไม่ใช่ไฟล์จริงของผู้ใช้) — ใช้กับ npm run test:ai
// รัน: node scripts/make-file-fixtures.mjs  (ต้องมี Playwright + Chromium และฟอนต์ไทยในเครื่อง)
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)("playwright");

const dir = new URL("../tests/fixtures/", import.meta.url);
const read = (f) => readFileSync(new URL(f, dir), "utf8");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const page = (body, width) => `<!doctype html><meta charset="utf-8">
<body style="margin:24px;width:${width}px;font:15px/1.6 Loma, sans-serif;color:#222;white-space:pre-wrap">${esc(body)}</body>`;

const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 900, height: 600 } });

// 6) ซิลลาบัสตาราง → PDF (A4 ข้อความเลือกได้)
await p.setContent(page(read("1-syllabus-table.txt"), 700));
await p.pdf({ path: new URL("6-syllabus-table.pdf", dir).pathname, format: "A4" });

// 7) หน้างาน Canvas → ภาพแคปหน้าจอ PNG
await p.setContent(page(read("4-canvas-assignment.txt"), 800));
await p.screenshot({ path: new URL("7-canvas-assignment.png", dir).pathname, fullPage: true });

await browser.close();
console.log("สร้าง tests/fixtures/6-syllabus-table.pdf และ 7-canvas-assignment.png แล้ว");
