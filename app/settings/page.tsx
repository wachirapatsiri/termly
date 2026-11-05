import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourseLabelMode } from "@/lib/preferences";
import { AppNav } from "@/components/app-nav";
import { CourseLabelSetting } from "@/components/course-label-setting";
import { SignOutButton } from "@/components/sign-out-button";

export default function SettingsPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-8 px-6 py-6">
      <AppNav current="/settings" />
      <h1 className="text-2xl font-semibold tracking-tight">ตั้งค่า</h1>

      <Suspense fallback={<div className="h-64 rounded-card border border-line" />}>
        <SettingsSection />
      </Suspense>
    </main>
  );
}

async function SettingsSection() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [mode, sampleRes] = await Promise.all([
    getCourseLabelMode(),
    // ใช้วิชาที่มีรหัสเป็นตัวอย่างในพรีวิว
    supabase.from("courses").select("name, code").not("code", "is", null).limit(1),
  ]);
  const sample = sampleRes.data?.[0] ?? { name: "สถิติเบื้องต้น", code: "DS101" };

  return (
    <div className="space-y-8">
      <CourseLabelSetting current={mode} sample={sample} />

      <section className="space-y-3 border-t border-line pt-6">
        <p className="text-sm text-muted">เข้าสู่ระบบเป็น {user.email}</p>
        <SignOutButton />
      </section>
    </div>
  );
}
