import { Suspense } from "react";
import Link from "next/link";
import { getLang } from "@/lib/preferences";
import { t } from "@/lib/messages";

const LINKS = [
  { href: "/tasks", key: "nav.tasks" },
  { href: "/exams", key: "nav.exams" },
  { href: "/courses", key: "nav.courses" },
] as const;

type NavPath = "/tasks" | "/exams" | "/courses" | "/import" | "/settings" | "/feedback";

// แถบเมนูด้านบนของหน้าที่ต้องล็อกอิน: งาน | สอบ | วิชา + ✨ AI ช่วยเพิ่ม + ⚙
// ปุ่ม AI เป็นทางเข้าเดียวของหน้า /import (วางข้อความ / รูปแคป / ซิลลาบัส)
export function AppNav({ current }: { current: NavPath }) {
  // ภาษามาจาก cookie/บัญชี (ข้อมูลที่เปลี่ยนตามผู้ใช้) → ต้องอยู่ใน <Suspense>; ระหว่างรอเว้นที่ให้เท่าแถบเมนูกันหน้ากระตุก
  return (
    <Suspense fallback={<div className="h-10" aria-hidden />}>
      <LocalizedNav current={current} />
    </Suspense>
  );
}

async function LocalizedNav({ current }: { current: NavPath }) {
  const lang = await getLang();
  const iconBtn = (active: boolean) =>
    `flex items-center gap-1 rounded-card border px-2.5 py-1.5 text-sm transition active:scale-95 ${
      active ? "border-accent bg-accent text-white" : "border-line bg-surface text-muted"
    }`;
  return (
    <nav className="flex items-center justify-between gap-2">
      <Link href="/" className="font-semibold tracking-tight">
        Termly
      </Link>
      <div className="flex items-center gap-1.5">
        <div className="flex rounded-card border border-line bg-surface p-0.5 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={l.href === current ? "page" : undefined}
              className={`rounded-[calc(var(--radius-card)-2px)] px-3 py-1.5 transition-colors active:scale-95 ${
                l.href === current ? "bg-accent text-white" : "text-muted"
              }`}
            >
              {t(lang, l.key)}
            </Link>
          ))}
        </div>
        <Link
          href="/import"
          aria-label={t(lang, "nav.aiAria")}
          aria-current={current === "/import" ? "page" : undefined}
          className={iconBtn(current === "/import")}
        >
          {/* จอมือถือทั่วไปเหลือ "AI" จอกว้างขึ้นแสดงเต็ม */}
          <span aria-hidden className="min-[440px]:hidden">AI</span>
          <span aria-hidden className="hidden min-[440px]:inline">{t(lang, "nav.ai")}</span>
        </Link>
        <Link
          href="/settings"
          aria-label={t(lang, "nav.settings")}
          aria-current={current === "/settings" ? "page" : undefined}
          className={iconBtn(current === "/settings")}
        >
          ⚙
        </Link>
      </div>
    </nav>
  );
}
