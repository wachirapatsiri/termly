import Link from "next/link";

const LINKS = [
  { href: "/tasks", label: "งาน" },
  { href: "/courses", label: "วิชา" },
] as const;

// แถบเมนูด้านบนของหน้าที่ต้องล็อกอิน
export function AppNav({ current }: { current: "/tasks" | "/courses" }) {
  return (
    <nav className="flex items-center justify-between">
      <Link href="/" className="font-semibold tracking-tight">
        Termly
      </Link>
      <div className="flex rounded-card border border-line bg-white p-0.5 text-sm">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={l.href === current ? "page" : undefined}
            className={`rounded-[calc(var(--radius-card)-2px)] px-4 py-1.5 ${
              l.href === current ? "bg-accent text-white" : "text-muted"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
