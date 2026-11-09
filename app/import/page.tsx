import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourseLabelMode } from "@/lib/preferences";
import { toBangkokParts } from "@/lib/dates";
import { isExamType } from "@/lib/exams";
import type { Course, TaskCategory } from "@/lib/types";
import { isMockMode } from "@/lib/ai/extract";
import { bangkokDayStartIso, summarizeUsage } from "@/lib/ai/usage";
import { AppNav } from "@/components/app-nav";
import { WithYearMode } from "@/components/with-year-mode";
import { ImportForm, type ExistingItem } from "@/components/import-form";

export default function ImportPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-8 px-6 py-6 lg:max-w-6xl lg:px-10">
      <AppNav current="/import" />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">✨ เพิ่มงานและสอบด้วย AI</h1>
        <p className="text-sm text-muted lg:max-w-2xl">
          วางข้อความ หรือแนบ PDF ซิลลาบัส / รูปแคปประกาศของอาจารย์ แล้ว AI จะช่วยหางาน วันส่ง
          และวันสอบ ให้ตรวจก่อนบันทึก
        </p>
      </div>

      <Suspense fallback={<div className="h-64 rounded-card border border-line" />}>
        <WithYearMode>
          <ImportSection />
        </WithYearMode>
      </Suspense>
    </main>
  );
}

async function ImportSection() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const today = toBangkokParts(new Date().toISOString()).date;
  const mock = isMockMode();
  const [coursesRes, categoriesRes, tasksRes, examsRes, labelMode, usageRes] = await Promise.all([
    supabase.from("courses").select("id, name, code"),
    supabase
      .from("task_categories")
      .select("id, name")
      .order("position")
      .order("created_at"),
    // งาน/สอบที่บันทึกไว้แล้ว → เตือนถ้านำเข้าซ้ำ (เช่น วางซิลลาบัสเดิมอีกรอบ)
    supabase.from("tasks").select("title, due_at, course_id"),
    supabase
      .from("events")
      .select("title, starts_at, ends_at, has_time, course_id, exam_type")
      .eq("kind", "exam"),
    getCourseLabelMode(),
    // "วันนี้ใช้ AI ไปแล้ว X/10" — โหมดจำลองไม่นับ จึงไม่ต้องอ่าน
    mock
      ? null
      : supabase.from("ai_usage").select("success").gte("created_at", bangkokDayStartIso(today)),
  ]);
  const usage = usageRes && !usageRes.error ? summarizeUsage(usageRes.data ?? []) : null;
  const courses: Course[] = coursesRes.data ?? [];
  const categories: TaskCategory[] = categoriesRes.data ?? [];
  const day = (iso: string | null) => (iso ? toBangkokParts(iso).date : null);
  const existing: ExistingItem[] = [
    ...(tasksRes.data ?? []).map((t) => ({
      kind: "task" as const,
      title: t.title,
      date: day(t.due_at),
      course_id: t.course_id,
    })),
    ...(examsRes.data ?? []).map((e) => ({
      kind: "exam" as const,
      title: e.title,
      date: day(e.starts_at),
      course_id: e.course_id,
      exam_type: isExamType(e.exam_type) ? e.exam_type : null,
      starts_at: e.starts_at,
      ends_at: e.ends_at,
      has_time: e.has_time,
    })),
  ];

  return (
    <ImportForm
      courses={courses}
      categories={categories}
      existing={existing}
      labelMode={labelMode}
      mock={mock}
      initialUsage={usage}
    />
  );
}
