// กล่อง "ยังไม่มีข้อมูล" แบบเป็นมิตร: ไอคอน + ข้อความ + ปุ่มบอกว่าทำอะไรต่อ (server/client ใช้ได้)
import Link from "next/link";

export function EmptyState({
  icon,
  title,
  body,
  actions = [],
  compact = false,
}: {
  icon: string;
  title: string;
  body?: React.ReactNode;
  actions?: { href: string; label: string; primary?: boolean }[];
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-card border border-dashed border-line text-center motion-safe:animate-fade-in ${
        compact ? "gap-1.5 px-4 py-6" : "gap-2 bg-surface px-6 py-10"
      }`}
    >
      <span
        aria-hidden
        className={`flex items-center justify-center rounded-full bg-accent/10 ${
          compact ? "h-11 w-11 text-xl" : "mb-1 h-16 w-16 text-3xl"
        }`}
      >
        {icon}
      </span>
      <p className="font-medium">{title}</p>
      {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
      {actions.length > 0 && (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {actions.map((a) => (
            <Link
              key={a.href + a.label}
              href={a.href}
              className={`rounded-card px-4 py-2 text-sm font-medium transition active:scale-95 ${
                a.primary
                  ? "bg-accent text-white hover:opacity-90"
                  : "border border-line bg-surface hover:border-accent/50"
              }`}
            >
              {a.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
