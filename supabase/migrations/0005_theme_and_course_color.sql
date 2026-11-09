-- Termly เซสชัน 12b: ธีมมืด/สว่าง + สีประจำวิชา
-- วิธีใช้: Supabase Dashboard → SQL Editor → New query → วางทั้งไฟล์ → Run (รันครั้งเดียว หลัง 0004)
-- RLS เดิมของ user_settings / courses ครอบคลุมคอลัมน์ใหม่อยู่แล้ว

-- ธีม: system = ตามมือถือ/คอม, light = สว่าง, dark = มืด
alter table public.user_settings
  add column theme text not null default 'system' check (theme in ('system', 'light', 'dark'));

-- สีประจำวิชา: เลข 0–7 = สีในชุดสีของแอป (app/globals.css --course-N)
-- null = ให้แอปเลือกให้อัตโนมัติจาก id วิชา
alter table public.courses
  add column color smallint check (color is null or color between 0 and 7);
