import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourseLabelMode, getYearMode } from "@/lib/preferences";
import { AppNav } from "@/components/app-nav";
import { CategoryManager } from "@/components/category-manager";
import { CourseLabelSetting } from "@/components/course-label-setting";
import { YearModeSetting } from "@/components/year-mode-setting";
import { SignOutButton } from "@/components/sign-out-button";
import { InstallApp } from "@/components/install-app";

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
  const [mode, yearMode, sampleRes, categoriesRes, taskCatsRes] = await Promise.all([
    getCourseLabelMode(),
    getYearMode(),
    // ใช้วิชาที่มีรหัสเป็นตัวอย่างในพรีวิว
    supabase.from("courses").select("name, code").not("code", "is", null).limit(1),
    supabase
      .from("task_categories")
      .select("id, name")
      .order("position")
      .order("created_at"),
    // นับว่าแต่ละประเภทมีกี่งาน (โชว์ตอนจะลบ)
    supabase.from("tasks").select("category_id").not("category_id", "is", null),
  ]);
  const sample = sampleRes.data?.[0] ?? { name: "สถิติเบื้องต้น", code: "DS101" };
  if (categoriesRes.error) console.error("load categories", categoriesRes.error);
  const counts = new Map<string, number>();
  for (const t of taskCatsRes.data ?? []) {
    if (t.category_id) counts.set(t.category_id, (counts.get(t.category_id) ?? 0) + 1);
  }
  const categories = (categoriesRes.data ?? []).map((c) => ({
    ...c,
    taskCount: counts.get(c.id) ?? 0,
  }));

  return (
    <div className="space-y-8">
      <CourseLabelSetting current={mode} sample={sample} />

      <div className="border-t border-line pt-6">
        <YearModeSetting current={yearMode} sampleIso={new Date().toISOString()} />
      </div>

      <div className="border-t border-line pt-6">
        <CategoryManager categories={categories} />
      </div>

      <div className="border-t border-line pt-6">
        <InstallApp />
      </div>

      <section className="space-y-3 border-t border-line pt-6">
        <p className="text-sm text-muted">เข้าสู่ระบบเป็น {user.email}</p>
        <SignOutButton />
      </section>
    </div>
  );
}
