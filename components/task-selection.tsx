"use client";

import {
  createContext,
  useContext,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { deleteTasks, setTasksDone } from "@/app/tasks/actions";

// โหมด "เลือกหลายรายการ": เก็บว่าเลือกงานไหนไว้ + ผลแบบ optimistic หลังกดปุ่ม
type Selection = {
  selecting: boolean;
  selected: Set<string>;
  toggle: (id: string) => void;
  hidden: Set<string>; // งานที่เพิ่งลบ (ซ่อนทันที)
  doneIds: Set<string>; // งานที่เพิ่งติ๊กเสร็จ (แสดงเป็นเสร็จทันที)
};

const SelectionContext = createContext<Selection | null>(null);
const ControlsContext = createContext<{
  selecting: boolean;
  start: () => void;
  stop: () => void;
} | null>(null);

export function useTaskSelection() {
  return useContext(SelectionContext);
}

type Optimistic = { hidden: Set<string>; doneIds: Set<string> };

export function TaskSelectionProvider({ children }: { children: React.ReactNode }) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [optimistic, addOptimistic] = useOptimistic<Optimistic, Optimistic>(
    { hidden: new Set(), doneIds: new Set() },
    (cur, next) => ({
      hidden: new Set([...cur.hidden, ...next.hidden]),
      doneIds: new Set([...cur.doneIds, ...next.doneIds]),
    }),
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const stop = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  const run = (kind: "done" | "delete") => {
    const ids = [...selected];
    if (!ids.length) return;
    if (kind === "delete" && !confirm(`ลบงานที่เลือก ${ids.length} ชิ้น ?`)) return;
    stop();
    startTransition(async () => {
      if (kind === "done") {
        addOptimistic({ hidden: new Set(), doneIds: new Set(ids) });
        await setTasksDone(ids, true);
      } else {
        addOptimistic({ hidden: new Set(ids), doneIds: new Set() });
        await deleteTasks(ids);
      }
    });
  };

  const btn = "rounded-card px-4 py-2.5 text-sm font-medium disabled:opacity-50";

  return (
    <ControlsContext.Provider value={{ selecting, start: () => setSelecting(true), stop }}>
      <SelectionContext.Provider
        value={{ selecting, selected, toggle, ...optimistic }}
      >
        {children}

        {selecting && (
          // แถบปุ่มติดขอบล่างจอ (มือถือกดง่าย)
          <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-white/95 px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
            <div className="mx-auto flex max-w-md items-center gap-2 lg:max-w-6xl lg:px-4">
              <span className="flex-1 text-sm text-muted">
                เลือกแล้ว {selected.size} งาน
              </span>
              <button
                type="button"
                disabled={!selected.size || pending}
                onClick={() => run("done")}
                className={`${btn} bg-accent text-white`}
              >
                ✓ เสร็จ
              </button>
              <button
                type="button"
                disabled={!selected.size || pending}
                onClick={() => run("delete")}
                className={`${btn} border border-red-200 text-red-600`}
              >
                ลบ
              </button>
            </div>
          </div>
        )}
      </SelectionContext.Provider>
    </ControlsContext.Provider>
  );
}

// ปุ่ม "เลือกหลายรายการ" / "ยกเลิก" ไว้วางข้างหัวข้อ
export function SelectModeButton() {
  const ctl = useContext(ControlsContext);
  if (!ctl) return null;
  return (
    <button
      type="button"
      onClick={ctl.selecting ? ctl.stop : ctl.start}
      className="text-sm text-accent"
    >
      {ctl.selecting ? "ยกเลิกการเลือก" : "เลือกหลายรายการ"}
    </button>
  );
}

// เว้นที่ด้านล่างไม่ให้แถบปุ่มบังงานชิ้นสุดท้าย
export function SelectionSpacer() {
  const ctl = useContext(ControlsContext);
  return ctl?.selecting ? <div className="h-20" /> : null;
}
