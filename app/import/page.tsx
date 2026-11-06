import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourseLabelMode } from "@/lib/preferences";
import type { Course } from "@/lib/types";
import { AppNav } from "@/components/app-nav";
import { ImportForm } from "@/components/import-form";

export default function ImportPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-8 px-6 py-6">
      <AppNav current="/import" />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">นำเข้างาน</h1>
        <p className="text-sm text-muted">
          วางข้อความจากซิลลาบัสหรือประกาศของอาจารย์ แล้วให้ AI ช่วยหางานและวันส่ง
        </p>
      </div>

      <Suspense fallback={<div className="h-64 rounded-card border border-line" />}>
        <ImportSection />
      </Suspense>
    </main>
  );
}

async function ImportSection() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [coursesRes, labelMode] = await Promise.all([
    supabase.from("courses").select("id, name, code"),
    getCourseLabelMode(),
  ]);
  const courses: Course[] = coursesRes.data ?? [];

  return <ImportForm courses={courses} labelMode={labelMode} />;
}
