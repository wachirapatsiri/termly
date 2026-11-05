@AGENTS.md

# Termly

เว็บแอป (PWA) สำหรับนักศึกษามหาวิทยาลัยไทย: วางข้อความ / อัปโหลด PDF / รูป (syllabus, ประกาศงาน) → AI ดึงรายการงานและ deadline → ผู้ใช้ตรวจแก้ก่อนบันทึก → ดูแผนรายสัปดาห์ → ส่งออก .ics ลง Google Calendar

ผู้ใช้: นักศึกษาไทย ภาษาไทยเป็นหลัก ใช้มือถือเป็นส่วนใหญ่ (mobile-first)

## เจ้าของโปรเจกต์ / วิธีทำงาน
- นักศึกษา Data Science ไม่ใช่นักพัฒนาเว็บเต็มตัว → อธิบายเป็นภาษาไทยง่าย ๆ
- ทำวันละ 1–2 ชม. → แบ่งงานเป็นชิ้นเล็กที่เสร็จและทดสอบได้ในเซสชันเดียว
- ก่อนเขียนโค้ดส่วนใหม่ที่ใหญ่ ให้เสนอแผนให้ยืนยันก่อน
- ตั้งชื่อเซสชันในแชท Claude เองทันทีที่รู้ว่าทำเซสชันไหน (ไม่ต้องรอผู้ใช้สั่ง) รูปแบบ `Termly S<เลข>: <สิ่งที่ทำ>` เช่น `Termly S3: ตาราง + RLS` — ใช้ tool `set_session_title`
- จบทุกเซสชันด้วยสรุป: เสร็จอะไร, ค้างอะไร, เซสชันหน้าควรทำอะไร และอัปเดตส่วน "สถานะ" ด้านล่าง

## Tech stack
- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 — เวอร์ชันใหม่ อ่าน docs ใน `node_modules/next/dist/docs/` ก่อนเขียนโค้ด
- Supabase: Google login + Postgres + Row Level Security
- Deploy บน Vercel
- Supabase auth: `@supabase/ssr` + `getClaims()` (ตรวจ JWT) ผ่าน `getCurrentUser()` ใน `lib/auth.ts`; `cacheComponents` เปิดอยู่ → ส่วนที่อ่าน user ต้องอยู่ใน `<Suspense>`; env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ดู `.env.example`)
- ฐานข้อมูล: แก้ตารางด้วยไฟล์ใหม่ใน `supabase/migrations/` (เลขถัดไป) ห้ามแก้ไฟล์ที่รันไปแล้ว; user_id เติม `auth.uid()` เอง ไม่ต้องส่งจากแอป; `ai_usage` ผู้ใช้แก้/ลบไม่ได้
- Node.js อยู่ที่ `/usr/local/bin` (ถ้า shell หาไม่เจอให้ `export PATH="/usr/local/bin:$PATH"`)

## ขอบเขต MVP (เฉพาะงาน/deadline)
1. ล็อกอินด้วย Google
2. เพิ่มวิชา (ชื่อวิชา, รหัสวิชา)
3. เพิ่ม/แก้/ลบงานด้วยมือ
4. วางข้อความหรืออัปโหลดไฟล์ → AI ดึงงาน (ชื่อ, วิชา, วันส่ง, หมายเหตุ) → หน้า "ตรวจก่อนบันทึก" → บันทึก
5. มุมมองรายสัปดาห์ บอกว่าสัปดาห์ไหนงานหนัก
6. ส่งออกไฟล์ .ics

**ยังไม่ทำ:** คะแนนรายงานแต่ละชิ้น, เครื่องคำนวณเกรด, ส่วนกิจกรรม, ระบบจ่ายเงิน

## กฎความปลอดภัยและต้นทุน (ห้ามละเมิด)
- เรียก AI API จากฝั่งเซิร์ฟเวอร์เท่านั้น (route handler) key อยู่ใน env ที่ไม่มี prefix `NEXT_PUBLIC_`
- จำกัด AI 10 ครั้ง/ผู้ใช้/วัน (นับจากตาราง `ai_usage`) และจำกัดไฟล์ 5 MB
- เปิด RLS ทุกตาราง: ผู้ใช้เห็นเฉพาะแถวที่ `user_id = auth.uid()`
- AI ตอบผิดรูปแบบหรือวันที่ไม่ชัด → แสดงคำเตือนให้ผู้ใช้แก้ ห้ามเดาเงียบ ๆ
- รองรับปี พ.ศ. และ ค.ศ. ในเอกสารไทย

## สิ่งที่ตัดสินใจแล้ว
- โครงสร้าง: `app/` (หน้า: login, courses, tasks, import, api/extract, api/export-ics), `lib/supabase`, `lib/ai` (prompt + ตรวจด้วย Zod), `lib/dates` (พ.ศ.↔ค.ศ.), `components/`, `supabase/migrations/` (SQL เก็บใน git)
- ตาราง:
  - `courses`: id, user_id, name, code, created_at
  - `tasks`: id, user_id, course_id (nullable), title, due_at (nullable = ยังไม่กำหนดวันส่ง → แสดงป้ายเตือนสีเหลือง), due_has_time (false = รู้แค่วัน เก็บเป็น 23:59 เวลาไทย), notes, source (`manual`/`ai`), done, created_at
  - `ai_usage`: id, user_id, created_at, input_type (`text`/`pdf`/`image`), success
  - `events` (สร้างในเซสชัน 3 ตามแผนผู้ใช้): id, user_id, course_id (nullable), title, kind (`exam`/`class`/`activity`/`other`), starts_at, ends_at (nullable), location, notes, created_at — ต่างจาก `tasks` ตรงที่เป็นสิ่งที่ "เกิดขึ้นตามเวลา" (สอบ, กิจกรรม) ไม่ใช่งานที่ต้องส่ง ใน MVP ใช้กับวันสอบ Midterm/Final ก่อน หน้า UI ของกิจกรรมเต็มรูปแบบอยู่เฟส 2
- วันที่เก็บเป็น ค.ศ. (timestamptz, โซนเวลา Asia/Bangkok) แสดงผลเป็น พ.ศ.
- ไม่เก็บไฟล์ที่อัปโหลด: ส่งให้ AI แล้วทิ้ง
- AI ส่ง `confidence` + `raw_date_text` ต่อรายการ; รายการไม่มั่นใจไฮไลต์เตือน และต้องยืนยันก่อนบันทึก
- "สัปดาห์งานหนัก" = นับจำนวนงานต่อสัปดาห์ (จันทร์–อาทิตย์)
- AI: Claude API ฝั่งเซิร์ฟเวอร์ (อ่าน PDF/รูปได้ตรง)

## สไตล์ UI
minimal, ภาษาไทยเป็นหลัก, ฟอนต์ Anuphan, พื้นหลัง `#FAFAF8`, ตัวอักษร `#1F2328`, สีเน้น `#3B5BDB`, เส้นขอบบางแทนเงา, มุมโค้งเล็กน้อย, เว้นระยะกว้าง, mobile-first
- token สีอยู่ใน `app/globals.css`: `bg-background`, `text-foreground`, `text-muted`, `bg-accent`/`text-accent`, `border-line`, `rounded-card`

## แผนเซสชัน / สถานะ
แผนเต็มของผู้ใช้ (12 เซสชัน, เฟส 2, เช็กลิสต์ก่อนเปิดให้คนลอง, ตัววัดผล) อยู่ที่ `docs/plan.md` — ยึดลำดับตามนั้น

1. [x] ตั้งโปรเจกต์ Next.js + Tailwind + Anuphan + CLAUDE.md + deploy Vercel — https://termly-zeta.vercel.app (GitHub `wachirapatsiri/termly`, push ขึ้น `main` แล้ว Vercel deploy อัตโนมัติ)
2. [x] Supabase + ล็อกอินด้วย Google — ทดสอบบนเว็บจริงผ่าน (Supabase project `adbgiuinkqeaohdcfnmm`, Singapore; Google OAuth อยู่โหมด Testing → เพื่อนที่จะลองต้องอยู่ใน Test users หรือ Publish แอปก่อนเซสชัน 12; ขั้นตอนตั้งค่าอยู่ `docs/setup-supabase.md`)
3. [x] ตาราง courses, tasks, events (+ ai_usage) + RLS → เพิ่ม/ดู/แก้/ลบ task ด้วยมือได้ — SQL `supabase/migrations/0001_init.sql` (รันใน SQL Editor ตาม `docs/setup-supabase.md` ข้อ 6), หน้า `/tasks` + Server Actions `app/tasks/actions.ts`, ทดสอบ RLS ด้วย `npm run test:db` (PGlite)
4. [x] หน้าเพิ่มวิชา + หน้ารายการงาน (เรียงตามวัน) — หน้า `/courses` (เพิ่ม/แก้/ลบวิชา + นับงานค้าง, `app/courses/actions.ts`), `/tasks` แบ่งกลุ่ม ยังไม่กำหนดวันส่ง/เลยกำหนด/วันนี้/พรุ่งนี้/ภายใน 7 วัน/หลังจากนั้น (`dueGroup()` ใน `lib/dates.ts`) + กรองวิชา `?course=<id>` + เลือกหลายงาน (ติ๊กเสร็จ/ลบ), การ์ดวิชากางดูงานค้าง (ติ๊ก/ลบได้), ลบวิชาถามว่าจะลบงานด้วยไหม, หน้า `/settings` (แสดงวิชาเป็นรหัส/ชื่อ), แถบเมนู `components/app-nav.tsx` — ผู้ใช้ลองบนเว็บจริงแล้วโอเค
5. [ ] หน้าวางข้อความ → AI ฝั่งเซิร์ฟเวอร์ → JSON (title, course, due_date, due_date_confidence, note) + ชุดทดสอบภาษาไทย 3 แบบ
6. [ ] หน้าตรวจก่อนบันทึก (การ์ด, แก้/ติ๊ก/ลบ, confidence ต่ำ = สีเหลือง, บันทึกทั้งหมด)
7. [ ] อัปโหลด PDF และรูป
8. [ ] จำกัด AI 10 ครั้ง/วัน + จัดการ error (AI ตอบผิดรูปแบบ, ไฟล์ใหญ่เกิน)
9. [ ] มุมมองรายสัปดาห์ + PWA
10. [ ] ส่งออก .ics
11. [ ] ปรับ UI + หน้าแรกอธิบายสั้น ๆ + ทดสอบใช้เอง — + ย้ายการตั้งค่า (ตอนนี้มีแค่ "แสดงวิชาเป็นรหัส/ชื่อ" เก็บใน cookie `course_label`, `lib/preferences.ts`) ไปเก็บในตาราง `user_settings` (migration ใหม่ + RLS) ให้จำข้ามเครื่อง
12. [ ] เปิดให้เพื่อน 5–10 คนลอง + ฟอร์มความเห็น + ราคาทดลอง


## เฟส 2 (ยังไม่ทำ)
สัดส่วนคะแนน (ล็อก Midterm/Final + ก้อน "งานเก็บคะแนน") + เครื่องคำนวณเกรดไฟนอล, ส่วนกิจกรรม, ระบบชำระเงิน

**Optional (ทำเมื่อจะเปิดจริง ไม่จำเป็นช่วงทดลอง):** หน้าเลือกบัญชี Google ตอนล็อกอินขึ้น "ไปยัง adbgiuinkqeaohdcfnmm.supabase.co" แทนชื่อแอป — แก้ได้ 2 ทาง: (1) Supabase custom domain เช่น `auth.<โดเมน>` (ต้องซื้อโดเมน + Supabase Pro + add-on, เช็กราคาใน Billing) หรือ (2) Google brand verification (ต้องมีหน้า privacy policy + ยืนยันโดเมน + รอ Google ตรวจ) — ระหว่างนี้บอกผู้ทดลองว่าเป็นเรื่องปกติ
