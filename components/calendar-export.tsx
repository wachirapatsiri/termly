"use client";

import { useState } from "react";
import { icsQuery, NO_COURSE } from "@/lib/ics";
import { useT } from "@/components/lang";

// จำนวนรายการที่มีวันแล้ว (ส่งออกได้) ต่อวิชา — คำนวณฝั่งเซิร์ฟเวอร์ในหน้า ⚙
export type ExportCourse = {
  id: string; // NO_COURSE = ไม่มีวิชา
  label: string;
  pending: number;
  done: number;
  exams: number;
};

export function CalendarExport({
  courses,
  undated,
}: {
  courses: ExportCourse[];
  undated: number; // งาน/สอบที่ยังไม่มีวัน (ไม่ใส่ลงไฟล์)
}) {
  const tr = useT();
  const [pending, setPending] = useState(true);
  const [done, setDone] = useState(false);
  const [exams, setExams] = useState(true);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(courses.map((c) => c.id)));

  const allPicked = picked.size === courses.length;
  const chosen = courses.filter((c) => picked.has(c.id));
  const sum = (k: "pending" | "done" | "exams") => chosen.reduce((n, c) => n + c[k], 0);
  const total = (pending ? sum("pending") : 0) + (done ? sum("done") : 0) + (exams ? sum("exams") : 0);

  const href = `/api/export-ics?${icsQuery({
    pending,
    done,
    exams,
    courses: allPicked ? null : [...picked],
  })}`;

  const toggleCourse = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section id="calendar" className="scroll-mt-6 space-y-4">
      <div className="space-y-1">
        <h2 className="font-medium">{tr("cal.title")}</h2>
        <p className="text-sm text-muted">
          {tr("cal.desc")}
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm text-muted">{tr("cal.include")}</legend>
        <Check checked={pending} onChange={setPending} label={tr("cal.pending")} count={sum("pending")} />
        <Check checked={done} onChange={setDone} label={tr("cal.done")} count={sum("done")} />
        <Check checked={exams} onChange={setExams} label={tr("cal.exams")} count={sum("exams")} />
      </fieldset>

      {courses.length > 1 && (
        <fieldset className="space-y-2">
          <div className="mb-2 flex items-baseline justify-between">
            <legend className="text-sm text-muted">{tr("cal.courses")}</legend>
            <button
              type="button"
              className="text-sm text-accent"
              onClick={() =>
                setPicked(allPicked ? new Set() : new Set(courses.map((c) => c.id)))
              }
            >
              {allPicked ? tr("cal.unpickAll") : tr("cal.pickAll")}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {courses.map((c) => (
              <label
                key={c.id}
                className={`flex cursor-pointer items-center gap-2 rounded-card border px-3 py-1.5 text-sm ${
                  picked.has(c.id) ? "border-accent bg-surface" : "border-line text-muted"
                }`}
              >
                <input
                  type="checkbox"
                  checked={picked.has(c.id)}
                  onChange={() => toggleCourse(c.id)}
                  className="h-4 w-4 accent-accent"
                />
                {c.id === NO_COURSE ? <span className="italic">{tr("set.noCourse")}</span> : c.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {total > 0 ? (
        <a
          href={href}
          download
          className="block rounded-card bg-accent px-4 py-3 text-center font-medium text-white"
        >
          {tr("cal.download", { n: total })}
        </a>
      ) : (
        <p className="rounded-card border border-line px-4 py-3 text-center text-muted">
          {tr("cal.empty")}
        </p>
      )}
      {undated > 0 && (
        <p className="text-xs text-muted">
          {tr("cal.undated", { n: undated })}
        </p>
      )}

      <details className="rounded-card border border-line bg-surface p-3 text-sm">
        <summary className="cursor-pointer font-medium">{tr("cal.howTitle")}</summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted">
          <li>{tr("cal.step1")}</li>
          <li>{tr("cal.step2")}</li>
          <li>{tr("cal.step3")}</li>
          <li>{tr("cal.step4")}</li>
          <li>{tr("cal.step5")}</li>
        </ol>
        <p className="mt-3 text-muted">
          <b className="text-foreground">iPhone:</b> {tr("cal.iphone")}
        </p>
      </details>
    </section>
  );
}

function Check({
  checked,
  onChange,
  label,
  count,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  count: number;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-card border bg-surface p-3 ${
        checked ? "border-accent" : "border-line"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-accent"
      />
      <span className="flex-1">{label}</span>
      <span className="text-sm text-muted">{count}</span>
    </label>
  );
}
