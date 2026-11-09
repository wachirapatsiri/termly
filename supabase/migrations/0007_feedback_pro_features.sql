-- Termly เซสชัน 13 (ต่อ): ฟอร์มความเห็นเพิ่มข้อ "อยากได้ฟีเจอร์ Pro ไหน" (เลือกได้หลายข้อ)
-- วิธีใช้: Supabase Dashboard → SQL Editor → New query → วางทั้งไฟล์ → Run (หลัง 0006)
-- รันซ้ำได้ ไม่พัง (if not exists / if exists)

-- ฟีเจอร์ Pro ที่อยากได้ — ตรงกับ PRO_FEATURE_OPTIONS ใน lib/plans.ts
alter table public.feedback add column if not exists pro_features text[];
alter table public.feedback add column if not exists pro_note text;

alter table public.feedback drop constraint if exists feedback_pro_features_check;
alter table public.feedback add constraint feedback_pro_features_check check (
  pro_features <@ array['reminders', 'calendar_sync', 'grade_calc', 'recurring', 'more_ai']::text[]
);
alter table public.feedback drop constraint if exists feedback_pro_note_check;
alter table public.feedback add constraint feedback_pro_note_check check (char_length(pro_note) <= 1000);

-- "ต้องตอบอย่างน้อย 1 ข้อ" — นับข้อใหม่ด้วย (ตัวเดิมชื่อ feedback_check จาก 0006)
alter table public.feedback drop constraint if exists feedback_check;
alter table public.feedback drop constraint if exists feedback_answered_check;
alter table public.feedback add constraint feedback_answered_check check (
  coalesce(
    rating::text, ai_accuracy, price, email_login,
    case when cardinality(pro_features) > 0 then 'x' end,
    nullif(btrim(message), ''), nullif(btrim(rating_note), ''), nullif(btrim(ai_note), ''),
    nullif(btrim(pro_note), ''), nullif(btrim(price_note), ''), nullif(btrim(login_note), '')
  ) is not null
);
