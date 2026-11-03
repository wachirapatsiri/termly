import "server-only";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
};

// อ่านผู้ใช้ปัจจุบันจาก session (ตรวจ JWT แล้ว) — คืน null ถ้ายังไม่ล็อกอิน
// ต้องเรียกภายใน <Suspense> เพราะอ่าน cookie ของ request
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;

  const claims = data.claims;
  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const email = typeof claims.email === "string" ? claims.email : "";
  const name =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    email;

  return { id: claims.sub, email, name };
}
