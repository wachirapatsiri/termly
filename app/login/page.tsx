import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { GoogleLoginButton } from "@/components/google-login-button";
import { LanguageSwitch } from "@/components/language-setting";
import { getLang } from "@/lib/preferences";
import { t } from "@/lib/messages";
import type { Lang } from "@/lib/i18n";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  // ภาษามาจาก cookie/บัญชี → ทั้งหน้าอยู่ใน <Suspense>
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-16">
      <Suspense fallback={<GoogleLoginButton />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LoginContent({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const lang = await getLang();
  return (
    <>
      <div className="flex justify-end">
        <LanguageSwitch current={lang} />
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">{t(lang, "login.title")}</h1>
        <p className="leading-relaxed text-muted">{t(lang, "login.desc")}</p>
      </div>

      <LoginForm searchParams={searchParams} lang={lang} />

      <p className="text-center text-xs text-muted">
        {t(lang, "login.privacyLead")}{" "}
        <Link href="/privacy" className="underline">
          {t(lang, "home.privacyLink")}
        </Link>
      </p>
    </>
  );
}

async function LoginForm({
  searchParams,
  lang,
}: {
  searchParams: PageProps<"/login">["searchParams"];
  lang: Lang;
}) {
  // ล็อกอินอยู่แล้ว → กลับหน้าแรก
  if (await getCurrentUser()) redirect("/");

  const { error, deleted } = await searchParams;
  return (
    <div className="space-y-4">
      {deleted && (
        <p role="status" className="rounded-card border border-line bg-surface p-3 text-sm">
          {t(lang, "login.deleted")}
        </p>
      )}
      {error && (
        <p className="rounded-card border border-danger-line bg-danger-soft p-3 text-sm text-danger">
          {t(lang, "login.failed")}
        </p>
      )}
      <GoogleLoginButton
        labels={{
          idle: t(lang, "login.google"),
          loading: t(lang, "login.googleLoading"),
          failed: t(lang, "login.failed"),
        }}
      />
    </div>
  );
}
