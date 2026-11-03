import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// เรียกจาก proxy.ts ทุก request: รีเฟรช token ของ Supabase ถ้าใกล้หมดอายุ
// แล้วเขียน cookie ใหม่กลับไปทั้งใน request และ response
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // ห้ามมีโค้ดคั่นระหว่าง createServerClient กับ getClaims()
  // getClaims() ตรวจลายเซ็น JWT และรีเฟรช session เมื่อจำเป็น
  await supabase.auth.getClaims();

  return response;
}
