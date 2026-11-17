import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getLang } from "@/lib/preferences";
import { t, type MessageKey } from "@/lib/messages";
import type { Lang } from "@/lib/i18n";

export const metadata: Metadata = { title: "ข้อมูลและความเป็นส่วนตัว · Termly" };

// หน้าบอกว่าเก็บข้อมูลอะไร (เช็กลิสต์ก่อนเปิดให้คนลอง ใน docs/plan.md) — เปิดได้โดยไม่ต้องล็อกอิน
// ข้อความเรื่อง AI เปลี่ยนตาม env AI_PROVIDER (อ่านตอน build → เปลี่ยน env แล้ว Redeploy)
// ข้อความ 2 ภาษา (lib/messages.ts) — ภาษามาจาก cookie จึงต้องอยู่ใน <Suspense>
function aiSection(lang: Lang) {
  const gemini = process.env.AI_PROVIDER?.trim().toLowerCase().replace(/^["']|["']$/g, "") === "gemini";
  return gemini
    ? { name: t(lang, "priv.geminiName"), note: t(lang, "priv.geminiNote") }
    : { name: t(lang, "priv.claudeName"), note: t(lang, "priv.claudeNote") };
}

// [หัวข้อ, จำนวนข้อ] ตามลำดับ priv.s<n>.title / priv.s<n>.i<m>
const SECTION_SHAPE = [4, 2, 3, 3, 1, 2] as const;

function sections(lang: Lang) {
  const ai = aiSection(lang);
  return SECTION_SHAPE.map((count, idx) => {
    const n = idx + 1;
    return {
      title: t(lang, `priv.s${n}.title` as MessageKey),
      items: Array.from({ length: count }, (_, m) =>
        t(lang, `priv.s${n}.i${m + 1}` as MessageKey, n === 3 && m === 0 ? ai : undefined),
      ),
    };
  });
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-md md:max-w-2xl flex-1 space-y-6 px-6 py-8 lg:max-w-3xl lg:px-10">
      <Suspense fallback={<div className="h-64" />}>
        <PrivacyContent />
      </Suspense>
    </main>
  );
}

async function PrivacyContent() {
  const lang = await getLang();
  return (
    <>
      <Link href="/" className="font-semibold tracking-tight">
        Termly
      </Link>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t(lang, "priv.title")}</h1>
        <p className="text-sm text-muted">{t(lang, "priv.sub")}</p>
      </div>
      <div className="space-y-4">
        {sections(lang).map((s) => (
          <section key={s.title} className="space-y-2 rounded-card border border-line bg-surface p-4 lg:p-5">
            <h2 className="font-medium">{s.title}</h2>
            <ul className="space-y-1.5 text-sm leading-relaxed">
              {s.items.map((text) => (
                <li key={text} className="flex gap-2">
                  <span aria-hidden className="text-muted">
                    •
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="text-sm text-muted">
        {t(lang, "priv.questions")}{" "}
        <Link href="/feedback" className="text-accent underline">
          {t(lang, "priv.feedbackLink")}
        </Link>
      </p>
    </>
  );
}
