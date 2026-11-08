-- Termly เซสชัน 7b: ติ๊ก "วิชานี้ไม่มีสอบกลางภาค / ปลายภาค" ในการ์ดวิชา
-- วิธีใช้: Supabase Dashboard → SQL Editor → New query → วางทั้งไฟล์ → Run (รันครั้งเดียว หลัง 0002)
-- RLS ของ courses ครอบคลุมคอลัมน์ใหม่อยู่แล้ว (ผู้ใช้แก้ได้เฉพาะวิชาตัวเอง)

alter table public.courses
  add column no_midterm boolean not null default false,
  add column no_final boolean not null default false;
