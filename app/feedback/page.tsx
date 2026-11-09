import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";
import { FeedbackForm } from "@/components/feedback-form";

export const metadata: Metadata = { title: "ส่งความเห็น · Termly" };

// หน้าฟอร์มความเห็นช่วงทดลอง (เซสชัน 13) — บันทึกลงตาราง feedback
export default function FeedbackPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-6 px-6 py-6 lg:max-w-3xl lg:px-10">
      <AppNav current="/feedback" />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">💬 ช่วยบอกความเห็นหน่อย</h1>
        <p className="leading-relaxed text-muted">
          Termly ยังอยู่ช่วงทดลอง ทุกความเห็นช่วยตัดสินใจว่าจะทำอะไรต่อ ใช้เวลาไม่ถึง 2 นาที
        </p>
      </div>
      <Suspense fallback={<div className="h-96 rounded-card border border-line" />}>
        <FeedbackSection />
      </Suspense>
    </main>
  );
}

async function FeedbackSection() {
  if (!(await getCurrentUser())) redirect("/login");
  return <FeedbackForm />;
}
