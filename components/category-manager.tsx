"use client";

import { useState, useTransition } from "react";
import {
  createCategory,
  deleteCategory,
  renameCategory,
  type CategoryResult,
} from "@/app/settings/actions";
import { MAX_CATEGORY_LENGTH } from "@/lib/categories";
import { useT } from "@/components/lang";

type Row = { id: string; name: string; taskCount: number };

const inputClass =
  "min-w-0 flex-1 rounded-card border border-line bg-surface px-3 py-2 text-base outline-none focus:border-accent";

// หน้าตั้งค่า: เพิ่ม / เปลี่ยนชื่อ / ลบ ประเภทงาน
export function CategoryManager({ categories }: { categories: Row[] }) {
  const tr = useT();
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
        <h2 className="font-medium">{tr("cat.title")}</h2>
        <p className="text-xs text-muted">
          {tr("cat.hint")}
        </p>
      </div>

      <ul className="divide-y divide-line rounded-card border border-line bg-surface">
        {categories.map((c) =>
          editingId === c.id ? (
            <li key={c.id} className="flex gap-2 p-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={MAX_CATEGORY_LENGTH}
                aria-label={tr("task.newCategoryAria")}
                autoFocus
                className={inputClass}
              />
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => renameCategory(c.id, draft), () => setEditingId(null))}
                className="rounded-card bg-accent px-3 text-sm text-white disabled:opacity-50"
              >
                {tr("cat.save")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setError(null);
                }}
                className="rounded-card border border-line px-3 text-sm"
              >
                {tr("task.cancel")}
              </button>
            </li>
          ) : (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="min-w-0 flex-1 break-words">
                {c.name}
                {c.taskCount > 0 && (
                  <span className="text-sm text-muted">{tr("cat.count", { n: c.taskCount })}</span>
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
                {tr("cat.rename")}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  const msg =
                    c.taskCount > 0
                      ? tr("cat.confirmDeleteWith", { name: c.name, n: c.taskCount })
                      : tr("cat.confirmDelete", { name: c.name });
                  if (confirm(msg)) run(() => deleteCategory(c.id));
                }}
                className="text-sm text-danger disabled:opacity-50"
              >
                {tr("task.delete")}
              </button>
            </li>
          ),
        )}
        {categories.length === 0 && (
          <li className="px-3 py-2.5 text-sm text-muted">{tr("cat.empty")}</li>
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
          placeholder={tr("cat.addPlaceholder")}
          aria-label={tr("task.newCategoryAria")}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={pending || !newName.trim()}
          className="rounded-card bg-accent px-4 text-sm text-white disabled:opacity-50"
        >
          {tr("cat.add")}
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-card border border-danger-line bg-danger-soft p-3 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
