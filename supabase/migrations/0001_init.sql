-- Termly เซสชัน 3: ตาราง courses, tasks, events, ai_usage + Row Level Security
-- วิธีใช้: Supabase Dashboard → SQL Editor → New query → วางทั้งไฟล์ → Run (รันครั้งเดียว)
--
-- หลักการ:
-- * ทุกตารางมี user_id ที่เติมเป็น auth.uid() อัตโนมัติ (ฝั่งแอปไม่ต้องส่งมา)
-- * เปิด RLS ทุกตาราง: ผู้ใช้เห็น/แก้ได้เฉพาะแถวที่ user_id = auth.uid()
-- * ลบบัญชีผู้ใช้ → ข้อมูลทั้งหมดของคนนั้นถูกลบตาม (on delete cascade)
-- * วันที่เก็บเป็น timestamptz (ค.ศ.) แอปแสดงผลเป็น พ.ศ. โซน Asia/Bangkok

-- ─────────────────────────────────────────────
-- courses: วิชาของผู้ใช้
-- ─────────────────────────────────────────────
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  code text check (code is null or char_length(code) <= 50),
  created_at timestamptz not null default now(),
  -- ใช้คู่กับ foreign key ของ tasks/events เพื่อกันการผูกกับวิชาของคนอื่น
  unique (id, user_id)
);

create index courses_user_id_idx on public.courses (user_id);

-- ─────────────────────────────────────────────
-- tasks: งานที่ต้องส่ง
-- ─────────────────────────────────────────────
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 300),
  -- null = ยังไม่กำหนดวันส่ง (แอปจะแสดงป้ายเตือน)
  due_at timestamptz,
  -- false = รู้แค่วัน ไม่รู้เวลา (เก็บเป็น 23:59 ของวันนั้น เวลาไทย)
  due_has_time boolean not null default false,
  notes text check (notes is null or char_length(notes) <= 2000),
  source text not null default 'manual' check (source in ('manual', 'ai')),
  done boolean not null default false,
  created_at timestamptz not null default now(),
  -- วิชาต้องเป็นของผู้ใช้คนเดียวกัน; ลบวิชา → งานยังอยู่ แค่ course_id เป็น null
  foreign key (course_id, user_id)
    references public.courses (id, user_id)
    on delete set null (course_id),
  -- ไม่มีวันส่ง ก็ต้องไม่มีเวลาส่ง
  check (due_at is not null or due_has_time = false)
);

create index tasks_user_due_idx on public.tasks (user_id, due_at);
create index tasks_course_id_idx on public.tasks (course_id);

-- ─────────────────────────────────────────────
-- events: สิ่งที่เกิดตามเวลา (สอบ, คาบเรียน, กิจกรรม)
-- ─────────────────────────────────────────────
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 300),
  kind text not null default 'other' check (kind in ('exam', 'class', 'activity', 'other')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text check (location is null or char_length(location) <= 300),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  foreign key (course_id, user_id)
    references public.courses (id, user_id)
    on delete set null (course_id),
  check (ends_at is null or ends_at >= starts_at)
);

create index events_user_starts_idx on public.events (user_id, starts_at);
create index events_course_id_idx on public.events (course_id);

-- ─────────────────────────────────────────────
-- ai_usage: บันทึกการเรียก AI (ใช้นับลิมิต 10 ครั้ง/วัน)
-- ─────────────────────────────────────────────
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  input_type text not null check (input_type in ('text', 'pdf', 'image')),
  success boolean not null default false
);

create index ai_usage_user_created_idx on public.ai_usage (user_id, created_at);

-- ─────────────────────────────────────────────
-- สิทธิ์: ผู้ที่ยังไม่ล็อกอิน (anon) แตะตารางไม่ได้เลย
-- ─────────────────────────────────────────────
revoke all on public.courses, public.tasks, public.events, public.ai_usage from anon;

grant select, insert, update, delete on public.courses, public.tasks, public.events to authenticated;
-- ai_usage: ดูและเพิ่มได้อย่างเดียว ห้ามแก้/ลบ (กันการลบประวัติเพื่อเลี่ยงลิมิต)
revoke all on public.ai_usage from authenticated;
grant select, insert on public.ai_usage to authenticated;

-- ─────────────────────────────────────────────
-- Row Level Security
-- ใช้ (select auth.uid()) แทน auth.uid() เพื่อให้ Postgres คำนวณครั้งเดียวต่อ query (เร็วกว่า)
-- ─────────────────────────────────────────────
alter table public.courses enable row level security;
alter table public.tasks enable row level security;
alter table public.events enable row level security;
alter table public.ai_usage enable row level security;

-- courses
create policy "courses: select own" on public.courses
  for select to authenticated using (user_id = (select auth.uid()));
create policy "courses: insert own" on public.courses
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "courses: update own" on public.courses
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "courses: delete own" on public.courses
  for delete to authenticated using (user_id = (select auth.uid()));

-- tasks
create policy "tasks: select own" on public.tasks
  for select to authenticated using (user_id = (select auth.uid()));
create policy "tasks: insert own" on public.tasks
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "tasks: update own" on public.tasks
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "tasks: delete own" on public.tasks
  for delete to authenticated using (user_id = (select auth.uid()));

-- events
create policy "events: select own" on public.events
  for select to authenticated using (user_id = (select auth.uid()));
create policy "events: insert own" on public.events
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "events: update own" on public.events
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "events: delete own" on public.events
  for delete to authenticated using (user_id = (select auth.uid()));

-- ai_usage (ไม่มี policy update/delete = ทำไม่ได้)
create policy "ai_usage: select own" on public.ai_usage
  for select to authenticated using (user_id = (select auth.uid()));
create policy "ai_usage: insert own" on public.ai_usage
  for insert to authenticated with check (user_id = (select auth.uid()));
