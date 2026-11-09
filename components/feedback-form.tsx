"use client";

import { useActionState, useState } from "react";
import { sendFeedback, type FeedbackState } from "@/app/feedback/actions";
import {
  AI_ACCURACY_OPTIONS,
  EMAIL_LOGIN_OPTIONS,
  MAX_MESSAGE_LENGTH,
  MAX_NOTE_LENGTH,
  PRICE_OPTIONS,
} from "@/lib/feedback";
import { PlanTable } from "@/components/plan-table";

const inputClass =
  "w-full rounded-card border border-line bg-surface px-3 py-2 text-base outline-none focus:border-accent";

// ปุ่มตัวเลือก (radio ซ่อน) — กดซ้ำตัวเดิม = ยกเลิกเลือก
function Choices({
  name,
  options,
  cols,
}: {
  name: string;
  options: readonly { value: string; label: string }[];
  cols: string;
}) {
  const [value, setValue] = useState("");
  return (
    <div className={`grid gap-2 ${cols}`}>
      {options.map((o) => (
        <label
          key={o.value}
          className={`cursor-pointer rounded-card border bg-surface px-2 py-2.5 text-center text-sm transition active:scale-95 ${
            value === o.value ? "border-accent text-accent" : "border-line"
          }`}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => setValue(o.value)}
            onClick={() => value === o.value && setValue("")}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

// ช่อง "อยากบอกเพิ่ม" ใต้ทุกข้อ (ไม่บังคับ)
function Note({ name, placeholder }: { name: string; placeholder: string }) {
  return (
    <textarea
      name={name}
      rows={2}
      maxLength={MAX_NOTE_LENGTH}
      placeholder={placeholder}
      className={`${inputClass} resize-y text-sm`}
    />
  );
}

function Question({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2.5 rounded-card border border-line p-4 lg:p-5">
      <legend className="px-1 font-medium">
        {n}. {title}
      </legend>
      {children}
    </fieldset>
  );
}

const RATINGS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} ⭐` }));

export function FeedbackForm() {
  const [state, formAction, pending] = useActionState<FeedbackState, FormData>(sendFeedback, {});
  const [formKey, setFormKey] = useState(0);
  // กด "ส่งอีกครั้ง" → ซ่อนหน้าขอบคุณของผลครั้งนั้น + ล้างฟอร์ม
  const [againFor, setAgainFor] = useState<FeedbackState | null>(null);

  if (state.ok && againFor !== state) {
    return (
      <div className="space-y-3 rounded-card border border-line bg-surface p-6 text-center motion-safe:animate-fade-in">
        <p className="text-3xl" aria-hidden>
          💙
        </p>
        <p className="font-medium">ขอบคุณมาก! ได้รับความเห็นแล้ว</p>
        <p className="text-sm text-muted">ใช้ไปสักพักแล้วมีอะไรอยากบอกเพิ่ม ส่งใหม่ได้ทุกเมื่อ</p>
        <button
          type="button"
          onClick={() => {
            setAgainFor(state);
            setFormKey((k) => k + 1);
          }}
          className="text-sm text-accent underline"
        >
          ส่งความเห็นอีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <form key={formKey} action={formAction} className="space-y-4">
      <p className="text-sm text-muted">ตอบเฉพาะข้อที่อยากตอบก็ได้ · ทุกข้อพิมพ์อธิบายเพิ่มได้</p>

      <Question n={1} title="ให้คะแนน Termly โดยรวม">
        <Choices name="rating" options={RATINGS} cols="grid-cols-5" />
        <Note name="rating_note" placeholder="ชอบ / ไม่ชอบตรงไหน (ไม่บังคับ)" />
      </Question>

      <Question n={2} title="AI อ่านซิลลาบัส / ประกาศงานของคุณถูกแค่ไหน">
        <Choices name="ai_accuracy" options={AI_ACCURACY_OPTIONS} cols="grid-cols-2 sm:grid-cols-4" />
        <Note name="ai_note" placeholder="เช่น อ่านวันที่ผิด, ใช้กับไฟล์แบบไหน (ไม่บังคับ)" />
      </Question>

      <Question n={3} title="ถ้ามี Termly Pro คุณยอมจ่ายเท่าไหร่ต่อเทอม">
        <p className="text-sm text-muted">
          ตอนนี้ยังไม่เก็บเงิน — ช่วงทดลองทุกคนใช้ได้ทุกอย่างฟรี (AI 10 ครั้ง/วัน) ตารางนี้คือแผนในอนาคต
        </p>
        <PlanTable />
        <Choices name="price" options={PRICE_OPTIONS} cols="grid-cols-2 sm:grid-cols-4" />
        <Note name="price_note" placeholder="เช่น ถ้ามีฟีเจอร์ ... จะยอมจ่าย / แพงไปเพราะ ... (ไม่บังคับ)" />
      </Question>

      <Question n={4} title="อยากให้มีล็อกอินด้วยอีเมล + รหัสผ่าน (นอกจาก Google) ไหม">
        <Choices name="email_login" options={EMAIL_LOGIN_OPTIONS} cols="grid-cols-2" />
        <Note name="login_note" placeholder="เหตุผล (ไม่บังคับ)" />
      </Question>

      <Question n={5} title="อยากให้เพิ่มหรือแก้อะไร">
        <textarea
          name="message"
          rows={4}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="บั๊กที่เจอ ฟีเจอร์ที่อยากได้ หรืออะไรก็ได้"
          className={`${inputClass} resize-y`}
        />
      </Question>

      {state.error && (
        <p role="alert" className="rounded-card border border-danger-line bg-danger-soft p-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-card bg-accent px-4 py-3 font-medium text-white transition active:scale-95 disabled:opacity-60"
      >
        {pending ? "กำลังส่ง…" : "ส่งความเห็น"}
      </button>
    </form>
  );
}
