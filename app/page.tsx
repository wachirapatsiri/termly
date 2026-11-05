import { Suspense } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Termly</h1>
        <p className="leading-relaxed text-muted">
          รวมงานและ deadline ของทุกวิชาไว้ในที่เดียว
          <br />
          วางประกาศหรือ syllabus แล้วให้ AI ช่วยดึงงานออกมาให้
        </p>
      </div>

      <Suspense fallback={<div className="h-32 rounded-card border border-line" />}>
        <UserSection />
      </Suspense>
    </main>
  );
}

async function UserSection() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-card bg-accent px-4 py-3 text-center font-medium text-white"
      >
        เข้าสู่ระบบด้วย Google
      </Link>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-line p-5">
        <p className="text-sm text-muted">เข้าสู่ระบบแล้ว</p>
        <p className="mt-1 font-medium">{user.name}</p>
        <p className="text-sm text-muted">{user.email}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/tasks"
          className="rounded-card bg-accent px-4 py-3 text-center font-medium text-white"
        >
          งานของฉัน
        </Link>
        <Link
          href="/courses"
          className="rounded-card border border-line bg-white px-4 py-3 text-center font-medium"
        >
          วิชาของฉัน
        </Link>
      </div>
      <SignOutButton />
    </div>
  );
}
