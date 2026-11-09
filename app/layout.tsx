import type { Metadata, Viewport } from "next";
import { Anuphan } from "next/font/google";
import "./globals.css";
import { ServiceWorker } from "@/components/service-worker";

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
  themeColor: "#FAFAF8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${anuphan.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
