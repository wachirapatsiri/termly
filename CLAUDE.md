@AGENTS.md

# Termly

เว็บแอป (PWA) สำหรับนักศึกษามหาวิทยาลัยไทย: วางข้อความ / อัปโหลด PDF / รูป (syllabus, ประกาศงาน) → AI ดึงรายการงานและ deadline → ผู้ใช้ตรวจแก้ก่อนบันทึก → ดูแผนรายสัปดาห์ → ส่งออก .ics ลง Google Calendar

ผู้ใช้: นักศึกษาไทย ภาษาไทยเป็นหลัก ใช้มือถือเป็นส่วนใหญ่ (mobile-first)

## เจ้าของโปรเจกต์ / วิธีทำงาน
- นักศึกษา Data Science ไม่ใช่นักพัฒนาเว็บเต็มตัว → อธิบายเป็นภาษาไทยง่าย ๆ
- ทำวันละ 1–2 ชม. → แบ่งงานเป็นชิ้นเล็กที่เสร็จและทดสอบได้ในเซสชันเดียว
- ก่อนเขียนโค้ดส่วนใหม่ที่ใหญ่ ให้เสนอแผนให้ยืนยันก่อน
- จบทุกเซสชันด้วยสรุป: เสร็จอะไร, ค้างอะไร, เซสชันหน้าควรทำอะไร และอัปเดตส่วน "สถานะ" ด้านล่าง

## Tech stack
- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 — เวอร์ชันใหม่ อ่าน docs ใน `node_modules/next/dist/docs/` ก่อนเขียนโค้ด
- Supabase: Google login + Postgres + Row Level Security
- Deploy บน Vercel
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
  - `tasks`: id, user_id, course_id (nullable), title, due_at, due_has_time, notes, source (`manual`/`ai`), done, created_at
  - `ai_usage`: id, user_id, created_at, input_type (`text`/`pdf`/`image`), success
- วันที่เก็บเป็น ค.ศ. (timestamptz, โซนเวลา Asia/Bangkok) แสดงผลเป็น พ.ศ.
- ไม่เก็บไฟล์ที่อัปโหลด: ส่งให้ AI แล้วทิ้ง
- AI ส่ง `confidence` + `raw_date_text` ต่อรายการ; รายการไม่มั่นใจไฮไลต์เตือน และต้องยืนยันก่อนบันทึก
- "สัปดาห์งานหนัก" = นับจำนวนงานต่อสัปดาห์ (จันทร์–อาทิตย์)
- AI: Claude API ฝั่งเซิร์ฟเวอร์ (อ่าน PDF/รูปได้ตรง)

## สไตล์ UI
minimal, ภาษาไทยเป็นหลัก, ฟอนต์ Anuphan, พื้นหลัง `#FAFAF8`, ตัวอักษร `#1F2328`, สีเน้น `#3B5BDB`, เส้นขอบบางแทนเงา, มุมโค้งเล็กน้อย, เว้นระยะกว้าง, mobile-first
- token สีอยู่ใน `app/globals.css`: `bg-background`, `text-foreground`, `text-muted`, `bg-accent`/`text-accent`, `border-line`, `rounded-card`

## แผนเซสชัน / สถานะ
1. [x] ตั้งโปรเจกต์ Next.js + Tailwind + Anuphan + CLAUDE.md — [ ] deploy Vercel (รอผู้ใช้ push ขึ้น GitHub แล้วเชื่อม Vercel)
2. [ ] Supabase + ล็อกอินด้วย Google
3. [ ] ตาราง + RLS + หน้าจัดการวิชา
4. [ ] เพิ่ม/แก้/ลบงานด้วยมือ
5. [ ] มุมมองรายสัปดาห์
6. [ ] ส่งออก .ics
7. [ ] AI ดึงงานจากข้อความ + หน้าตรวจก่อนบันทึก + โควตา
8. [ ] รองรับ PDF/รูป + จำกัดขนาดไฟล์
9. [ ] PWA + เก็บงานที่เหลือ
