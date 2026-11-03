import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google ส่งผู้ใช้กลับมาที่นี่พร้อม ?code=... → แลกเป็น session แล้วเก็บใน cookie
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth", origin));
}

// กัน open redirect: ยอมเฉพาะ path ภายในเว็บเรา เช่น "/tasks"
function safeNextPath(next: string | null) {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}
