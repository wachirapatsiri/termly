"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { deleteMyAccount, deleteMyData } from "@/app/settings/actions";
import { isDeleteWord } from "@/lib/account";
import { useT } from "@/components/lang";

type Mode = "data" | "account";

// ส่วน "ลบข้อมูล / ลบบัญชี" ท้ายหน้า ⚙ — ต้องพิมพ์คำว่า "ลบ" ก่อนกดได้
export function DeleteAccount() {
  const tr = useT();
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

  const c = mode
    ? {
        button: tr(`del.${mode}.button`),
        title: tr(`del.${mode}.title`),
        body: tr(`del.${mode}.body`),
        confirm: tr(`del.${mode}.confirm`),
      }
    : null;

  return (
    <section className="space-y-3">
      <h2 className="font-medium">{tr("del.heading")}</h2>
      <p className="text-sm text-muted">
        {tr("del.seeWhat")}{" "}
        <Link href="/privacy" className="text-accent underline">
          {tr("home.privacyLink")}
        </Link>
      </p>

      {done && (
        <p role="status" className="rounded-card border border-line bg-surface p-3 text-sm">
          {tr("del.done")}
        </p>
      )}

      {c ? (
        <div className="space-y-3 rounded-card border border-danger-line bg-danger-soft p-4">
          <p className="font-medium text-danger">{c.title}</p>
          <p className="text-sm">{c.body}</p>
          <label className="block space-y-1 text-sm">
            <span>
              {tr("del.typePre")} <b>{tr("del.word")}</b> {tr("del.typePost")}
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
              {tr("del.cancel")}
            </button>
            <button
              type="button"
              onClick={run}
              disabled={pending || !isDeleteWord(word)}
              className="flex-1 rounded-card bg-danger-solid px-3 py-2.5 text-sm font-medium text-white transition active:scale-95 disabled:opacity-50"
            >
              {pending ? tr("del.deleting") : c.confirm}
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
              {tr(`del.${m}.button`)}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
