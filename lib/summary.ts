// สรุปตัวเลขบนหัวหน้า "งานของฉัน": สัปดาห์นี้กี่งาน (เสร็จกี่งาน) · เลยกำหนด · สอบถัดไป
// import ด้วยนามสกุล .ts เพื่อให้ `node --test` รันได้ตรง
import { dueGroup } from "./dates.ts";
import { upcomingExams } from "./exams.ts";
import { weekLoad, weekStartOf, type WeekLoad } from "./weeks.ts";

type SummaryTask = { due_at: string | null; done: boolean };

export type TaskSummary<E> = {
  weekTotal: number; // งานที่ครบกำหนดสัปดาห์นี้ (จันทร์–อาทิตย์) รวมที่เสร็จแล้ว — นับแบบเดียวกับมุมมองรายสัปดาห์
  weekDone: number;
  weekLoad: WeekLoad;
  overdue: number; // ยังไม่เสร็จและเลยเวลาส่งแล้ว (ทุกสัปดาห์)
  noDue: number; // ยังไม่เสร็จและยังไม่กำหนดวันส่ง
  nextExam: (E & { daysLeft: number }) | null; // สอบที่ใกล้ที่สุดที่ยังไม่ถึง (รวมวันนี้)
};

export function summarizeTasks<E extends { starts_at: string | null }>(
  tasks: SummaryTask[],
  exams: E[],
  now: Date = new Date(),
): TaskSummary<E> {
  const thisWeek = weekStartOf(now.toISOString());
  let weekTotal = 0;
  let weekDone = 0;
  let overdue = 0;
  let noDue = 0;
  for (const t of tasks) {
    if (!t.due_at) {
      if (!t.done) noDue++;
      continue;
    }
    if (weekStartOf(t.due_at) === thisWeek) {
      weekTotal++;
      if (t.done) weekDone++;
    }
    if (!t.done && dueGroup(t.due_at, now) === "overdue") overdue++;
  }
  const next = upcomingExams(exams, now, Number.POSITIVE_INFINITY)[0] ?? null;
  return { weekTotal, weekDone, weekLoad: weekLoad(weekTotal), overdue, noDue, nextExam: next };
}
