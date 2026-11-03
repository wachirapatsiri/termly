import { Suspense } from "react";
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

  const { error } = await searchParams;
  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-card border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง
        </p>
      )}
      <GoogleLoginButton />
    </div>
  );
}
