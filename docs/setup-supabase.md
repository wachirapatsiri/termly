# ตั้งค่า Supabase + Google Login (ทำครั้งเดียว)

โค้ดพร้อมแล้ว เหลือแค่สร้างบัญชี/คีย์ในเว็บ 3 ที่: Supabase, Google Cloud, Vercel

## 1. สร้างโปรเจกต์ Supabase
1. ไปที่ https://supabase.com/dashboard → **New project** ตั้งชื่อ `termly`, Region เลือก **Southeast Asia (Singapore)**
2. ไปที่ **Project Settings → API Keys** จดไว้ 2 ค่า:
   - **Project URL** (เช่น `https://abcd.supabase.co`)
   - **Publishable key** (ขึ้นต้นด้วย `sb_publishable_...`)
   - ⚠️ ห้ามเอา **Secret key** / `service_role` มาใส่ในแอปเด็ดขาด
3. จด **Callback URL** จาก **Authentication → Sign In / Providers → Google** (หน้าตา `https://abcd.supabase.co/auth/v1/callback`)

## 2. สร้าง Google OAuth Client
1. ไปที่ https://console.cloud.google.com → สร้างโปรเจกต์ใหม่ `termly`
2. **APIs & Services → OAuth consent screen** (หรือ "Google Auth Platform")
   - User type: **External**, ใส่ชื่อแอป Termly + อีเมลตัวเอง
   - ช่วงทดสอบ: เพิ่มอีเมลเพื่อนที่จะลองใช้ใน **Test users** (หรือกด Publish ภายหลัง)
3. **Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized redirect URIs**: ใส่ Callback URL จากข้อ 1.3
4. จด **Client ID** และ **Client secret**

## 3. เปิด Google ใน Supabase
1. **Authentication → Sign In / Providers → Google** → เปิด Enable แล้ววาง Client ID + Client secret → Save
2. **Authentication → URL Configuration**
   - **Site URL**: `https://termly-zeta.vercel.app`
   - **Redirect URLs** เพิ่ม 2 บรรทัด:
     - `https://termly-zeta.vercel.app/auth/callback`
     - `http://localhost:3000/auth/callback`

## 4. ใส่คีย์ในโปรเจกต์
- **เครื่องตัวเอง:** คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่าจริง (ไฟล์นี้ไม่ขึ้น git)
- **Vercel:** Project → **Settings → Environment Variables** เพิ่ม `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ทุก environment) แล้วกด **Redeploy**

## 5. ทดสอบ
เปิดเว็บ → กด "เข้าสู่ระบบด้วย Google" → เลือกบัญชี → กลับมาหน้าแรก เห็นชื่อ+อีเมล → กด "ออกจากระบบ" → ไปหน้า login

## 6. สร้างตาราง + RLS (เซสชัน 3)
ไฟล์ SQL อยู่ใน `supabase/migrations/` ใช้ครั้งละไฟล์ เรียงตามเลข แต่ละไฟล์รันแค่ครั้งเดียว
1. Supabase Dashboard → **SQL Editor** → **New query**
2. เปิดไฟล์ `supabase/migrations/0001_init.sql` คัดลอกทั้งหมดไปวาง → กด **Run** (ต้องขึ้น "Success. No rows returned")
3. ตรวจ: **Table Editor** ต้องเห็น 4 ตาราง `courses`, `tasks`, `events`, `ai_usage` และแต่ละตารางไม่มีป้าย "RLS disabled / Unrestricted"
4. ทดสอบบนเว็บ: ล็อกอิน → กด "งานของฉัน" → เพิ่ม / แก้ / ติ๊กเสร็จ / ลบงาน
5. ทดสอบความเป็นส่วนตัว: ล็อกอินด้วยอีก Google account (ต้องอยู่ใน Test users) → ต้องไม่เห็นงานของบัญชีแรก

> ถ้ารันแล้ว error ว่า "already exists" แปลว่าเคยรันไปแล้ว ไม่ต้องรันซ้ำ
>
> ทดสอบ RLS ในเครื่องได้โดยไม่ต้องต่อ Supabase: `npm run test:db`

## 7. ตารางสอบ + ประเภทงาน (เซสชัน 6)
**ต้องรันก่อน merge โค้ดเซสชัน 6 ขึ้น `main`** ไม่งั้นหน้างาน/นำเข้าบนเว็บจริงจะหาคอลัมน์ใหม่ไม่เจอ
1. Supabase Dashboard → **SQL Editor** → **New query**
2. เปิดไฟล์ `supabase/migrations/0002_exams_and_categories.sql` คัดลอกทั้งหมดไปวาง → กด **Run** — ผลลัพธ์จะขึ้นตาราง `seed_task_categories` ค่า `NULL` จำนวนแถว = จำนวนบัญชีที่มีอยู่ (ปกติ ไม่ใช่ error: เป็นการเติมประเภทตั้งต้นให้บัญชีเดิม)
3. ตรวจ: **Table Editor** ต้องมีตารางใหม่ `task_categories` (ไม่มีป้าย "Unrestricted") และบัญชีที่มีอยู่แล้วได้ประเภทตั้งต้นคนละ 7 แถว (การบ้าน, Quiz, Lab, โปรเจกต์, รายงาน, นำเสนอ, อื่น ๆ)
4. ทดสอบบนเว็บ: หน้า "นำเข้า" → วางซิลลาบัสที่มีวันสอบ → ต้องเห็นส่วน "📝 ตารางสอบ" แยกจาก "งาน" → บันทึก → **Table Editor** → `events` ต้องมีแถว kind = `exam`

## 8. ติ๊ก "ไม่มีสอบ" ในการ์ดวิชา (เซสชัน 7b)
**ควรรันก่อน merge โค้ดเซสชัน 7b ขึ้น `main`** — ถ้ายังไม่รัน หน้าวิชายังเปิดได้ แต่กดติ๊ก "ไม่มีสอบ" จะไม่บันทึก
1. Supabase Dashboard → **SQL Editor** → **New query**
2. เปิดไฟล์ `supabase/migrations/0003_course_no_exams.sql` คัดลอกทั้งหมดไปวาง → กด **Run** → ต้องขึ้น "Success. No rows returned"
3. ตรวจ: **Table Editor** → `courses` ต้องมีคอลัมน์ใหม่ `no_midterm` และ `no_final` (ค่าเป็น false ทุกแถว)
