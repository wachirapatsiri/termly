-- Termly เซสชัน 6: แยก "สอบ" ออกจาก "งาน" + ประเภทงาน
-- วิธีใช้: Supabase Dashboard → SQL Editor → New query → วางทั้งไฟล์ → Run (รันครั้งเดียว หลัง 0001)
--
-- สิ่งที่เปลี่ยน:
-- * ตารางใหม่ task_categories: ประเภทงานของผู้ใช้แต่ละคน (ค่าตั้งต้น 7 แบบ + เพิ่มเองได้)
-- * tasks.category_id: ประเภทของงาน (ว่างได้)
-- * events: starts_at ว่างได้ (สอบที่ยังไม่ประกาศวัน), has_time, exam_type (กลางภาค/ปลายภาค/อื่น ๆ)

-- ─────────────────────────────────────────────
-- task_categories: ประเภทงาน เช่น การบ้าน, Quiz, Lab
-- ─────────────────────────────────────────────
create table public.task_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 30),
  -- ลำดับในตัวเลือก (น้อยขึ้นก่อน) ประเภทที่ผู้ใช้เพิ่มเองอยู่ก่อน "อื่น ๆ"
  position integer not null default 500,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

-- ชื่อซ้ำกันไม่ได้ (ไม่สนตัวพิมพ์เล็ก/ใหญ่ และช่องว่างหัวท้าย)
create unique index task_categories_user_name_idx
  on public.task_categories (user_id, lower(btrim(name)));

-- ใส่ประเภทตั้งต้นให้ผู้ใช้ 1 คน
create function public.seed_task_categories(uid uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.task_categories (user_id, name, position)
  values
    (uid, 'การบ้าน', 10),
    (uid, 'Quiz', 20),
    (uid, 'Lab', 30),
    (uid, 'โปรเจกต์', 40),
    (uid, 'รายงาน', 50),
    (uid, 'นำเสนอ', 60),
    (uid, 'อื่น ๆ', 1000)
  on conflict do nothing;
$$;
-- เรียกได้จาก trigger เท่านั้น ผู้ใช้เรียกเองไม่ได้
revoke execute on function public.seed_task_categories(uuid) from public, anon, authenticated;

-- ผู้ใช้ใหม่ → ได้ประเภทตั้งต้นอัตโนมัติ
create function public.handle_new_user_categories()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.seed_task_categories(new.id);
  return new;
end;
$$;
revoke execute on function public.handle_new_user_categories() from public, anon, authenticated;

create trigger on_auth_user_created_categories
  after insert on auth.users
  for each row execute function public.handle_new_user_categories();

-- ผู้ใช้ที่มีอยู่แล้ว → เติมให้ตอนนี้
select public.seed_task_categories(id) from auth.users;

-- ─────────────────────────────────────────────
-- tasks: เพิ่มประเภทงาน
-- ─────────────────────────────────────────────
alter table public.tasks add column category_id uuid;
-- ประเภทต้องเป็นของผู้ใช้คนเดียวกัน; ลบประเภท → งานยังอยู่ แค่ category_id เป็น null
alter table public.tasks
  add constraint tasks_category_fk foreign key (category_id, user_id)
    references public.task_categories (id, user_id)
    on delete set null (category_id);
create index tasks_category_id_idx on public.tasks (category_id);

-- ─────────────────────────────────────────────
-- events: รองรับสอบที่ยังไม่รู้วัน/เวลา + ชนิดสอบ
-- ─────────────────────────────────────────────
alter table public.events alter column starts_at drop not null;
-- false = รู้แค่วัน (เก็บเป็น 00:00 ของวันนั้น เวลาไทย)
alter table public.events add column has_time boolean not null default false;
alter table public.events
  add column exam_type text check (exam_type in ('midterm', 'final', 'other'));
-- ไม่มีวันเริ่ม ก็ต้องไม่มีเวลาและเวลาจบ; ชนิดสอบใช้กับ kind = exam เท่านั้น
alter table public.events
  add constraint events_no_start_check
    check (starts_at is not null or (has_time = false and ends_at is null)),
  add constraint events_exam_type_kind_check
    check (exam_type is null or kind = 'exam');

-- ─────────────────────────────────────────────
-- สิทธิ์ + Row Level Security ของ task_categories
-- ─────────────────────────────────────────────
revoke all on public.task_categories from anon;
grant select, insert, update, delete on public.task_categories to authenticated;
alter table public.task_categories enable row level security;

create policy "task_categories: select own" on public.task_categories
  for select to authenticated using (user_id = (select auth.uid()));
create policy "task_categories: insert own" on public.task_categories
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "task_categories: update own" on public.task_categories
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "task_categories: delete own" on public.task_categories
  for delete to authenticated using (user_id = (select auth.uid()));
