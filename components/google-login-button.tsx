"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function GoogleLoginButton({ next = "/" }: { next?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    // ถ้าสำเร็จ เบราว์เซอร์จะถูกพาไปหน้า Google เอง
    if (error) {
      setError("เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-card bg-accent px-4 py-3 font-medium text-white disabled:opacity-60"
      >
        {loading ? "กำลังไปหน้า Google…" : "เข้าสู่ระบบด้วย Google"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
