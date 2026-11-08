"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { courseLabel, type CourseLabelMode } from "@/lib/course-label";
import { useYearMode } from "@/components/year-mode";
import { formatDue, toDueAt } from "@/lib/dates";
import { MAX_IMAGES, MAX_TEXT_LENGTH, MAX_UPLOAD_BYTES } from "@/lib/ai/limits";
import { prepareImage } from "@/lib/image-resize";
import {
  KIND_CATEGORY,
  examTypeOf,
  type ExtractedTask,
  type ExtractResponse,
} from "@/lib/ai/schema";
import { courseKey } from "@/lib/ai/normalize";
import {
  EXAM_TYPES,
  EXAM_TYPE_LABEL,
  buildExamTimes,
  examsOverlap,
  formatExamTime,
  type ExamType,
  type TimedExam,
} from "@/lib/exams";
import {
  batchDuplicates,
  findDuplicate,
  findSimilarCourse,
  isLikelyDuplicate,
  type DupItem,
} from "@/lib/duplicates";
import type { Course, TaskCategory } from "@/lib/types";
import { saveImportedItems, type ImportItem } from "@/app/import/actions";

// courseChoice: "" = ไม่ระบุ, "new" = สร้างวิชาใหม่ตามที่ AI อ่านได้, อื่น ๆ = id วิชา
// typeChoice: "exam:<ชนิดสอบ>" = สอบ, "cat:<ชื่อประเภท>" = งาน, "new" = งานประเภทใหม่ (พิมพ์ใน customCategory)
type Row = ExtractedTask & {
  key: number; // ไว้ใช้เป็น React key (ลบการ์ดแล้วลำดับเลื่อน)
  checked: boolean;
  courseChoice: string;
  typeChoice: string;
  customCategory: string;
  edited: boolean; // ผู้ใช้แก้ชื่อ/วันที่/เวลาเองแล้ว
};

// ไฟล์ที่แนบ (ย่อรูปแล้ว) — preview = object URL ของรูปย่อ (PDF ไม่มี)
type Picked = { id: number; file: File; kind: "pdf" | "image"; preview: string | null };

const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
const isImage = (f: File) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name);
const formatBytes = (n: number) =>
  n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024)).toLocaleString("th-TH")} KB`
    : `${(n / 1024 / 1024).toLocaleString("th-TH", { maximumFractionDigits: 1 })} MB`;
let pickedId = 0;

// งาน/สอบที่บันทึกไว้แล้ว (ส่งมาจากหน้า /import) ใช้เตือนรายการซ้ำ + เวลาสอบชน
export type ExistingItem = DupItem & Partial<TimedExam>;

// เวลาสอบของการ์ด (null = ไม่ใช่สอบ หรือยังไม่รู้วัน/เวลา)
function rowTimes(r: Row): TimedExam | null {
  if (!isExamRow(r) || !r.due_date || !r.due_time) return null;
  const end = r.end_time && r.end_time > r.due_time ? r.end_time : null;
  const t = buildExamTimes(r.due_date, r.due_time, end);
  return t.ok ? t : null;
}

const NEW_TYPE = "new";
const isExamRow = (r: Row) => r.typeChoice.startsWith("exam:");

function toDupItem(r: Row): DupItem {
  const exam = isExamRow(r);
  return {
    kind: exam ? "exam" : "task",
    title: r.title,
    date: r.due_date,
    course_id:
      r.courseChoice === "new"
        ? `new:${courseKey(r.course_code ?? r.course_name ?? "")}`
        : r.courseChoice || null,
    exam_type: exam ? (r.typeChoice.slice("exam:".length) as ExamType) : null,
  };
}

function defaultType(t: ExtractedTask): string {
  const exam = examTypeOf(t.kind);
  if (exam) return `exam:${exam}`;
  return `cat:${KIND_CATEGORY[t.kind as keyof typeof KIND_CATEGORY] ?? KIND_CATEGORY.other}`;
}

function toRows(tasks: ExtractedTask[], existing: ExistingItem[]): Row[] {
  const rows: Row[] = tasks.map((t, i) => ({
    ...t,
    key: i,
    checked: true,
    courseChoice: t.course_id ?? (t.course_code || t.course_name ? "new" : ""),
    typeChoice: defaultType(t),
    customCategory: "",
    edited: false,
  }));
  // ไม่ติ๊กให้: ไม่มั่นใจ (ผู้ใช้ต้องตรวจแล้วติ๊กเอง) หรือน่าจะซ้ำกับของเดิม/ซ้ำกันเองในชุดนี้
  const batchDup = batchDuplicates(rows.map(toDupItem));
  return rows.map((r, i) => ({
    ...r,
    checked:
      r.confidence !== "low" && !batchDup.has(i) && !findDuplicate(toDupItem(r), existing),
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
  existing,
  labelMode,
}: {
  courses: Course[];
  categories: TaskCategory[];
  existing: ExistingItem[];
  labelMode: CourseLabelMode;
}) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<Picked[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mock, setMock] = useState<{ on: boolean; sources: string[]; files: boolean }>({
    on: false,
    sources: [],
    files: false,
  });
  const [rows, setRows] = useState<Row[] | null>(null);
  const [saving, startSaving] = useTransition();
  const [saved, setSaved] = useState<{
    tasks: number;
    exams: number;
    coursesCreated: number;
    categoriesCreated: number;
  } | null>(null);

  // คืนหน่วยความจำของรูปย่อเมื่อออกจากหน้า
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  useEffect(
    () => () => filesRef.current.forEach((f) => f.preview && URL.revokeObjectURL(f.preview)),
    [],
  );

  // เพิ่มไฟล์ (จากปุ่มแนบ / ลากวาง / วางรูปด้วย Ctrl+V): PDF 1 ไฟล์ หรือรูปไม่เกิน 5 รูป รวม ≤ 4 MB
  // เช็กซ้ำอีกรอบที่เซิร์ฟเวอร์ (lib/ai/files.ts) — ตรงนี้แค่ให้ผู้ใช้รู้ก่อนกดส่ง
  async function addFiles(incoming: File[]) {
    if (!incoming.length || preparing) return;
    setError(null);
    const bad = incoming.find((f) => !isPdf(f) && !isImage(f));
    if (bad) {
      setError(`ไฟล์ "${bad.name}" ไม่รองรับ ใช้ได้เฉพาะ PDF หรือรูป`);
      return;
    }
    const pdfs = incoming.filter(isPdf);
    const hasPdf = files.some((f) => f.kind === "pdf");
    if (pdfs.length && (pdfs.length > 1 || incoming.length > 1 || files.length > 0)) {
      setError("ส่ง PDF ได้ครั้งละ 1 ไฟล์ และไม่ปนกับรูป (เอาไฟล์เดิมออกก่อน)");
      return;
    }
    if (hasPdf) {
      setError("แนบ PDF ไว้แล้ว ส่ง PDF ได้ครั้งละ 1 ไฟล์ และไม่ปนกับรูป");
      return;
    }
    if (!pdfs.length && files.length + incoming.length > MAX_IMAGES) {
      setError(`ส่งรูปได้ครั้งละไม่เกิน ${MAX_IMAGES} รูป`);
      return;
    }

    setPreparing(true);
    try {
      const added: Picked[] = [];
      for (const f of incoming) {
        if (isPdf(f)) {
          added.push({ id: ++pickedId, file: f, kind: "pdf", preview: null });
          continue;
        }
        try {
          const small = await prepareImage(f);
          added.push({ id: ++pickedId, file: small, kind: "image", preview: URL.createObjectURL(small) });
        } catch {
          setError(`เปิดรูป "${f.name}" ไม่ได้ ลองแคปหน้าจอใหม่ หรือบันทึกเป็น JPG/PNG`);
          added.forEach((a) => a.preview && URL.revokeObjectURL(a.preview));
          return;
        }
      }
      const total = [...files, ...added].reduce((s, f) => s + f.file.size, 0);
      if (total > MAX_UPLOAD_BYTES) {
        added.forEach((a) => a.preview && URL.revokeObjectURL(a.preview));
        setError(
          `ไฟล์ใหญ่เกินไป (${formatBytes(total)}) รวมกันได้ไม่เกิน ${formatBytes(MAX_UPLOAD_BYTES)} — ลองแคปเฉพาะหน้าที่มีกำหนดส่ง หรือบีบอัด PDF ก่อน`,
        );
        return;
      }
      setFiles((prev) => [...prev, ...added]);
    } finally {
      setPreparing(false);
    }
  }

  function removeFile(id: number) {
    setFiles((prev) => {
      const f = prev.find((p) => p.id === id);
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return prev.filter((p) => p.id !== id);
    });
  }

  function clearFiles() {
    files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
    setFiles([]);
  }

  function onPaste(e: React.ClipboardEvent) {
    const pasted = [...e.clipboardData.files].filter(isImage);
    if (pasted.length) {
      e.preventDefault(); // วางรูปแคปหน้าจอ → แนบเป็นไฟล์ (ข้อความวางตามปกติ)
      void addFiles(pasted);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    void addFiles([...e.dataTransfer.files]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if ((!text.trim() && !files.length) || pending || preparing) return;
    setPending(true);
    setError(null);
    setRows(null);
    setSaved(null);
    try {
      let body: BodyInit;
      const headers: HeadersInit = {};
      if (files.length) {
        const form = new FormData();
        form.append("text", text);
        for (const f of files) form.append("files", f.file, f.file.name);
        body = form; // เบราว์เซอร์ใส่ Content-Type multipart ให้เอง
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify({ text });
      }
      const res = await fetch("/api/extract", { method: "POST", headers, body });
      const data = (await res.json().catch(() => null)) as ExtractResponse | null;
      if (!data) setError("เซิร์ฟเวอร์ตอบกลับผิดพลาด ลองใหม่อีกครั้ง");
      else if (!data.ok) setError(data.error);
      else {
        setRows(toRows(data.tasks, existing));
        setMock({ on: data.mock, sources: data.mock_sources ?? [], files: !!data.mock_files });
      }
    } catch {
      setError("เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่");
    } finally {
      setPending(false);
    }
  }

  function update(key: number, patch: Partial<Row>) {
    setRows((prev) => prev && prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function remove(key: number) {
    setRows((prev) => prev && prev.filter((r) => r.key !== key));
  }
  function checkAll(checked: boolean) {
    setRows((prev) => prev && prev.map((r) => ({ ...r, checked })));
  }

  function save() {
    if (!rows) return;
    const selected = rows.filter((r) => r.checked);
    if (selected.some((r) => !r.title.trim())) {
      setError("มีรายการที่ยังไม่มีชื่อ ใส่ชื่อก่อนบันทึก");
      return;
    }
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
        clearFiles();
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
  // เช็กซ้ำใหม่ทุกครั้งที่ผู้ใช้แก้ (ชื่อ/วัน/วิชา/ประเภทเปลี่ยน ผลก็เปลี่ยน)
  const dupItems = (rows ?? []).map(toDupItem);
  const batchDup = batchDuplicates(dupItems);
  // เวลาสอบชน: กับสอบที่บันทึกไว้แล้ว + สอบอื่นในชุดนี้ (ไม่นับตัวที่ถือว่าซ้ำ เพราะเป็นสอบเดียวกัน)
  const times = (rows ?? []).map(rowTimes);
  const overlapsOf = (i: number): string[] => {
    const me = times[i];
    if (!me) return [];
    const fromExisting = existing
      .filter((e) => e.kind === "exam" && e.has_time !== undefined)
      .filter((e) => !isLikelyDuplicate(dupItems[i], e))
      .filter((e) => examsOverlap(me, e as TimedExam))
      .map((e) => `${e.title} (${formatExamTime(e as TimedExam)})`);
    const fromBatch = (rows ?? [])
      .map((r, j) => ({ r, j }))
      .filter(({ j }) => j !== i && times[j] && !isLikelyDuplicate(dupItems[i], dupItems[j]))
      .filter(({ j }) => examsOverlap(me, times[j]!))
      .map(({ r, j }) => `${r.title} (${formatExamTime(times[j]!)})`);
    return [...fromExisting, ...fromBatch];
  };
  const indexed = (rows ?? []).map((r, i) => ({
    r,
    dupExisting: findDuplicate(dupItems[i], existing),
    dupBatch: batchDup.has(i),
    overlaps: overlapsOf(i),
  }));
  const exams = indexed.filter(({ r }) => isExamRow(r));
  const tasks = indexed.filter(({ r }) => !isExamRow(r));
  const checkedExams = exams.filter(({ r }) => r.checked).length;
  const checkedTasks = tasks.filter(({ r }) => r.checked).length;
  const allChecked = indexed.length > 0 && indexed.every(({ r }) => r.checked);

  const renderCard = ({ r, dupExisting, dupBatch, overlaps }: (typeof indexed)[number]) => (
    <ExtractedCard
      key={r.key}
      row={r}
      courses={courses}
      categoryNames={categoryNames}
      labelMode={labelMode}
      dupExisting={dupExisting}
      dupBatch={dupBatch}
      overlaps={overlaps}
      onChange={(patch) => update(r.key, patch)}
      onRemove={() => remove(r.key)}
    />
  );

  return (
    <div className="space-y-8">
      <form
        onSubmit={submit}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className="space-y-3"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={onPaste}
          rows={files.length ? 3 : 10}
          placeholder={
            files.length
              ? "พิมพ์อธิบายเพิ่มได้ (ไม่บังคับ) เช่น นี่คือวิชา 204383"
              : "วางข้อความ เช่น\n204383 Image Processing\nการบ้าน 2 Due: Fri, 3 Jul 2026 12:30\nสอบกลางภาค วันศุกร์ที่ 28 สิงหาคม พ.ศ. 2569 เวลา 8:00 – 11:00 น.\n\nหรือแนบ PDF / รูปแคปหน้าจอด้านล่าง"
          }
          className={`w-full rounded-card border bg-white px-3 py-2 text-base outline-none focus:border-accent ${
            dragging ? "border-accent" : "border-line"
          }`}
        />

        <div className="space-y-2">
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf,image/*,.heic,.heif"
            multiple
            hidden
            onChange={(e) => {
              void addFiles([...(e.target.files ?? [])]);
              e.target.value = ""; // เลือกไฟล์เดิมซ้ำได้
            }}
          />
          {files.length > 0 && (
            <ul className="space-y-2">
              {files.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-3 rounded-card border border-line bg-white p-2 text-sm"
                >
                  {f.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element -- รูปย่อจาก object URL ในเครื่อง
                    <img src={f.preview} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-background text-xl">
                      📄
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{f.file.name}</span>
                    <span className="text-xs text-muted">{formatBytes(f.file.size)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(f.id)}
                    disabled={pending}
                    aria-label={`เอา ${f.file.name} ออก`}
                    className="px-2 text-muted hover:text-foreground"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={pending || preparing || files.some((f) => f.kind === "pdf") || files.length >= MAX_IMAGES}
              className="rounded-card border border-line bg-white px-3 py-1.5 text-sm disabled:opacity-50"
            >
              {preparing ? "กำลังเตรียมรูป…" : files.length ? "📎 เพิ่มรูป" : "📎 แนบ PDF / รูป"}
            </button>
            <span className="text-xs text-muted">
              PDF 1 ไฟล์ หรือรูปไม่เกิน {MAX_IMAGES} รูป รวมไม่เกิน {formatBytes(MAX_UPLOAD_BYTES)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className={`text-xs ${tooLong ? "text-red-700" : "text-muted"}`}>
            {text.length.toLocaleString("th-TH")} / {MAX_TEXT_LENGTH.toLocaleString("th-TH")}
          </span>
          <button
            type="submit"
            disabled={pending || preparing || (!text.trim() && !files.length) || tooLong}
            className="rounded-card bg-accent px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {pending ? (files.length ? "AI กำลังอ่านไฟล์…" : "AI กำลังอ่าน…") : "ให้ AI ดึงงาน"}
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
              {mock.files && (
                <p>
                  🧪 โหมดจำลองยังอ่านไฟล์จริงไม่ได้ (ยังไม่ได้เชื่อม AI) — รายการด้านล่างเป็นตัวอย่าง
                  ไม่ได้มาจากไฟล์ที่แนบ
                </p>
              )}
              {mock.files && !mock.sources.length ? null : mock.sources.length ? (
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
            <h2 className="text-sm text-muted">ไม่มีงานหรือวันสอบเหลือให้บันทึก</h2>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted">
                {exams.length > 0 && `${exams.length} สอบ`}
                {exams.length > 0 && tasks.length > 0 && " และ "}
                {tasks.length > 0 && `${tasks.length} งาน`} — ตรวจ แก้ แล้วติ๊กรายการที่จะบันทึก
              </p>
              <button
                type="button"
                onClick={() => checkAll(!allChecked)}
                className="text-sm text-accent"
              >
                {allChecked ? "ไม่ติ๊กทั้งหมด" : "ติ๊กทั้งหมด"}
              </button>
            </div>
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

const editInput =
  "w-full rounded-card border border-line bg-white px-2 py-1.5 text-base outline-none focus:border-accent";

function ExtractedCard({
  row,
  courses,
  categoryNames,
  labelMode,
  dupExisting,
  dupBatch,
  overlaps,
  onChange,
  onRemove,
}: {
  row: Row;
  courses: Course[];
  categoryNames: string[];
  labelMode: CourseLabelMode;
  dupExisting?: ExistingItem;
  dupBatch: boolean;
  overlaps: string[]; // สอบที่เวลาชนกัน
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
}) {
  const yearMode = useYearMode();
  const [editing, setEditing] = useState(false);
  const low = row.confidence === "low";
  const exam = isExamRow(row);
  const canCreate = Boolean(row.course_code || row.course_name);
  const dayIso = row.due_date ? toDueAt(row.due_date) : null;
  const dueIso = row.due_date ? toDueAt(row.due_date, row.due_time) : null;

  // แก้วันที่/เวลาเอง = ผู้ใช้ยืนยันแล้ว → ล้างคำเตือนเรื่องวันที่ของ AI
  const editDate = (patch: Partial<Row>) =>
    onChange({ ...patch, edited: true, warnings: [], confidence: "high" });
  const badEnd = Boolean(exam && row.due_time && row.end_time && row.end_time <= row.due_time);
  // จะสร้างวิชาใหม่ แต่มีวิชาที่คล้ายกันอยู่แล้ว (รหัสเดียวกัน/ชื่อคล้าย)
  const similarCourse =
    row.courseChoice === "new"
      ? findSimilarCourse(
          { name: row.course_name ?? row.course_code ?? "", code: row.course_code },
          courses,
        )
      : undefined;

  return (
    <li
      className={`space-y-2 rounded-card border px-4 py-3 ${
        low ? "border-amber-300 bg-amber-50" : "border-line bg-white"
      } ${row.checked ? "" : "opacity-80"}`}
    >
      {editing && (
        <div className="space-y-2 rounded-card border border-accent/40 bg-white p-3">
          <label className="block space-y-1">
            <span className="text-xs text-muted">ชื่อ</span>
            <input
              value={row.title}
              onChange={(e) => onChange({ title: e.target.value, edited: true })}
              maxLength={300}
              className={editInput}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted">{exam ? "วันสอบ" : "วันส่ง"}</span>
            <input
              type="date"
              value={row.due_date ?? ""}
              onChange={(e) =>
                editDate(
                  e.target.value
                    ? { due_date: e.target.value }
                    : { due_date: null, due_time: null, end_time: null },
                )
              }
              className={editInput}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="text-xs text-muted">{exam ? "เวลาเริ่ม" : "เวลาส่ง"}</span>
              <input
                type="time"
                value={row.due_time ?? ""}
                disabled={!row.due_date}
                onChange={(e) => editDate({ due_time: e.target.value || null })}
                className={editInput}
              />
            </label>
            {exam && (
              <label className="block space-y-1">
                <span className="text-xs text-muted">เวลาจบ</span>
                <input
                  type="time"
                  value={row.end_time ?? ""}
                  disabled={!row.due_date}
                  onChange={(e) => editDate({ end_time: e.target.value || null })}
                  className={editInput}
                />
              </label>
            )}
          </div>
          {exam && (
            <label className="block space-y-1">
              <span className="text-xs text-muted">สถานที่</span>
              <input
                value={row.location ?? ""}
                onChange={(e) => onChange({ location: e.target.value || null, edited: true })}
                maxLength={300}
                className={editInput}
              />
            </label>
          )}
          <label className="block space-y-1">
            <span className="text-xs text-muted">หมายเหตุ</span>
            <textarea
              value={row.note ?? ""}
              onChange={(e) => onChange({ note: e.target.value || null, edited: true })}
              rows={2}
              maxLength={2000}
              className={editInput}
            />
          </label>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="w-full rounded-card bg-accent px-3 py-2 text-sm text-white"
          >
            เสร็จ
          </button>
        </div>
      )}

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={row.checked}
          onChange={(e) => onChange({ checked: e.target.checked })}
          className="mt-1 size-4 accent-[var(--color-accent)]"
        />
        <span className="space-y-1">
          <span className="block font-medium break-words">
            {row.title || <Missing>ยังไม่มีชื่อ</Missing>}
          </span>
          {exam ? (
            <span className="block space-y-0.5 text-sm">
              <span className="block">
                {dayIso ? formatDue(dayIso, false, yearMode) : <Missing>ไม่ระบุวันสอบ</Missing>}
                {row.confidence === "medium" && <span className="text-muted"> · ควรตรวจ</span>}
              </span>
              {dayIso && (
                <span className="block">
                  {row.due_time ? (
                    `${row.due_time}${row.end_time && !badEnd ? `–${row.end_time}` : ""} น.`
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
              {dueIso ? formatDue(dueIso, Boolean(row.due_time), yearMode) : "ยังไม่กำหนดวันส่ง"}
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
        {badEnd && <p className="text-xs text-amber-800">⚠ เวลาจบต้องหลังเวลาเริ่ม (จะไม่บันทึกเวลาจบ)</p>}
        {dupExisting && (
          <p className="text-xs text-amber-800">
            ⚠ อาจซ้ำกับ{dupExisting.kind === "exam" ? "สอบ" : "งาน"}ที่บันทึกไว้แล้ว: “{dupExisting.title}”
          </p>
        )}
        {dupBatch && <p className="text-xs text-amber-800">⚠ ซ้ำกับรายการอื่นในชุดนี้</p>}
        {overlaps.length > 0 && (
          <p className="text-xs text-red-700">⚠ เวลาชนกับ {overlaps.join(", ")}</p>
        )}
        {similarCourse && (
          <p className="text-xs text-amber-800">
            ⚠ มีวิชา “{courseLabel(similarCourse, "both")}” อยู่แล้ว — ถ้าเป็นวิชาเดียวกัน
            เลือกจากช่องวิชาแทนการเพิ่มใหม่
          </p>
        )}
        {low && !row.checked && (
          <p className="text-xs text-amber-800">ตรวจกับต้นฉบับแล้วติ๊กเพื่อยืนยัน</p>
        )}
        {row.edited && <p className="text-xs text-muted">✎ แก้ไขแล้ว</p>}

        {!editing && (
          <div className="flex gap-4 pt-1 text-sm">
            <button type="button" onClick={() => setEditing(true)} className="text-accent">
              แก้ไข
            </button>
            <button type="button" onClick={onRemove} className="text-red-600">
              เอาออก
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
