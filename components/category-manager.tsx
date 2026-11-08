"use client";

import { useState, useTransition } from "react";
import {
  createCategory,
  deleteCategory,
  renameCategory,
  type CategoryResult,
} from "@/app/settings/actions";
import { MAX_CATEGORY_LENGTH } from "@/lib/categories";

type Row = { id: string; name: string; taskCount: number };

const inputClass =
  "min-w-0 flex-1 rounded-card border border-line bg-white px-3 py-2 text-base outline-none focus:border-accent";

// หน้าตั้งค่า: เพิ่ม / เปลี่ยนชื่อ / ลบ ประเภทงาน
export function CategoryManager({ categories }: { categories: Row[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<CategoryResult>, onOk?: () => void) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) onOk?.();
      else setError(res.error);
    });
  };

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="font-medium">ประเภทงาน</h2>
        <p className="text-xs text-muted">
          ใช้เป็นป้ายบนงาน เช่น การบ้าน, Quiz · ลบประเภทแล้วงานยังอยู่ แค่ไม่มีป้าย
        </p>
      </div>

      <ul className="divide-y divide-line rounded-card border border-line bg-white">
        {categories.map((c) =>
          editingId === c.id ? (
            <li key={c.id} className="flex gap-2 p-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={MAX_CATEGORY_LENGTH}
                aria-label="ชื่อประเภทใหม่"
                autoFocus
                className={inputClass}
              />
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => renameCategory(c.id, draft), () => setEditingId(null))}
                className="rounded-card bg-accent px-3 text-sm text-white disabled:opacity-50"
              >
                บันทึก
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setError(null);
                }}
                className="rounded-card border border-line px-3 text-sm"
              >
                ยกเลิก
              </button>
            </li>
          ) : (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="min-w-0 flex-1 break-words">
                {c.name}
                {c.taskCount > 0 && (
                  <span className="text-sm text-muted"> · {c.taskCount} งาน</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => {
                  setEditingId(c.id);
                  setDraft(c.name);
                  setError(null);
                }}
                className="text-sm text-accent"
              >
                แก้ชื่อ
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  const msg =
                    c.taskCount > 0
                      ? `ลบประเภท "${c.name}" ?\nงาน ${c.taskCount} ชิ้นจะยังอยู่ แค่ไม่มีป้ายประเภท`
                      : `ลบประเภท "${c.name}" ?`;
                  if (confirm(msg)) run(() => deleteCategory(c.id));
                }}
                className="text-sm text-red-600 disabled:opacity-50"
              >
                ลบ
              </button>
            </li>
          ),
        )}
        {categories.length === 0 && (
          <li className="px-3 py-2.5 text-sm text-muted">ยังไม่มีประเภทงาน</li>
        )}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => createCategory(newName), () => setNewName(""));
        }}
        className="flex gap-2"
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={MAX_CATEGORY_LENGTH}
          placeholder="เพิ่มประเภทใหม่ เช่น Workshop"
          aria-label="ชื่อประเภทใหม่"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={pending || !newName.trim()}
          className="rounded-card bg-accent px-4 text-sm text-white disabled:opacity-50"
        >
          เพิ่ม
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-card border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
