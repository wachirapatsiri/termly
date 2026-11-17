// ข้อความในแอป 2 ภาษา — th เป็นต้นฉบับ, en ต้องมีครบทุกคีย์เท่ากัน (TypeScript + tests/i18n.test.ts เช็กให้)
// ใช้: t(lang, "nav.tasks") / t(lang, "home.free", { n: 10 }) → ข้อความที่มี {n} จะถูกแทนค่า
// ทำทีละส่วน (เซสชัน 14): ตอนนี้แปลแล้ว = เมนู, หน้าแรก, หน้าเข้าสู่ระบบ, ตัวเลือกภาษา — ส่วนอื่นยังเป็นไทยอย่างเดียว
import { DEFAULT_LANG, type Lang } from "./i18n.ts";

const th = {
  // เมนูด้านบน
  "nav.tasks": "งาน",
  "nav.exams": "สอบ",
  "nav.courses": "วิชา",
  "nav.ai": "AI ช่วยเพิ่ม",
  "nav.aiAria": "AI ช่วยเพิ่มงานและสอบ",
  "nav.settings": "ตั้งค่า",

  // หน้าแรก
  "home.audience": "สำหรับนักศึกษามหาวิทยาลัย",
  "home.tagline": "รวมงาน deadline และวันสอบของทุกวิชาไว้ในที่เดียว",
  "home.sub": "วางซิลลาบัส แล้วให้ AI แยกงานและวันสอบให้",
  "home.how": "ใช้งานอย่างไร",
  "home.step1.title": "วางซิลลาบัสหรือประกาศงาน",
  "home.step1.body": "วางข้อความ แนบ PDF หรือรูปแคป",
  "home.step2.title": "AI ดึงงาน วันส่ง และวันสอบ",
  "home.step2.body": "วันที่ไม่ชัดจะเตือนให้ตรวจ ไม่เดาเอง",
  "home.step3.title": "ตรวจ แก้ แล้วค่อยบันทึก",
  "home.step3.body": "เลือกเฉพาะรายการที่ถูก แก้ได้ก่อนบันทึก",
  "home.step4.title": "ดูแผนรายสัปดาห์ + ส่งออกปฏิทิน",
  "home.step4.body": "ดูว่าสัปดาห์ไหนงานหนัก เพิ่มลงปฏิทินได้",
  "home.note.free": "ช่วงทดลองใช้ฟรี · AI {n} ครั้ง/วัน",
  "home.note.privacy": "ไม่เก็บไฟล์ที่แนบ · เห็นข้อมูลได้เฉพาะบัญชีตัวเอง",
  "home.note.install": "ติดตั้งลงหน้าจอโฮมมือถือได้",
  "home.privacyLink": "ข้อมูลและความเป็นส่วนตัว",
  "home.hello": "สวัสดี",
  "home.signOut": "ออกจากระบบ",

  // เข้าสู่ระบบ
  "login.title": "เข้าสู่ระบบ",
  "login.desc": "ใช้บัญชี Google ของคุณ เพื่อเก็บงานและ deadline ไว้ในที่เดียว",
  "login.google": "เข้าสู่ระบบด้วย Google",
  "login.googleLoading": "กำลังไปหน้า Google…",
  "login.noSignup": "ใช้บัญชี Google ได้เลย ไม่ต้องสมัครสมาชิก",
  "login.failed": "เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง",
  "login.deleted": "ลบบัญชีและข้อมูลทั้งหมดเรียบร้อยแล้ว — ขอบคุณที่ลองใช้ Termly",
  "login.privacyLead": "ดูว่าเก็บข้อมูลอะไรบ้าง:",

  // ตั้งค่า
  "settings.language": "ภาษา / Language",
  "settings.languageHint": "เปลี่ยนภาษาของเมนูและหน้าที่แปลแล้ว · ส่วนที่ยังไม่แปลจะเป็นภาษาไทยไปก่อน · จำไว้กับบัญชี",
};

export type MessageKey = keyof typeof th;

const en: Record<MessageKey, string> = {
  "nav.tasks": "Tasks",
  "nav.exams": "Exams",
  "nav.courses": "Courses",
  "nav.ai": "AI import",
  "nav.aiAria": "Add tasks and exams with AI",
  "nav.settings": "Settings",

  "home.audience": "For university students",
  "home.tagline": "All your deadlines and exams, in one place",
  "home.sub": "Paste a syllabus and let AI pull out the tasks and exam dates",
  "home.how": "How it works",
  "home.step1.title": "Paste a syllabus or announcement",
  "home.step1.body": "Paste text, or attach a PDF or screenshot",
  "home.step2.title": "AI finds tasks, due dates and exams",
  "home.step2.body": "Unclear dates are flagged for you to check, never guessed",
  "home.step3.title": "Review, edit, then save",
  "home.step3.body": "Pick what's correct and edit before saving",
  "home.step4.title": "See your week, export to calendar",
  "home.step4.body": "See which weeks are heavy and add them to your calendar",
  "home.note.free": "Free during the trial · {n} AI uses per day",
  "home.note.privacy": "Attached files aren't stored · you only see your own data",
  "home.note.install": "Can be installed on your phone's home screen",
  "home.privacyLink": "Data and privacy",
  "home.hello": "Hello",
  "home.signOut": "Sign out",

  "login.title": "Sign in",
  "login.desc": "Use your Google account to keep your tasks and deadlines in one place",
  "login.google": "Sign in with Google",
  "login.googleLoading": "Going to Google…",
  "login.noSignup": "Use your Google account, no sign-up needed",
  "login.failed": "Sign-in failed. Please try again.",
  "login.deleted": "Your account and all data have been deleted. Thanks for trying Termly.",
  "login.privacyLead": "What we store:",

  "settings.language": "ภาษา / Language",
  "settings.languageHint":
    "Changes the menu and the pages translated so far · the rest stays in Thai for now · saved to your account",
};

const messages: Record<Lang, Record<MessageKey, string>> = { th, en };

export function t(lang: Lang, key: MessageKey, vars?: Record<string, string | number>): string {
  const text = messages[lang]?.[key] ?? messages[DEFAULT_LANG][key];
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

export const MESSAGE_KEYS = Object.keys(th) as MessageKey[];
export const MESSAGES = messages;
