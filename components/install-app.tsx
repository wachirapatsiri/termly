"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/lang";

// event ของ Chrome/Android ก่อนขึ้นหน้าต่าง "ติดตั้งแอป" (ยังไม่มีใน type มาตรฐาน)
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type State = "loading" | "installed" | "prompt" | "ios" | "manual";

// หน้า ⚙: ติดตั้ง Termly ลงหน้าจอโฮม
// Android/Chrome = ปุ่มติดตั้ง, iPhone/iPad = บอกวิธีกดแชร์ → เพิ่มไปยังหน้าจอโฮม (iOS ไม่มีปุ่มให้กด)
export function InstallApp() {
  const tr = useT();
  const [state, setState] = useState<State>("loading");
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    // อ่านค่าจากเบราว์เซอร์ได้หลัง mount เท่านั้น
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(standalone ? "installed" : ios ? "ios" : "manual");

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
      setState("prompt");
    };
    const onInstalled = () => setState("installed");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    setPrompt(null);
    setState(outcome === "accepted" ? "installed" : "manual");
  }

  return (
    <section className="space-y-2">
      <h2 className="font-medium">{tr("inst.title")}</h2>
      {state === "loading" && <p className="h-5" />}
      {state === "installed" && (
        <p className="text-sm text-muted">{tr("inst.installed")}</p>
      )}
      {state === "prompt" && (
        <>
          <p className="text-sm text-muted">{tr("inst.prompt")}</p>
          <button
            type="button"
            onClick={install}
            className="rounded-card bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            {tr("inst.button")}
          </button>
        </>
      )}
      {state === "ios" && (
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>{tr("inst.ios1")}</li>
          <li>{tr("inst.ios2")}</li>
          <li>{tr("inst.ios3")}</li>
        </ol>
      )}
      {state === "manual" && (
        <p className="text-sm text-muted">
          {tr("inst.manual")}
        </p>
      )}
    </section>
  );
}
