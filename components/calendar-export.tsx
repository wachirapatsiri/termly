"use client";

import { useState } from "react";
import { icsQuery, NO_COURSE } from "@/lib/ics";

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
        <h2 className="font-medium">📅 ส่งออกไปปฏิทิน</h2>
        <p className="text-sm text-muted">
          ได้ไฟล์ .ics ไปนำเข้า Google Calendar / ปฏิทิน iPhone · เตือนล่วงหน้า 1 วัน
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm text-muted">ใส่อะไรบ้าง</legend>
        <Check checked={pending} onChange={setPending} label="งานที่ยังไม่เสร็จ" count={sum("pending")} />
        <Check checked={done} onChange={setDone} label="งานที่เสร็จแล้ว" count={sum("done")} />
        <Check checked={exams} onChange={setExams} label="วันสอบ" count={sum("exams")} />
      </fieldset>

      {courses.length > 1 && (
        <fieldset className="space-y-2">
          <div className="mb-2 flex items-baseline justify-between">
            <legend className="text-sm text-muted">วิชา</legend>
            <button
              type="button"
              className="text-sm text-accent"
              onClick={() =>
                setPicked(allPicked ? new Set() : new Set(courses.map((c) => c.id)))
              }
            >
              {allPicked ? "ไม่เลือกทั้งหมด" : "เลือกทั้งหมด"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {courses.map((c) => (
              <label
                key={c.id}
                className={`flex cursor-pointer items-center gap-2 rounded-card border px-3 py-1.5 text-sm ${
                  picked.has(c.id) ? "border-accent bg-white" : "border-line text-muted"
                }`}
              >
                <input
                  type="checkbox"
                  checked={picked.has(c.id)}
                  onChange={() => toggleCourse(c.id)}
                  className="h-4 w-4 accent-accent"
                />
                {c.id === NO_COURSE ? <span className="italic">ไม่มีวิชา</span> : c.label}
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
          ดาวน์โหลดไฟล์ปฏิทิน ({total} รายการ)
        </a>
      ) : (
        <p className="rounded-card border border-line px-4 py-3 text-center text-muted">
          ยังไม่มีรายการที่ส่งออกได้ ลองเลือกเพิ่ม
        </p>
      )}
      {undated > 0 && (
        <p className="text-xs text-muted">
          ไม่รวม {undated} รายการที่ยังไม่มีวันส่ง/วันสอบ — เติมวันก่อนแล้วส่งออกใหม่
        </p>
      )}

      <details className="rounded-card border border-line bg-white p-3 text-sm">
        <summary className="cursor-pointer font-medium">วิธีนำเข้า Google Calendar</summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted">
          <li>ดาวน์โหลดไฟล์จากปุ่มด้านบน</li>
          <li>
            เปิด <span className="text-foreground">calendar.google.com</span> บน
            <b className="text-foreground">คอมพิวเตอร์</b> (แอป Google Calendar ในมือถือนำเข้าไฟล์ไม่ได้
            — ถ้าดาวน์โหลดในมือถือ ส่งไฟล์เข้าคอมก่อน)
          </li>
          <li>
            แนะนำ: สร้างปฏิทินใหม่ชื่อ &quot;Termly&quot; ก่อน (⚙ การตั้งค่า → เพิ่มปฏิทิน →
            สร้างปฏิทินใหม่) จะได้ซ่อน/ลบทั้งชุดได้ง่าย
          </li>
          <li>⚙ การตั้งค่า → นำเข้าและส่งออก → เลือกไฟล์ → เลือกปฏิทิน &quot;Termly&quot; → นำเข้า</li>
          <li>
            แก้งานใน Termly แล้ว ปฏิทินไม่อัปเดตเอง → ส่งออกแล้วนำเข้าใหม่ (รายการเดิมจะถูกแก้
            ไม่ซ้ำ; ถ้ายังซ้ำ ลบปฏิทิน &quot;Termly&quot; แล้วนำเข้าใหม่)
          </li>
        </ol>
        <p className="mt-3 text-muted">
          <b className="text-foreground">iPhone:</b> กดดาวน์โหลดใน Safari → &quot;เพิ่มทั้งหมด&quot;
          ลงปฏิทิน iPhone ได้เลย
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
      className={`flex cursor-pointer items-center gap-3 rounded-card border bg-white p-3 ${
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
