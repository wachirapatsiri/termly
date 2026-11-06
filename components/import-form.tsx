"use client";

import { useState } from "react";
import { courseLabel, type CourseLabelMode } from "@/lib/course-label";
import { formatDue, toDueAt } from "@/lib/dates";
import { MAX_TEXT_LENGTH } from "@/lib/ai/limits";
import type { ExtractedTask, ExtractResponse } from "@/lib/ai/schema";
import type { Course } from "@/lib/types";

// เซสชัน 5: วางข้อความ → AI → แสดงผลแบบดูอย่างเดียว
// (เซสชัน 6 จะเปลี่ยนการ์ดเป็นแบบแก้ไข/ติ๊กเลือก/บันทึกได้)
export function ImportForm({
  courses,
  labelMode,
}: {
  courses: Course[];
  labelMode: CourseLabelMode;
}) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ tasks: ExtractedTask[]; mock: boolean } | null>(
    null,
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || pending) return;
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json().catch(() => null)) as ExtractResponse | null;
      if (!data) setError("เซิร์ฟเวอร์ตอบกลับผิดพลาด ลองใหม่อีกครั้ง");
      else if (!data.ok) setError(data.error);
      else setResult({ tasks: data.tasks, mock: data.mock });
    } catch {
      setError("เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่");
    } finally {
      setPending(false);
    }
  }

  const courseById = new Map(courses.map((c) => [c.id, c]));
  const tooLong = text.length > MAX_TEXT_LENGTH;

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={"เช่น\nCS101 การบ้านบทที่ 2 ส่ง 20 พ.ย. 69 ก่อน 23.59 น.\nสอบกลางภาค 15 ธ.ค. 2569"}
          className="w-full rounded-card border border-line bg-white px-3 py-2 text-base outline-none focus:border-accent"
        />
        <div className="flex items-center justify-between gap-3">
          <span className={`text-xs ${tooLong ? "text-red-700" : "text-muted"}`}>
            {text.length.toLocaleString("th-TH")} / {MAX_TEXT_LENGTH.toLocaleString("th-TH")}
          </span>
          <button
            type="submit"
            disabled={pending || !text.trim() || tooLong}
            className="rounded-card bg-accent px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {pending ? "AI กำลังอ่าน…" : "ให้ AI ดึงงาน"}
          </button>
        </div>
        {error && (
          <p role="alert" className="rounded-card border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
      </form>

      {result && (
        <section className="space-y-3">
          {result.mock && (
            <p className="rounded-card border border-line bg-white px-3 py-2 text-sm text-muted">
              🧪 โหมดจำลอง: ยังไม่ได้เชื่อม AI จริง รายการด้านล่างเป็นตัวอย่าง
            </p>
          )}
          <h2 className="text-sm text-muted">
            {result.tasks.length
              ? `AI เจอ ${result.tasks.length} งาน — ตรวจก่อนบันทึก`
              : "AI ไม่เจองานที่มีกำหนดส่งในข้อความนี้"}
          </h2>
          <ul className="space-y-2">
            {result.tasks.map((t, i) => (
              <ExtractedCard
                key={i}
                task={t}
                course={t.course_id ? courseById.get(t.course_id) : undefined}
                labelMode={labelMode}
              />
            ))}
          </ul>
          {result.tasks.length > 0 && (
            <p className="text-xs text-muted">ปุ่มแก้ไขและบันทึกลงรายการงานจะมาในขั้นถัดไป</p>
          )}
        </section>
      )}
    </div>
  );
}

function ExtractedCard({
  task,
  course,
  labelMode,
}: {
  task: ExtractedTask;
  course?: Course;
  labelMode: CourseLabelMode;
}) {
  const low = task.confidence === "low";
  const dueIso = task.due_date ? toDueAt(task.due_date, task.due_time) : null;

  return (
    <li
      className={`space-y-1.5 rounded-card border px-4 py-3 ${
        low ? "border-amber-300 bg-amber-50" : "border-line bg-white"
      }`}
    >
      <p className="font-medium">{task.title}</p>
      <p className="text-sm">
        {dueIso ? formatDue(dueIso, Boolean(task.due_time)) : "ยังไม่กำหนดวันส่ง"}
        {task.confidence === "medium" && <span className="text-muted"> · ควรตรวจ</span>}
      </p>
      {(course || task.course_text) && (
        <p className="text-sm text-muted">
          {course ? courseLabel(course, labelMode) : `${task.course_text} (ยังไม่มีวิชานี้ในระบบ)`}
        </p>
      )}
      {task.raw_date_text && (
        <p className="text-xs text-muted">ต้นฉบับ: “{task.raw_date_text}”</p>
      )}
      {task.note && <p className="text-xs text-muted">{task.note}</p>}
      {task.warnings.map((w) => (
        <p key={w} className="text-xs text-amber-800">
          ⚠ {w}
        </p>
      ))}
    </li>
  );
}
