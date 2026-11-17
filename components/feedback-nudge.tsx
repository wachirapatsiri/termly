import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLang } from "@/lib/preferences";
import { t } from "@/lib/messages";

// แถบชวนส่งความเห็นบนหน้างาน (ช่วงทดลอง) — ซ่อนเมื่อผู้ใช้เคยส่งแล้ว
export async function FeedbackNudge() {
  const lang = await getLang();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("feedback")
    .select("id", { count: "exact", head: true });
  // ยังไม่ได้รัน migration 0006 → ไม่แสดง (กดไปก็ส่งไม่ได้)
  if (error || (count ?? 0) > 0) return null;
  return (
    <Link
      href="/feedback"
      className="flex items-center gap-3 rounded-card border border-info-line bg-info-soft px-4 py-3 text-sm motion-safe:animate-fade-in"
    >
      <span className="min-w-0 flex-1">
        <span className="font-medium">{t(lang, "nudge.title")}</span>
        <span className="block text-muted">{t(lang, "nudge.body")}</span>
      </span>
      <span className="shrink-0 text-info">{t(lang, "nudge.cta")}</span>
    </Link>
  );
}
