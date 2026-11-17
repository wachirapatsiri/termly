// compact = ลิงก์ตัวเล็ก (ใช้ในการ์ดหน้าแรก) / ปกติ = ปุ่มเต็มความกว้าง
export function SignOutButton({ compact = false, label = "ออกจากระบบ" }: { compact?: boolean; label?: string }) {
  return (
    <form action="/auth/signout" method="post" className={compact ? "shrink-0" : undefined}>
      <button
        type="submit"
        className={
          compact
            ? "text-sm text-muted underline"
            : "w-full rounded-card border border-line px-4 py-3 font-medium"
        }
      >
        {label}
      </button>
    </form>
  );
}
