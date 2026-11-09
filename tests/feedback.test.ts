import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFeedback } from "../lib/feedback.ts";

const from = (o: Record<string, string>) => (k: string) => o[k] ?? null;

test("parseFeedback: ฟอร์มว่าง / ช่องว่างล้วน = empty", () => {
  assert.equal(parseFeedback(from({})).empty, true);
  assert.equal(parseFeedback(from({ message: "   ", rating_note: "\n" })).empty, true);
});

test("parseFeedback: ค่าที่ถูกต้องเก็บครบ + ตัดช่องว่าง", () => {
  const { input, empty } = parseFeedback(
    from({ rating: "4", price: "79", ai_accuracy: "some_fixes", email_login: "want", price_note: "  ถ้ามีเกรด  " }),
  );
  assert.equal(empty, false);
  assert.equal(input.rating, 4);
  assert.equal(input.price, "79");
  assert.equal(input.ai_accuracy, "some_fixes");
  assert.equal(input.email_login, "want");
  assert.equal(input.price_note, "ถ้ามีเกรด");
});

test("parseFeedback: ค่าแปลก = ไม่ตอบข้อนั้น", () => {
  const { input, empty } = parseFeedback(from({ rating: "9", price: "1000", ai_accuracy: "hack" }));
  assert.equal(input.rating, null);
  assert.equal(input.price, null);
  assert.equal(input.ai_accuracy, null);
  assert.equal(empty, true);
});

test("parseFeedback: ตอบแค่ความเห็นในช่องหมายเหตุก็ส่งได้ + ตัดความยาว", () => {
  const { input, empty } = parseFeedback(from({ ai_note: "ก".repeat(5000) }));
  assert.equal(empty, false);
  assert.equal(input.ai_note?.length, 1000);
});
