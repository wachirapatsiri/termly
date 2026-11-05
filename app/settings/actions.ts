"use server";

import { cookies } from "next/headers";
import { COURSE_LABEL_COOKIE, isCourseLabelMode } from "@/lib/course-label";

export async function setCourseLabelMode(formData: FormData) {
  const mode = formData.get("mode");
  if (!isCourseLabelMode(mode)) return;
  (await cookies()).set(COURSE_LABEL_COOKIE, mode, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // จำไว้ 1 ปี
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}
