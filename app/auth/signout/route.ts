import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ออกจากระบบ (ใช้ POST จากฟอร์ม เพื่อไม่ให้ลิงก์/prefetch ทำให้หลุดเอง)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.nextUrl.origin), {
    status: 303,
  });
}
