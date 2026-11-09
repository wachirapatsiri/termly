import type { Metadata, Viewport } from "next";
import { Anuphan } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { ServiceWorker } from "@/components/service-worker";
import { ThemeFromAccount } from "@/components/theme-from-account";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const anuphan = Anuphan({
  variable: "--font-anuphan",
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: "Termly",
  description: "รวมงานและ deadline ของทุกวิชาไว้ในที่เดียว",
  // เพิ่มลงหน้าจอโฮม iPhone แล้วเปิดเต็มจอเหมือนแอป (manifest อยู่ที่ app/manifest.ts)
  appleWebApp: { capable: true, title: "Termly", statusBarStyle: "default" },
  icons: { icon: "/icons/icon.svg" },
};

export const viewport: Viewport = {
  // สีแถบสถานะมือถือ ตามโหมดมืด/สว่างของเครื่อง
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF8" },
    { media: "(prefers-color-scheme: dark)", color: "#121316" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: สคริปต์ธีมใส่ data-theme ก่อน React โหลด (ตั้งใจ ไม่ใช่ error)
    <html lang="th" className={`${anuphan.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* ใส่ธีมมืด/สว่างก่อนหน้าเว็บแสดง กันจอขาวแวบตอนเปิดโหมดมืด */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorker />
        <Suspense fallback={null}>
          <ThemeFromAccount />
        </Suspense>
      </body>
    </html>
  );
}
