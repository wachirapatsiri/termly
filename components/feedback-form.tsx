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
import { useLang, useT } from "@/components/lang";
import { t } from "@/lib/messages";
import type { Lang } from "@/lib/i18n";
import { PRO_FEATURE_OPTIONS } from "@/lib/plans";

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

// ติ๊กได้หลายข้อ
function MultiChoices({ name, options }: { name: string; options: readonly { value: string; label: string }[] }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const toggle = (v: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => (
        <label
          key={o.value}
          className={`flex cursor-pointer items-center gap-2 rounded-card border bg-surface px-3 py-2.5 text-sm transition active:scale-95 ${
            picked.has(o.value) ? "border-accent text-accent" : "border-line"
          }`}
        >
          <input
            type="checkbox"
            name={name}
            value={o.value}
            checked={picked.has(o.value)}
            onChange={() => toggle(o.value)}
            className="sr-only"
          />
          <span className="min-w-0 flex-1">{o.label}</span>
          <span aria-hidden className={picked.has(o.value) ? "" : "invisible"}>
            ✓
          </span>
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

const RATINGS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}` }));

// ป้ายตัวเลือก: คีย์ตามค่า (value) ของแต่ละกลุ่มตัวเลือก
function aiAccOptions(lang: Lang) {
  return AI_ACCURACY_OPTIONS.map((o) => ({ value: o.value, label: t(lang, `opt.aiAcc.${o.value}`) }));
}
function priceOptions(lang: Lang) {
  return PRICE_OPTIONS.map((o) => ({
    value: o.value,
    label: o.value === "free" ? t(lang, "opt.price.free") : t(lang, "opt.price.baht", { p: o.value }),
  }));
}
function emailLoginOptions(lang: Lang) {
  return EMAIL_LOGIN_OPTIONS.map((o) => ({ value: o.value, label: t(lang, `opt.emailLogin.${o.value}`) }));
}
function proOptions(lang: Lang) {
  return PRO_FEATURE_OPTIONS.map((o) => ({ value: o.value, label: t(lang, `opt.pro.${o.value}`) }));
}

export function FeedbackForm() {
  const lang = useLang();
  const tr = useT();
  const [state, formAction, pending] = useActionState<FeedbackState, FormData>(sendFeedback, {});
  const [formKey, setFormKey] = useState(0);
  // กด "ส่งอีกครั้ง" → ซ่อนหน้าขอบคุณของผลครั้งนั้น + ล้างฟอร์ม
  const [againFor, setAgainFor] = useState<FeedbackState | null>(null);

  if (state.ok && againFor !== state) {
    return (
      <div className="space-y-3 rounded-card border border-line bg-surface p-6 text-center motion-safe:animate-fade-in">
        <p className="font-medium">{tr("fb.thanks")}</p>
        <p className="text-sm text-muted">{tr("fb.thanksBody")}</p>
        <button
          type="button"
          onClick={() => {
            setAgainFor(state);
            setFormKey((k) => k + 1);
          }}
          className="text-sm text-accent underline"
        >
          {tr("fb.again")}
        </button>
      </div>
    );
  }

  return (
    <form key={formKey} action={formAction} className="space-y-4">
      <p className="text-sm text-muted">{tr("fb.optionalHint")}</p>

      <Question n={1} title={tr("fb.q1")}>
        <Choices name="rating" options={RATINGS} cols="grid-cols-5" />
        <Note name="rating_note" placeholder={tr("fb.q1.note")} />
      </Question>

      <Question n={2} title={tr("fb.q2")}>
        <Choices name="ai_accuracy" options={aiAccOptions(lang)} cols="grid-cols-2 sm:grid-cols-4" />
        <Note name="ai_note" placeholder={tr("fb.q2.note")} />
      </Question>

      <Question n={3} title={tr("fb.q3")}>
        <p className="text-sm text-muted">
          {tr("fb.q3.hint")}
        </p>
        <PlanTable lang={lang} />
        <MultiChoices name="pro_features" options={proOptions(lang)} />
        <Note name="pro_note" placeholder={tr("fb.q3.note")} />
      </Question>

      <Question n={4} title={tr("fb.q4")}>
        <Choices name="price" options={priceOptions(lang)} cols="grid-cols-2 sm:grid-cols-4" />
        <Note name="price_note" placeholder={tr("fb.q4.note")} />
      </Question>

      <Question n={5} title={tr("fb.q5")}>
        <Choices name="email_login" options={emailLoginOptions(lang)} cols="grid-cols-2" />
        <Note name="login_note" placeholder={tr("fb.q5.note")} />
      </Question>

      <Question n={6} title={tr("fb.q6")}>
        <textarea
          name="message"
          rows={4}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder={tr("fb.q6.placeholder")}
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
        {pending ? tr("fb.sending") : tr("fb.send")}
      </button>
    </form>
  );
}
