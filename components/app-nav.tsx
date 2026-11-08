import Link from "next/link";

const LINKS = [
  { href: "/tasks", label: "งาน" },
  { href: "/exams", label: "สอบ" },
  { href: "/courses", label: "วิชา" },
] as const;

type NavPath = "/tasks" | "/exams" | "/courses" | "/import" | "/settings";

// แถบเมนูด้านบนของหน้าที่ต้องล็อกอิน: งาน | สอบ | วิชา + ✨ นำเข้า (AI) + ⚙
export function AppNav({ current }: { current: NavPath }) {
  const iconBtn = (active: boolean) =>
    `flex items-center gap-1 rounded-card border px-2.5 py-1.5 text-sm ${
      active ? "border-accent bg-accent text-white" : "border-line bg-white text-muted"
    }`;
  return (
    <nav className="flex items-center justify-between gap-2">
      <Link href="/" className="font-semibold tracking-tight">
        Termly
      </Link>
      <div className="flex items-center gap-1.5">
        <div className="flex rounded-card border border-line bg-white p-0.5 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={l.href === current ? "page" : undefined}
              className={`rounded-[calc(var(--radius-card)-2px)] px-3 py-1.5 ${
                l.href === current ? "bg-accent text-white" : "text-muted"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <Link
          href="/import"
          aria-label="นำเข้าจากซิลลาบัสด้วย AI"
          aria-current={current === "/import" ? "page" : undefined}
          className={iconBtn(current === "/import")}
        >
          <span aria-hidden>✨</span>
          {/* จอแคบมากซ่อนคำ เหลือแค่ไอคอน */}
          <span className="hidden min-[400px]:inline">นำเข้า</span>
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
