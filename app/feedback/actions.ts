"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseFeedback } from "@/lib/feedback";

export type FeedbackState = { ok?: boolean; error?: string };

// บันทึกความเห็นลงตาราง feedback (migration 0006) — user_id ฐานข้อมูลเติมให้
export async function sendFeedback(_prev: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const user = await getCurrentUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบก่อน" };

  const { input, empty } = parseFeedback((k) => formData.get(k));
  if (empty) return { error: "ตอบอย่างน้อย 1 ข้อก่อนส่งนะ" };

  const supabase = await createClient();
  const { error } = await supabase.from("feedback").insert(input);
  if (error) {
    console.error("sendFeedback", error);
    // 42P01 = ยังไม่มีตาราง (ยังไม่ได้รัน migration 0006)
    return {
      error:
        error.code === "42P01" || error.code === "PGRST205"
          ? "ระบบรับความเห็นยังไม่พร้อม (ยังไม่ได้รัน migration 0006)"
          : "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง",
    };
  }
  refresh();
  return { ok: true };
}
