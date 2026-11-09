import type { MetadataRoute } from "next";

// Web App Manifest → ติดตั้งลงหน้าจอโฮมมือถือได้ (Next.js เสิร์ฟที่ /manifest.webmanifest)
// ไอคอนสร้างด้วย `node scripts/make-icons.mjs`
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Termly — งานและ deadline ทุกวิชา",
    short_name: "Termly",
    description: "รวมงานและ deadline ของทุกวิชาไว้ในที่เดียว",
    lang: "th",
    start_url: "/tasks",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAFAF8",
    theme_color: "#FAFAF8",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
