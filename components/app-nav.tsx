import Link from "next/link";

const LINKS = [
  { href: "/tasks", label: "งาน" },
  { href: "/exams", label: "สอบ" },
  { href: "/courses", label: "วิชา" },
] as const;

type NavPath = "/tasks" | "/exams" | "/courses" | "/import" | "/settings" | "/feedback";

// แถบเมนูด้านบนของหน้าที่ต้องล็อกอิน: งาน | สอบ | วิชา + ✨ AI ช่วยเพิ่ม + ⚙
// ปุ่ม AI เป็นทางเข้าเดียวของหน้า /import (วางข้อความ / รูปแคป / ซิลลาบัส)
export function AppNav({ current }: { current: NavPath }) {
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
              {l.label}
            </Link>
          ))}
        </div>
        <Link
          href="/import"
          aria-label="AI ช่วยเพิ่มงานและสอบ"
          aria-current={current === "/import" ? "page" : undefined}
          className={iconBtn(current === "/import")}
        >
          <span aria-hidden>✨</span>
          {/* จอมือถือทั่วไปเหลือ "AI" จอกว้างขึ้นแสดงเต็ม */}
          <span aria-hidden className="min-[440px]:hidden">AI</span>
          <span aria-hidden className="hidden min-[440px]:inline">AI ช่วยเพิ่ม</span>
        </Link>
        <Link
          href="/settings"
          aria-label="ตั้งค่า"
          aria-current={current === "/settings" ? "page" : undefined}
          className={iconBtn(current === "/settings")}
        >
          ⚙
        </Link>
      </div>
    </nav>
  );
}
