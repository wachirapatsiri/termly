import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { GoogleLoginButton } from "@/components/google-login-button";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">เข้าสู่ระบบ</h1>
        <p className="leading-relaxed text-muted">
          ใช้บัญชี Google ของคุณ เพื่อเก็บงานและ deadline ไว้ในที่เดียว
        </p>
      </div>

      <Suspense fallback={<GoogleLoginButton />}>
        <LoginForm searchParams={searchParams} />
      </Suspense>

      <p className="text-center text-xs text-muted">
        ดูว่าเก็บข้อมูลอะไรบ้าง:{" "}
        <Link href="/privacy" className="underline">
          ข้อมูลและความเป็นส่วนตัว
        </Link>
      </p>
    </main>
  );
}

async function LoginForm({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  // ล็อกอินอยู่แล้ว → กลับหน้าแรก
  if (await getCurrentUser()) redirect("/");

  const { error, deleted } = await searchParams;
  return (
    <div className="space-y-4">
      {deleted && (
        <p role="status" className="rounded-card border border-line bg-surface p-3 text-sm">
          ✅ ลบบัญชีและข้อมูลทั้งหมดเรียบร้อยแล้ว — ขอบคุณที่ลองใช้ Termly
        </p>
      )}
      {error && (
        <p className="rounded-card border border-danger-line bg-danger-soft p-3 text-sm text-danger">
          เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง
        </p>
      )}
      <GoogleLoginButton />
    </div>
  );
}
