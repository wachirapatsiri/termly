"use client";

import { useEffect } from "react";

// ลงทะเบียน public/sw.js (หน้าออฟไลน์) — เฉพาะเว็บจริง/Preview ไม่ทำตอน `npm run dev`
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((err) => console.error("register service worker", err));
  }, []);
  return null;
}
