import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Supabase client สำหรับฝั่งเซิร์ฟเวอร์ (Server Component, Route Handler, Server Action)
// อ่าน/เขียน session จาก cookie ของ request นั้น ๆ
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // เรียกจาก Server Component ซึ่งเขียน cookie ไม่ได้ — ไม่เป็นไร
            // เพราะ proxy.ts รีเฟรช session ให้ทุก request อยู่แล้ว
          }
        },
      },
    },
  );
}
