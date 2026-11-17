import { Suspense } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { AI_DAILY_LIMIT } from "@/lib/ai/limits";
import { SignOutButton } from "@/components/sign-out-button";
import { LanguageSwitch } from "@/components/language-setting";
import { getLang } from "@/lib/preferences";
import { t } from "@/lib/messages";
import type { Lang } from "@/lib/i18n";

// หน้าแรก: อธิบายสั้น ๆ ว่าแอปทำอะไร + ปุ่มเข้าสู่ระบบ (ล็อกอินแล้ว = ทางลัดไปหน้าต่าง ๆ)
// ข้อความ 2 ภาษา (lib/messages.ts) — ภาษามาจาก cookie/บัญชี จึงต้องอยู่ใน <Suspense>
const STEP_KEYS = [
  ["home.step1.title", "home.step1.body"],
  ["home.step2.title", "home.step2.body"],
  ["home.step3.title", "home.step3.body"],
  ["home.step4.title", "home.step4.body"],
] as const;

export default function Home() {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const lang = await getLang();
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-10 px-6 py-12 md:max-w-xl lg:max-w-6xl lg:px-10 lg:py-20">
      <div className="flex justify-end">
        <LanguageSwitch current={lang} />
      </div>
      <div className="space-y-10 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-20 lg:space-y-0">
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium text-accent">{t(lang, "home.audience")}</p>
            <h1 className="text-3xl font-semibold tracking-tight lg:text-6xl">Termly</h1>
            <p className="text-lg leading-relaxed lg:text-2xl">
              {t(lang, "home.tagline")}
            </p>
            <p className="leading-relaxed text-muted lg:text-lg">
              {t(lang, "home.sub")}
            </p>
          </div>

          <Suspense fallback={<div className="h-28 rounded-card border border-line" />}>
            <UserSection lang={lang} />
          </Suspense>
        </div>

        <section aria-label={t(lang, "home.how")} className="space-y-3">
          <h2 className="text-sm font-medium text-muted">{t(lang, "home.how")}</h2>
          <ol className="space-y-2">
            {STEP_KEYS.map(([title, body], i) => (
              <li
                key={title}
                className="flex gap-3 rounded-card border border-line bg-surface p-4 lg:p-5"
              >
                <span className="min-w-0 space-y-0.5">
                  <span className="block font-medium">
                    {i + 1}. {t(lang, title)}
                  </span>
                  <span className="block text-sm text-muted">{t(lang, body)}</span>
                </span>
              </li>
            ))}
          </ol>
          <ul className="space-y-1 pt-1 text-xs text-muted">
            <li>• {t(lang, "home.note.free", { n: AI_DAILY_LIMIT })}</li>
            <li>• {t(lang, "home.note.privacy")}</li>
            <li>• {t(lang, "home.note.install")}</li>
            <li>
              •{" "}
              <Link href="/privacy" className="underline">
                {t(lang, "home.privacyLink")}
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}

async function UserSection({ lang }: { lang: Lang }) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="space-y-2">
        <Link
          href="/login"
          className="block rounded-card bg-accent px-4 py-3 text-center font-medium text-white lg:inline-block lg:px-8"
        >
          {t(lang, "login.google")}
        </Link>
        <p className="text-xs text-muted">{t(lang, "login.noSignup")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-card border border-line bg-surface p-5">
      <p className="text-sm text-muted">
        {t(lang, "home.hello")} <span className="font-medium text-foreground">{user.name}</span>
      </p>
      <div className="grid grid-cols-3 gap-2">
        <Link
          href="/tasks"
          className="rounded-card bg-accent px-3 py-2.5 text-center font-medium text-white"
        >
          {t(lang, "nav.tasks")}
        </Link>
        <Link
          href="/exams"
          className="rounded-card border border-line px-3 py-2.5 text-center font-medium"
        >
          {t(lang, "nav.exams")}
        </Link>
        <Link
          href="/import"
          className="rounded-card border border-line px-3 py-2.5 text-center font-medium"
        >
          AI
        </Link>
      </div>
      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        <span className="min-w-0 truncate">{user.email}</span>
        <SignOutButton compact label={t(lang, "home.signOut")} />
      </div>
    </div>
  );
}
