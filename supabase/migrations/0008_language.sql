-- Termly เซสชัน 14: ภาษาของแอป (ไทย / อังกฤษ) เก็บกับบัญชี จำข้ามเครื่อง
-- วิธีใช้: Supabase Dashboard → SQL Editor → New query → วางทั้งไฟล์ → Run (รันครั้งเดียว หลัง 0007)
-- RLS เดิมของ user_settings ครอบคลุมคอลัมน์ใหม่อยู่แล้ว
--
-- null = ยังไม่เคยเลือกภาษา → แอปใช้ภาษาที่เลือกไว้ใน cookie ของเครื่อง (เช่น เลือกที่หน้าล็อกอิน) แล้วค่อยใช้ไทย
alter table public.user_settings
  add column if not exists language text check (language is null or language in ('th', 'en'));
