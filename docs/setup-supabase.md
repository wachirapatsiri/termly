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
