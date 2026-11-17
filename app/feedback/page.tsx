import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";
import { FeedbackForm } from "@/components/feedback-form";
import { WithLang } from "@/components/with-lang";
import { getLang } from "@/lib/preferences";
import { t } from "@/lib/messages";

export const metadata: Metadata = { title: "ส่งความเห็น · Termly" };

// หน้าฟอร์มความเห็นช่วงทดลอง (เซสชัน 13) — บันทึกลงตาราง feedback
export default function FeedbackPage() {
  return (
    <main className="mx-auto w-full max-w-md md:max-w-2xl flex-1 space-y-6 px-6 py-6 lg:max-w-3xl lg:px-10">
      <AppNav current="/feedback" />
      {/* ภาษามาจาก cookie → อ่านใน Suspense เสมอ */}
      <Suspense fallback={<div className="h-16" />}>
        <FeedbackHeader />
      </Suspense>
      <Suspense fallback={<div className="h-96 rounded-card border border-line" />}>
        <FeedbackSection />
      </Suspense>
    </main>
  );
}

async function FeedbackHeader() {
  const lang = await getLang();
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">{t(lang, "fb.title")}</h1>
      <p className="leading-relaxed text-muted">{t(lang, "fb.subtitle")}</p>
    </div>
  );
}

async function FeedbackSection() {
  if (!(await getCurrentUser())) redirect("/login");
  return (
    <WithLang>
      <FeedbackForm />
    </WithLang>
  );
}
