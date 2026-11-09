-- Termly เซสชัน 13: ฟอร์มความเห็น + ลบข้อมูล / ลบบัญชี
-- วิธีใช้: Supabase Dashboard → SQL Editor → New query → วางทั้งไฟล์ → Run (รันครั้งเดียว หลัง 0005)

-- ─── 1) ความเห็นจากผู้ทดลอง ───
-- ส่งได้หลายครั้ง (ลองใช้ไปอีกสัปดาห์แล้วบอกเพิ่มได้) แก้/ลบไม่ได้
-- ลบบัญชี → ความเห็นยังอยู่แต่ไม่รู้ว่าใครส่ง (user_id เป็น null)
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  -- 1) ให้คะแนนโดยรวม 1–5
  rating smallint check (rating between 1 and 5),
  rating_note text check (char_length(rating_note) <= 1000),
  -- 2) AI อ่านถูกแค่ไหน
  ai_accuracy text check (ai_accuracy in ('mostly_right', 'some_fixes', 'many_wrong', 'not_tried')),
  ai_note text check (char_length(ai_note) <= 1000),
  -- 3) ยอมจ่าย Pro เท่าไหร่ต่อเทอม (free = ใช้แค่แบบฟรีพอ)
  price text check (price in ('49', '79', '99', 'free')),
  price_note text check (char_length(price_note) <= 1000),
  -- 4) อยากให้มีล็อกอินด้วยอีเมล + รหัสผ่านไหม
  email_login text check (email_login in ('want', 'google_ok')),
  login_note text check (char_length(login_note) <= 1000),
  -- 5) อยากให้เพิ่ม/แก้อะไร
  message text check (char_length(message) <= 2000),
  created_at timestamptz not null default now(),
  -- ต้องตอบอย่างน้อย 1 ข้อ
  check (
    coalesce(
      rating::text, ai_accuracy, price, email_login,
      nullif(btrim(message), ''), nullif(btrim(rating_note), ''), nullif(btrim(ai_note), ''),
      nullif(btrim(price_note), ''), nullif(btrim(login_note), '')
    ) is not null
  )
);

create index feedback_user_id_idx on public.feedback (user_id);

revoke all on public.feedback from anon;
revoke all on public.feedback from authenticated;
grant select, insert on public.feedback to authenticated;

alter table public.feedback enable row level security;

create policy "feedback: select own" on public.feedback
  for select to authenticated using (user_id = (select auth.uid()));
create policy "feedback: insert own" on public.feedback
  for insert to authenticated with check (user_id = (select auth.uid()));

-- ─── 2) ลบข้อมูลทั้งหมด (เก็บบัญชีไว้) ───
-- ลบ งาน / สอบ / วิชา / ประเภทงาน / การตั้งค่า แล้วเติมประเภทตั้งต้นให้ใหม่
-- ไม่ลบ ai_usage (กันลบเพื่อรีเซ็ตโควตา AI) และ feedback
create function public.delete_my_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  delete from public.tasks where user_id = uid;
  delete from public.events where user_id = uid;
  delete from public.courses where user_id = uid;
  delete from public.task_categories where user_id = uid;
  delete from public.user_settings where user_id = uid;
  perform public.seed_task_categories(uid);
end;
$$;

-- ─── 3) ลบบัญชีถาวร ───
-- ลบแถวใน auth.users → ตารางอื่นลบตาม (on delete cascade), feedback เหลือแบบไม่ระบุตัวตน
-- ล็อกอิน Google ครั้งหน้า = บัญชีใหม่เริ่มจากศูนย์
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_data() from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_data() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
