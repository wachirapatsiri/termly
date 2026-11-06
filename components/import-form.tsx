"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { courseLabel, type CourseLabelMode } from "@/lib/course-label";
import { formatDue, toDueAt } from "@/lib/dates";
import { MAX_TEXT_LENGTH } from "@/lib/ai/limits";
import type { ExtractedTask, ExtractResponse } from "@/lib/ai/schema";
import type { Course } from "@/lib/types";
import { saveImportedTasks, type ImportItem } from "@/app/import/actions";

// ค่าในช่องเลือกวิชาของแต่ละการ์ด: "" = ไม่ระบุ, "new" = สร้างวิชาใหม่ตามที่ AI อ่านได้, อื่น ๆ = id วิชา
type Row = ExtractedTask & { checked: boolean; courseChoice: string };

function toRows(tasks: ExtractedTask[]): Row[] {
  return tasks.map((t) => ({
    ...t,
    // ไม่มั่นใจ = ไม่ติ๊กให้ ผู้ใช้ต้องตรวจแล้วติ๊กเอง (ยืนยันก่อนบันทึก)
    checked: t.confidence !== "low",
    courseChoice: t.course_id ?? (t.course_code || t.course_name ? "new" : ""),
  }));
}

function newCourseLabel(t: ExtractedTask) {
  return [t.course_code, t.course_name].filter(Boolean).join(" ");
}

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
  const [mock, setMock] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [saving, startSaving] = useTransition();
  const [saved, setSaved] = useState<{ saved: number; coursesCreated: number } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || pending) return;
    setPending(true);
    setError(null);
    setRows(null);
    setSaved(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json().catch(() => null)) as ExtractResponse | null;
      if (!data) setError("เซิร์ฟเวอร์ตอบกลับผิดพลาด ลองใหม่อีกครั้ง");
      else if (!data.ok) setError(data.error);
      else {
        setRows(toRows(data.tasks));
        setMock(data.mock);
      }
    } catch {
      setError("เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่");
    } finally {
      setPending(false);
    }
  }

  function update(i: number, patch: Partial<Row>) {
    setRows((prev) => prev && prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  function save() {
    if (!rows) return;
    const items: ImportItem[] = rows
      .filter((r) => r.checked)
      .map((r) => ({
        title: r.title,
        due_date: r.due_date,
        due_time: r.due_time,
        note: r.note,
        course:
          r.courseChoice === "new"
            ? { code: r.course_code, name: r.course_name ?? r.course_code ?? "" }
            : r.courseChoice
              ? { id: r.courseChoice }
              : null,
      }));
    setError(null);
    startSaving(async () => {
      const res = await saveImportedTasks(items);
      if (!res.ok) setError(res.error);
      else {
        setSaved({ saved: res.saved, coursesCreated: res.coursesCreated });
        setRows(null);
        setText("");
      }
    });
  }

  const tooLong = text.length > MAX_TEXT_LENGTH;
  const checkedCount = rows?.filter((r) => r.checked).length ?? 0;

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={"เช่น\n204383 Image Processing\nการบ้าน 2 Due: Fri, 3 Jul 2026 12:30\nสอบกลางภาค วันศุกร์ที่ 28 สิงหาคม พ.ศ. 2569 เวลา 8:00 น."}
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
      </form>

      {error && (
        <p role="alert" className="rounded-card border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {saved && (
        <div className="space-y-1 rounded-card border border-line bg-white px-4 py-3 text-sm">
          <p>
            ✓ บันทึก {saved.saved} งาน
            {saved.coursesCreated > 0 && ` และเพิ่มวิชาใหม่ ${saved.coursesCreated} วิชา`} แล้ว
          </p>
          <Link href="/tasks" className="text-accent underline">
            ไปดูรายการงาน
          </Link>
        </div>
      )}

      {rows && (
        <section className="space-y-3">
          {mock && (
            <p className="rounded-card border border-line bg-white px-3 py-2 text-sm text-muted">
              🧪 โหมดจำลอง: ยังไม่ได้เชื่อม AI จริง รายการด้านล่างเป็นตัวอย่าง (ไม่ขึ้นกับข้อความที่วาง)
            </p>
          )}
          <h2 className="text-sm text-muted">
            {rows.length
              ? `AI เจอ ${rows.length} งาน — ตรวจแล้วติ๊กงานที่จะบันทึก`
              : "AI ไม่เจองานที่มีกำหนดส่งในข้อความนี้"}
          </h2>
          <ul className="space-y-2">
            {rows.map((r, i) => (
              <ExtractedCard
                key={i}
                row={r}
                courses={courses}
                labelMode={labelMode}
                onChange={(patch) => update(i, patch)}
              />
            ))}
          </ul>
          {rows.length > 0 && (
            <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-card border border-line bg-white px-4 py-3">
              <span className="text-sm text-muted">เลือก {checkedCount} งาน</span>
              <button
                type="button"
                onClick={save}
                disabled={saving || checkedCount === 0}
                className="rounded-card bg-accent px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก…" : "บันทึกงานที่เลือก"}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ExtractedCard({
  row,
  courses,
  labelMode,
  onChange,
}: {
  row: Row;
  courses: Course[];
  labelMode: CourseLabelMode;
  onChange: (patch: Partial<Row>) => void;
}) {
  const low = row.confidence === "low";
  const dueIso = row.due_date ? toDueAt(row.due_date, row.due_time) : null;
  const canCreate = Boolean(row.course_code || row.course_name);

  return (
    <li
      className={`space-y-2 rounded-card border px-4 py-3 ${
        low ? "border-amber-300 bg-amber-50" : "border-line bg-white"
      } ${row.checked ? "" : "opacity-80"}`}
    >
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={row.checked}
          onChange={(e) => onChange({ checked: e.target.checked })}
          className="mt-1 size-4 accent-[var(--color-accent)]"
        />
        <span className="space-y-1">
          <span className="block font-medium">{row.title}</span>
          <span className="block text-sm">
            {dueIso ? formatDue(dueIso, Boolean(row.due_time)) : "ยังไม่กำหนดวันส่ง"}
            {row.confidence === "medium" && <span className="text-muted"> · ควรตรวจ</span>}
          </span>
        </span>
      </label>

      <div className="space-y-1 pl-7">
        <select
          value={row.courseChoice}
          onChange={(e) => onChange({ courseChoice: e.target.value })}
          aria-label="วิชา"
          className="w-full rounded-card border border-line bg-white px-2 py-1.5 text-sm"
        >
          <option value="">ไม่ระบุวิชา</option>
          {canCreate && !row.course_id && (
            <option value="new">+ เพิ่มวิชาใหม่: {newCourseLabel(row)}</option>
          )}
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {courseLabel(c, labelMode)}
            </option>
          ))}
        </select>
        {row.raw_date_text && (
          <p className="text-xs text-muted">ต้นฉบับ: “{row.raw_date_text}”</p>
        )}
        {row.note && <p className="text-xs text-muted">{row.note}</p>}
        {row.warnings.map((w) => (
          <p key={w} className="text-xs text-amber-800">
            ⚠ {w}
          </p>
        ))}
        {low && !row.checked && (
          <p className="text-xs text-amber-800">ตรวจกับต้นฉบับแล้วติ๊กเพื่อยืนยัน</p>
        )}
      </div>
    </li>
  );
}
