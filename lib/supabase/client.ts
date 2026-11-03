import { createBrowserClient } from "@supabase/ssr";

// Supabase client สำหรับใช้ในฝั่งเบราว์เซอร์ (Client Component)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
