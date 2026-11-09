import { Suspense } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { AI_DAILY_LIMIT } from "@/lib/ai/limits";
import { SignOutButton } from "@/components/sign-out-button";

// หน้าแรก: อธิบายสั้น ๆ ว่าแอปทำอะไร + ปุ่มเข้าสู่ระบบ (ล็อกอินแล้ว = ทางลัดไปหน้าต่าง ๆ)
const STEPS = [
  {
    icon: "📋",
    title: "วางซิลลาบัสหรือประกาศงาน",
    body: "วางข้อความ แนบ PDF หรือรูปแคปจาก Canvas / LINE กลุ่มวิชา",
  },
  {
    icon: "✨",
    title: "AI ดึงงาน วันส่ง และวันสอบ",
    body: "อ่านได้ทั้ง พ.ศ. และ ค.ศ. — อันไหนไม่ชัดจะเตือนให้ตรวจ ไม่เดาเอง",
  },
  {
    icon: "✅",
    title: "ตรวจ แก้ แล้วค่อยบันทึก",
    body: "เลือกเฉพาะรายการที่ถูก แก้วัน/วิชาได้ก่อนกดบันทึก",
  },
  {
    icon: "📅",
    title: "ดูแผนรายสัปดาห์ + ส่งออกปฏิทิน",
    body: "รู้ล่วงหน้าว่าสัปดาห์ไหนงานหนัก และเพิ่มลง Google Calendar / iPhone ได้",
  },
] as const;

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-10 px-6 py-12 lg:max-w-5xl lg:px-10">
      <div className="space-y-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16 lg:space-y-0">
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium text-accent">สำหรับนักศึกษามหาวิทยาลัย</p>
            <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">Termly</h1>
            <p className="text-lg leading-relaxed">
              รวมงาน deadline และวันสอบของทุกวิชาไว้ในที่เดียว
            </p>
            <p className="leading-relaxed text-muted">
              ไม่ต้องนั่งจดเองทีละวิชา — วางซิลลาบัสแล้วให้ AI ช่วยแยกงานและวันสอบออกมาให้
            </p>
          </div>

          <Suspense fallback={<div className="h-28 rounded-card border border-line" />}>
            <UserSection />
          </Suspense>
        </div>

        <section aria-label="ใช้งานอย่างไร" className="space-y-3">
          <h2 className="text-sm font-medium text-muted">ใช้งานอย่างไร</h2>
          <ol className="space-y-2">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="flex gap-3 rounded-card border border-line bg-surface p-4"
              >
                <span aria-hidden className="text-xl leading-7">
                  {s.icon}
                </span>
                <span className="min-w-0 space-y-0.5">
                  <span className="block font-medium">
                    {i + 1}. {s.title}
                  </span>
                  <span className="block text-sm text-muted">{s.body}</span>
                </span>
              </li>
            ))}
          </ol>
          <ul className="space-y-1 pt-1 text-xs text-muted">
            <li>• ช่วงทดลองใช้ฟรี — AI {AI_DAILY_LIMIT} ครั้ง/วัน (ครั้งที่ไม่สำเร็จไม่นับ)</li>
            <li>• ไฟล์ที่แนบส่งให้ AI อ่านแล้วทิ้ง ไม่เก็บไว้ · เห็นข้อมูลได้เฉพาะบัญชีตัวเอง</li>
            <li>• เพิ่มลงหน้าจอโฮมมือถือ ใช้เหมือนแอปได้</li>
            <li>
              •{" "}
              <Link href="/privacy" className="underline">
                ข้อมูลและความเป็นส่วนตัว
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}

async function UserSection() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="space-y-2">
        <Link
          href="/login"
          className="block rounded-card bg-accent px-4 py-3 text-center font-medium text-white lg:inline-block lg:px-8"
        >
          เข้าสู่ระบบด้วย Google
        </Link>
        <p className="text-xs text-muted">ใช้บัญชี Google ได้เลย ไม่ต้องสมัครสมาชิก</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-card border border-line bg-surface p-5">
      <p className="text-sm text-muted">
        สวัสดี <span className="font-medium text-foreground">{user.name}</span>
      </p>
      <div className="grid grid-cols-3 gap-2">
        <Link
          href="/tasks"
          className="rounded-card bg-accent px-3 py-2.5 text-center font-medium text-white"
        >
          งาน
        </Link>
        <Link
          href="/exams"
          className="rounded-card border border-line px-3 py-2.5 text-center font-medium"
        >
          สอบ
        </Link>
        <Link
          href="/import"
          className="rounded-card border border-line px-3 py-2.5 text-center font-medium"
        >
          ✨ AI
        </Link>
      </div>
      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        <span className="min-w-0 truncate">{user.email}</span>
        <SignOutButton compact />
      </div>
    </div>
  );
}
