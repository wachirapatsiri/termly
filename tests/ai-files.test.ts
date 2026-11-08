// ตรวจไฟล์แนบก่อนส่ง AI (lib/ai/files.ts) + ข้อความถึง AI ตอนมีไฟล์ (lib/ai/prompt.ts) — ฟรี ไม่เรียก AI
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkUploads, detectMediaType } from "../lib/ai/files.ts";
import { buildUserMessage } from "../lib/ai/prompt.ts";
import { MAX_IMAGES, MAX_UPLOAD_BYTES } from "../lib/ai/limits.ts";

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...Buffer.from(p, "latin1")] : p)));
const PDF = bytes("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF");
const JPG = bytes([0xff, 0xd8, 0xff, 0xe0, 0, 0x10], "JFIF");
const PNG = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
const WEBP = bytes("RIFF", [0x10, 0, 0, 0], "WEBPVP8 ");
const file = (name: string, b: Uint8Array) => ({ name, bytes: b });

test("ดูชนิดไฟล์จากเนื้อไฟล์ ไม่ใช่นามสกุล", () => {
  assert.equal(detectMediaType(PDF), "application/pdf");
  assert.equal(detectMediaType(JPG), "image/jpeg");
  assert.equal(detectMediaType(PNG), "image/png");
  assert.equal(detectMediaType(WEBP), "image/webp");
  assert.equal(detectMediaType(bytes("GIF89a....")), "image/gif");
  assert.equal(detectMediaType(bytes("hello world")), null);
  // HEIC (ftypheic) Claude อ่านไม่ได้ → ต้องให้เบราว์เซอร์แปลงเป็น JPEG ก่อน
  assert.equal(detectMediaType(bytes([0, 0, 0, 0x18], "ftypheic")), null);
});

test("ไม่มีไฟล์ = วางข้อความอย่างเดียว", () => {
  assert.deepEqual(checkUploads([]), { ok: true, kind: "none", attachments: [] });
});

test("PDF 1 ไฟล์ → base64", () => {
  const r = checkUploads([file("syllabus.pdf", PDF)]);
  assert.ok(r.ok);
  assert.equal(r.kind, "pdf");
  assert.equal(r.attachments[0].media_type, "application/pdf");
  assert.equal(Buffer.from(r.attachments[0].data, "base64").toString("latin1"), Buffer.from(PDF).toString("latin1"));
});

test("รูปหลายรูป ไม่เกินลิมิต", () => {
  const r = checkUploads([file("a.jpg", JPG), file("b.png", PNG), file("c.webp", WEBP)]);
  assert.ok(r.ok);
  assert.equal(r.kind, "image");
  assert.deepEqual(
    r.attachments.map((a) => a.media_type),
    ["image/jpeg", "image/png", "image/webp"],
  );
});

test("ปฏิเสธ: ไฟล์ปลอมนามสกุล / ไฟล์ว่าง", () => {
  const fake = checkUploads([file("virus.pdf", bytes("MZ\x90\x00 not a pdf"))]);
  assert.equal(fake.ok, false);
  assert.match(!fake.ok ? fake.error : "", /virus\.pdf/);
  assert.equal(checkUploads([file("empty.png", new Uint8Array())]).ok, false);
});

test("ปฏิเสธ: PDF หลายไฟล์ หรือ PDF ปนรูป", () => {
  assert.equal(checkUploads([file("a.pdf", PDF), file("b.pdf", PDF)]).ok, false);
  assert.equal(checkUploads([file("a.pdf", PDF), file("b.jpg", JPG)]).ok, false);
});

test(`ปฏิเสธ: รูปเกิน ${MAX_IMAGES} รูป`, () => {
  const ok = Array.from({ length: MAX_IMAGES }, (_, i) => file(`${i}.jpg`, JPG));
  assert.ok(checkUploads(ok).ok);
  const r = checkUploads([...ok, file("extra.jpg", JPG)]);
  assert.equal(r.ok, false);
});

test("ปฏิเสธ: ขนาดรวมเกิน 4 MB", () => {
  const big = new Uint8Array(MAX_UPLOAD_BYTES + 1);
  big.set(PDF);
  const r = checkUploads([file("big.pdf", big)]);
  assert.equal(r.ok, false);
  assert.match(!r.ok ? r.error : "", /ไม่เกิน 4 MB/);
  // รูปทีละไม่ใหญ่ แต่รวมกันเกิน
  const half = new Uint8Array(MAX_UPLOAD_BYTES / 2 + 10);
  half.set(JPG);
  assert.equal(checkUploads([file("1.jpg", half), file("2.jpg", half)]).ok, false);
});

test("ข้อความถึง AI: มีไฟล์ → อ้างถึงไฟล์ + ข้อความนักศึกษาเป็นคำอธิบายเพิ่ม", () => {
  const plain = buildUserMessage("HW1 Due 13 Nov", "2026-11-06");
  assert.match(plain, /<document>\nHW1 Due 13 Nov\n<\/document>/);

  const withFiles = buildUserMessage("นี่คือวิชา 204383", "2026-11-06", 2);
  assert.match(withFiles, /2 ไฟล์/);
  assert.match(withFiles, /<student_note>\nนี่คือวิชา 204383\n<\/student_note>/);
  assert.doesNotMatch(withFiles, /<document>/);

  const filesOnly = buildUserMessage("", "2026-11-06", 1);
  assert.doesNotMatch(filesOnly, /student_note/);
  assert.match(filesOnly, /วันนี้: 2026-11-06/);
});
