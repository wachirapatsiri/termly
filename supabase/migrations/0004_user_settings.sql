-- Termly เซสชัน 12: เก็บการตั้งค่าของผู้ใช้ในฐานข้อมูล (จำข้ามเครื่อง/ข้ามเบราว์เซอร์)
-- วิธีใช้: Supabase Dashboard → SQL Editor → New query → วางทั้งไฟล์ → Run (รันครั้งเดียว หลัง 0003)
--
-- เดิมเก็บใน cookie (course_label, year_mode) → เปิดเครื่องใหม่ต้องตั้งใหม่
-- แอปอ่านจากตารางนี้ก่อน ถ้ายังไม่มีแถว (ยังไม่เคยกดตั้งค่า) ค่อยใช้ cookie เดิม / ค่าตั้งต้น

create table public.user_settings (
  -- ผู้ใช้ 1 คน = 1 แถว
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- แสดงวิชาเป็น รหัส / ชื่อ / รหัส + ชื่อ
  course_label text not null default 'code' check (course_label in ('code', 'name', 'both')),
  -- แสดงปีเป็น พ.ศ. (be) / ค.ศ. (ce)
  year_mode text not null default 'be' check (year_mode in ('be', 'ce')),
  updated_at timestamptz not null default now()
);

revoke all on public.user_settings from anon;
-- ไม่ให้ลบ: ไม่จำเป็น (ลบบัญชี → แถวหายตามเอง)
revoke all on public.user_settings from authenticated;
grant select, insert, update on public.user_settings to authenticated;

alter table public.user_settings enable row level security;

create policy "user_settings: select own" on public.user_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "user_settings: insert own" on public.user_settings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "user_settings: update own" on public.user_settings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
