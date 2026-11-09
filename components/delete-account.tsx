"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { deleteMyAccount, deleteMyData } from "@/app/settings/actions";
import { DELETE_CONFIRM_WORD } from "@/lib/account";

type Mode = "data" | "account";

const COPY: Record<Mode, { button: string; title: string; body: string; confirm: string }> = {
  data: {
    button: "ลบข้อมูลทั้งหมด (เก็บบัญชีไว้)",
    title: "ลบข้อมูลทั้งหมด?",
    body: "งาน สอบ วิชา ประเภทงานที่เพิ่มเอง และการตั้งค่าจะหายทั้งหมด กู้คืนไม่ได้ — ยังล็อกอินบัญชีเดิมได้และเริ่มใหม่จากศูนย์",
    confirm: "ลบข้อมูลทั้งหมด",
  },
  account: {
    button: "ลบบัญชีถาวร",
    title: "ลบบัญชีถาวร?",
    body: "บัญชีและข้อมูลทุกอย่างจะหาย กู้คืนไม่ได้ แล้วจะออกจากระบบทันที (ความเห็นที่เคยส่งยังเก็บไว้แบบไม่ระบุตัวตน)",
    confirm: "ลบบัญชีถาวร",
  },
};

// ส่วน "ลบข้อมูล / ลบบัญชี" ท้ายหน้า ⚙ — ต้องพิมพ์คำว่า "ลบ" ก่อนกดได้
export function DeleteAccount() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [word, setWord] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const open = (m: Mode) => {
    setMode(m);
    setWord("");
    setError(null);
    setDone(false);
  };

  const run = () => {
    if (!mode) return;
    startTransition(async () => {
      const action = mode === "data" ? deleteMyData : deleteMyAccount;
      const res = await action(word);
      // ลบบัญชีสำเร็จ = redirect ไปหน้าเข้าสู่ระบบ (ไม่กลับมาถึงตรงนี้)
      if (!res.ok) setError(res.error);
      else {
        setMode(null);
        setDone(true);
      }
    });
  };

  const c = mode ? COPY[mode] : null;

  return (
    <section className="space-y-3">
      <h2 className="font-medium">ข้อมูลของฉัน</h2>
      <p className="text-sm text-muted">
        ดูว่าเก็บข้อมูลอะไรบ้างได้ที่{" "}
        <Link href="/privacy" className="text-accent underline">
          ข้อมูลและความเป็นส่วนตัว
        </Link>
      </p>

      {done && (
        <p role="status" className="rounded-card border border-line bg-surface p-3 text-sm">
          ✅ ลบข้อมูลทั้งหมดแล้ว
        </p>
      )}

      {c ? (
        <div className="space-y-3 rounded-card border border-danger-line bg-danger-soft p-4">
          <p className="font-medium text-danger">{c.title}</p>
          <p className="text-sm">{c.body}</p>
          <label className="block space-y-1 text-sm">
            <span>
              พิมพ์คำว่า <b>{DELETE_CONFIRM_WORD}</b> เพื่อยืนยัน
            </span>
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              autoFocus
              autoComplete="off"
              className="w-full rounded-card border border-line bg-surface px-3 py-2 text-base outline-none focus:border-danger"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode(null)}
              disabled={pending}
              className="flex-1 rounded-card border border-line bg-surface px-3 py-2.5 text-sm"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={run}
              disabled={pending || word.trim() !== DELETE_CONFIRM_WORD}
              className="flex-1 rounded-card bg-danger-solid px-3 py-2.5 text-sm font-medium text-white transition active:scale-95 disabled:opacity-50"
            >
              {pending ? "กำลังลบ…" : c.confirm}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          {(["data", "account"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => open(m)}
              className="w-full rounded-card border border-danger-line px-4 py-2.5 text-sm text-danger transition active:scale-95"
            >
              {COPY[m].button}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
