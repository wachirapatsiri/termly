"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseFeedback } from "@/lib/feedback";
import { getLang } from "@/lib/preferences";
import { t } from "@/lib/messages";

export type FeedbackState = { ok?: boolean; error?: string };

// บันทึกความเห็นลงตาราง feedback (migration 0006) — user_id ฐานข้อมูลเติมให้
export async function sendFeedback(_prev: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const lang = await getLang();
  const user = await getCurrentUser();
  if (!user) return { error: t(lang, "api.needLogin") };

  const { input, empty } = parseFeedback(formData);
  if (empty) return { error: t(lang, "fb.err.needAnswer") };

  const supabase = await createClient();
  const { error } = await supabase.from("feedback").insert(input);
  if (error) {
    console.error("sendFeedback", error);
    // 42P01 = ยังไม่มีตาราง (ยังไม่ได้รัน migration 0006)
    return {
      error:
        error.code === "42P01" || error.code === "PGRST205"
          ? t(lang, "fb.err.migration")
          : t(lang, "fb.err.failed"),
    };
  }
  refresh();
  return { ok: true };
}
