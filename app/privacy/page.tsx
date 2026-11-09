import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "ข้อมูลและความเป็นส่วนตัว · Termly" };

// หน้าบอกว่าเก็บข้อมูลอะไร (เช็กลิสต์ก่อนเปิดให้คนลอง ใน docs/plan.md) — เปิดได้โดยไม่ต้องล็อกอิน
// ข้อความเรื่อง AI เปลี่ยนตาม env AI_PROVIDER (อ่านตอน build → เปลี่ยน env แล้ว Redeploy)
function aiSection() {
  const gemini = process.env.AI_PROVIDER?.trim().toLowerCase().replace(/^["']|["']$/g, "") === "gemini";
  return gemini
    ? {
        name: "Google Gemini (โควตาฟรี)",
        note: "เงื่อนไขของโควตาฟรี Google อาจนำข้อความ/ไฟล์ที่ส่งไปใช้ปรับปรุงโมเดลของ Google ได้",
      }
    : {
        name: "Claude ของ Anthropic",
        note: "Anthropic ไม่นำข้อมูลที่ส่งผ่าน API ไปใช้ฝึกโมเดล",
      };
}

const SECTIONS = (ai: ReturnType<typeof aiSection>) => [
  {
    title: "เก็บอะไรบ้าง",
    items: [
      "อีเมลและชื่อจากบัญชี Google — ใช้เข้าสู่ระบบเท่านั้น",
      "วิชา งาน วันสอบ ประเภทงาน และการตั้งค่าที่คุณเพิ่มเอง",
      "ประวัติการใช้ AI: เวลา ชนิด (ข้อความ/PDF/รูป) และสำเร็จไหม — ใช้นับโควตาต่อวัน ไม่เก็บเนื้อหา",
      "ความเห็นที่คุณส่งผ่านหน้า “ส่งความเห็น”",
    ],
  },
  {
    title: "ไม่เก็บอะไร",
    items: [
      "ข้อความ ไฟล์ PDF และรูปที่ส่งให้ AI อ่าน — ส่งให้ AI แล้วทิ้งทันที ไม่บันทึกไว้ที่ไหน",
      "ไม่มีโฆษณา ไม่ขายหรือแชร์ข้อมูลให้ใคร",
    ],
  },
  {
    title: "AI ที่ใช้",
    items: [
      `ช่วงนี้ใช้ ${ai.name} อ่านเอกสารให้ — ${ai.note}`,
      "ก่อนส่งข้อความ ระบบตัดอีเมลและเบอร์โทรออกให้อัตโนมัติ (ไฟล์ PDF/รูปตัดไม่ได้)",
      "แนะนำ: อย่าส่งเอกสารที่มีข้อมูลส่วนตัว หรือเอกสารที่อาจารย์ห้ามเผยแพร่",
    ],
  },
  {
    title: "ใครเห็นข้อมูลของคุณ",
    items: [
      "ผู้ใช้คนอื่นมองไม่เห็นข้อมูลของคุณ (ฐานข้อมูลล็อกให้แต่ละบัญชีเห็นเฉพาะของตัวเอง)",
      "ผู้พัฒนาเข้าถึงฐานข้อมูลได้ในฐานะผู้ดูแลระบบ — ใช้เฉพาะตอนแก้ปัญหาและดูสถิติรวม",
      "เก็บบน Supabase (เซิร์ฟเวอร์สิงคโปร์) และเว็บรันบน Vercel",
    ],
  },
  {
    title: "คุกกี้",
    items: ["ใช้เฉพาะจำการเข้าสู่ระบบและการตั้งค่า (ธีม การแสดงปี/วิชา) — ไม่มีคุกกี้ติดตามหรือโฆษณา"],
  },
  {
    title: "ลบข้อมูลของคุณ",
    items: [
      "ไปที่ ⚙ ตั้งค่า → ข้อมูลของฉัน เลือกได้ 2 แบบ: ลบข้อมูลทั้งหมด (เก็บบัญชีไว้) หรือ ลบบัญชีถาวร",
      "ลบบัญชีแล้ว ความเห็นที่เคยส่งยังเก็บไว้แบบไม่ระบุตัวตน",
    ],
  },
];

export default function PrivacyPage() {
  const sections = SECTIONS(aiSection());
  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-6 px-6 py-8 lg:max-w-3xl lg:px-10">
      <Link href="/" className="font-semibold tracking-tight">
        Termly
      </Link>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">ข้อมูลและความเป็นส่วนตัว</h1>
        <p className="text-sm text-muted">ช่วงทดลองใช้ · อัปเดต 9 พ.ย. 2569</p>
      </div>
      <div className="space-y-4">
        {sections.map((s) => (
          <section key={s.title} className="space-y-2 rounded-card border border-line bg-surface p-4 lg:p-5">
            <h2 className="font-medium">{s.title}</h2>
            <ul className="space-y-1.5 text-sm leading-relaxed">
              {s.items.map((t) => (
                <li key={t} className="flex gap-2">
                  <span aria-hidden className="text-muted">
                    •
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="text-sm text-muted">
        มีคำถาม? ล็อกอินแล้วกด{" "}
        <Link href="/feedback" className="text-accent underline">
          ส่งความเห็น
        </Link>
      </p>
    </main>
  );
}
