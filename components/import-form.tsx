"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { courseLabel, type CourseLabelMode } from "@/lib/course-label";
import { formatDue, toDueAt } from "@/lib/dates";
import { MAX_TEXT_LENGTH } from "@/lib/ai/limits";
import {
  EXAM_TYPE_LABEL,
  KIND_CATEGORY,
  examTypeOf,
  type ExamType,
  type ExtractedTask,
  type ExtractResponse,
} from "@/lib/ai/schema";
import type { Course, TaskCategory } from "@/lib/types";
import { saveImportedItems, type ImportItem } from "@/app/import/actions";

// courseChoice: "" = ไม่ระบุ, "new" = สร้างวิชาใหม่ตามที่ AI อ่านได้, อื่น ๆ = id วิชา
// typeChoice: "exam:<ชนิดสอบ>" = สอบ, "cat:<ชื่อประเภท>" = งาน, "new" = งานประเภทใหม่ (พิมพ์ใน customCategory)
type Row = ExtractedTask & {
  checked: boolean;
  courseChoice: string;
  typeChoice: string;
  customCategory: string;
};

const NEW_TYPE = "new";
const EXAM_TYPES: ExamType[] = ["midterm", "final", "other"];
const isExamRow = (r: Row) => r.typeChoice.startsWith("exam:");

function defaultType(t: ExtractedTask): string {
  const exam = examTypeOf(t.kind);
  if (exam) return `exam:${exam}`;
  return `cat:${KIND_CATEGORY[t.kind as keyof typeof KIND_CATEGORY] ?? KIND_CATEGORY.other}`;
}

function toRows(tasks: ExtractedTask[]): Row[] {
  return tasks.map((t) => ({
    ...t,
    // ไม่มั่นใจ = ไม่ติ๊กให้ ผู้ใช้ต้องตรวจแล้วติ๊กเอง (ยืนยันก่อนบันทึก)
    checked: t.confidence !== "low",
    courseChoice: t.course_id ?? (t.course_code || t.course_name ? "new" : ""),
    typeChoice: defaultType(t),
    customCategory: "",
  }));
}

function newCourseLabel(t: ExtractedTask) {
  return [t.course_code, t.course_name].filter(Boolean).join(" ");
}

function toItem(r: Row): ImportItem {
  const course: ImportItem["course"] =
    r.courseChoice === "new"
      ? { code: r.course_code, name: r.course_name ?? r.course_code ?? "" }
      : r.courseChoice
        ? { id: r.courseChoice }
        : null;
  const type: ImportItem["type"] = isExamRow(r)
    ? {
        exam: r.typeChoice.slice("exam:".length) as ExamType,
        end_time: r.end_time,
        location: r.location,
      }
    : {
        category:
          r.typeChoice === NEW_TYPE
            ? r.customCategory.trim()
            : r.typeChoice.slice("cat:".length) || null,
      };
  return { title: r.title, due_date: r.due_date, due_time: r.due_time, note: r.note, course, type };
}

export function ImportForm({
  courses,
  categories,
  labelMode,
}: {
  courses: Course[];
  categories: TaskCategory[];
  labelMode: CourseLabelMode;
}) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mock, setMock] = useState<{ on: boolean; sources: string[] }>({ on: false, sources: [] });
  const [rows, setRows] = useState<Row[] | null>(null);
  const [saving, startSaving] = useTransition();
  const [saved, setSaved] = useState<{
    tasks: number;
    exams: number;
    coursesCreated: number;
    categoriesCreated: number;
  } | null>(null);

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
        setMock({ on: data.mock, sources: data.mock_sources ?? [] });
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
    const selected = rows.filter((r) => r.checked);
    if (selected.some((r) => r.typeChoice === NEW_TYPE && !r.customCategory.trim())) {
      setError("พิมพ์ชื่อประเภทงานใหม่ให้ครบก่อนบันทึก");
      return;
    }
    setError(null);
    startSaving(async () => {
      const res = await saveImportedItems(selected.map(toItem));
      if (!res.ok) setError(res.error);
      else {
        setSaved(res);
        setRows(null);
        setText("");
      }
    });
  }

  // ชื่อประเภทงานที่มีให้เลือก: ของผู้ใช้ + ที่ AI แนะนำแต่ยังไม่มี (เช่น ผู้ใช้เคยลบไป) → จะสร้างให้ตอนบันทึก
  const categoryNames = [...categories.map((c) => c.name)];
  for (const r of rows ?? []) {
    const name = r.typeChoice.startsWith("cat:") ? r.typeChoice.slice(4) : null;
    if (name && !categoryNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
      categoryNames.push(name);
    }
  }

  const tooLong = text.length > MAX_TEXT_LENGTH;
  const indexed = (rows ?? []).map((r, i) => ({ r, i }));
  const exams = indexed.filter(({ r }) => isExamRow(r));
  const tasks = indexed.filter(({ r }) => !isExamRow(r));
  const checkedExams = exams.filter(({ r }) => r.checked).length;
  const checkedTasks = tasks.filter(({ r }) => r.checked).length;

  const renderCard = ({ r, i }: { r: Row; i: number }) => (
    <ExtractedCard
      key={i}
      row={r}
      courses={courses}
      categoryNames={categoryNames}
      labelMode={labelMode}
      onChange={(patch) => update(i, patch)}
    />
  );

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={"เช่น\n204383 Image Processing\nการบ้าน 2 Due: Fri, 3 Jul 2026 12:30\nสอบกลางภาค วันศุกร์ที่ 28 สิงหาคม พ.ศ. 2569 เวลา 8:00 – 11:00 น."}
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
            ✓ บันทึก
            {[
              saved.tasks > 0 && ` ${saved.tasks} งาน`,
              saved.exams > 0 && ` ${saved.exams} สอบ`,
            ]
              .filter(Boolean)
              .join(" และ")}{" "}
            แล้ว
          </p>
          {(saved.coursesCreated > 0 || saved.categoriesCreated > 0) && (
            <p className="text-muted">
              เพิ่มใหม่:
              {[
                saved.coursesCreated > 0 && ` วิชา ${saved.coursesCreated}`,
                saved.categoriesCreated > 0 && ` ประเภทงาน ${saved.categoriesCreated}`,
              ]
                .filter(Boolean)
                .join(",")}
            </p>
          )}
          <Link href="/tasks" className="text-accent underline">
            ไปดูรายการงาน
          </Link>
        </div>
      )}

      {rows && (
        <section className="space-y-6">
          {mock.on && (
            <div className="space-y-1 rounded-card border border-line bg-white px-3 py-2 text-sm text-muted">
              {mock.sources.length ? (
                <>
                  <p>🧪 โหมดจำลอง: ใช้คำตอบที่เตรียมไว้สำหรับ</p>
                  <ul className="list-disc pl-5">
                    {mock.sources.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>
                  🧪 โหมดจำลอง: ยังไม่ได้เชื่อม AI จริง และข้อความนี้ไม่ตรงกับเอกสารตัวอย่าง
                  รายการด้านล่างเป็นตัวอย่างทั่วไป
                </p>
              )}
            </div>
          )}

          {rows.length === 0 ? (
            <h2 className="text-sm text-muted">AI ไม่เจองานหรือวันสอบในข้อความนี้</h2>
          ) : (
            <p className="text-sm text-muted">
              AI เจอ {exams.length > 0 && `${exams.length} สอบ`}
              {exams.length > 0 && tasks.length > 0 && " และ "}
              {tasks.length > 0 && `${tasks.length} งาน`} — ตรวจแล้วติ๊กรายการที่จะบันทึก
            </p>
          )}

          {exams.length > 0 && (
            <div className="space-y-2">
              <h2 className="font-medium">📝 ตารางสอบ</h2>
              <ul className="space-y-2">{exams.map(renderCard)}</ul>
            </div>
          )}

          {tasks.length > 0 && (
            <div className="space-y-2">
              <h2 className="font-medium">งาน</h2>
              <ul className="space-y-2">{tasks.map(renderCard)}</ul>
            </div>
          )}

          {rows.length > 0 && (
            <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-card border border-line bg-white px-4 py-3">
              <span className="text-sm text-muted">
                เลือก {checkedExams > 0 && `${checkedExams} สอบ · `}
                {checkedTasks} งาน
              </span>
              <button
                type="button"
                onClick={save}
                disabled={saving || checkedExams + checkedTasks === 0}
                className="rounded-card bg-accent px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก…" : "บันทึกที่เลือก"}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Missing({ children }: { children: React.ReactNode }) {
  return <span className="text-amber-800">⚠ {children}</span>;
}

function ExtractedCard({
  row,
  courses,
  categoryNames,
  labelMode,
  onChange,
}: {
  row: Row;
  courses: Course[];
  categoryNames: string[];
  labelMode: CourseLabelMode;
  onChange: (patch: Partial<Row>) => void;
}) {
  const low = row.confidence === "low";
  const exam = isExamRow(row);
  const canCreate = Boolean(row.course_code || row.course_name);
  const dayIso = row.due_date ? toDueAt(row.due_date) : null;
  const dueIso = row.due_date ? toDueAt(row.due_date, row.due_time) : null;

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
          {exam ? (
            <span className="block space-y-0.5 text-sm">
              <span className="block">
                {dayIso ? formatDue(dayIso, false) : <Missing>ไม่ระบุวันสอบ</Missing>}
                {row.confidence === "medium" && <span className="text-muted"> · ควรตรวจ</span>}
              </span>
              {dayIso && (
                <span className="block">
                  {row.due_time ? (
                    `${row.due_time}${row.end_time ? `–${row.end_time}` : ""} น.`
                  ) : (
                    <Missing>ไม่ระบุเวลา</Missing>
                  )}
                </span>
              )}
              <span className="block">
                {row.location ? `📍 ${row.location}` : <Missing>ไม่ระบุสถานที่</Missing>}
              </span>
            </span>
          ) : (
            <span className="block text-sm">
              {dueIso ? formatDue(dueIso, Boolean(row.due_time)) : "ยังไม่กำหนดวันส่ง"}
              {row.confidence === "medium" && <span className="text-muted"> · ควรตรวจ</span>}
            </span>
          )}
        </span>
      </label>

      <div className="space-y-1 pl-7">
        <div className="space-y-2">
          <select
            value={row.typeChoice}
            onChange={(e) => onChange({ typeChoice: e.target.value })}
            aria-label="ประเภท"
            className="w-full rounded-card border border-line bg-white px-2 py-1.5 text-sm"
          >
            <optgroup label="สอบ">
              {EXAM_TYPES.map((t) => (
                <option key={t} value={`exam:${t}`}>
                  📝 {EXAM_TYPE_LABEL[t]}
                </option>
              ))}
            </optgroup>
            <optgroup label="งาน">
              {categoryNames.map((n) => (
                <option key={n} value={`cat:${n}`}>
                  {n}
                </option>
              ))}
              <option value={NEW_TYPE}>+ พิมพ์ประเภทใหม่…</option>
            </optgroup>
          </select>
          {row.typeChoice === NEW_TYPE && (
            <input
              value={row.customCategory}
              onChange={(e) => onChange({ customCategory: e.target.value })}
              maxLength={30}
              placeholder="ชื่อประเภท เช่น Workshop"
              aria-label="ชื่อประเภทใหม่"
              className="w-full rounded-card border border-line bg-white px-2 py-1.5 text-base outline-none focus:border-accent"
            />
          )}
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
        </div>
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
