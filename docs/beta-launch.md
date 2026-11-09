# เปิดให้เพื่อนลอง (เซสชัน 13)

เช็กลิสต์ทำตามลำดับ — ทุกข้อทำใน Dashboard ไม่ต้องแก้โค้ด

## 1. ก่อน merge
- [ ] รัน migration `0006` (ดู `docs/setup-supabase.md` ข้อ 11)
- [ ] ลองบน Preview: ส่งความเห็น 1 ครั้ง, ลองลบข้อมูล/ลบบัญชีด้วย**บัญชีทดลอง**
- [ ] Vercel → Settings → Environment Variables: `AI_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_MODEL` ติ๊ก **Production** ด้วย (ตอนนี้ตั้งแค่ Preview) → merge แล้ว Vercel deploy เอง

## 2. เปิดให้ทุกคนล็อกอินได้ (ไม่จำกัดคน)
ตอนนี้ Google OAuth อยู่โหมด **Testing** = ล็อกอินได้เฉพาะอีเมลใน Test users
1. https://console.cloud.google.com → เลือกโปรเจกต์ที่ใช้กับ Supabase
2. **Google Auth Platform → Branding** กรอกให้ครบก่อน (ไม่ครบ = ปุ่ม Publish กดไม่ได้ ขึ้นว่า "Valid app name, support email, homepage url, and privacy policy url are required"):
   - App name: `Termly` · User support email / Developer contact: Gmail ของเจ้าของ
   - Application home page: `https://termly-zeta.vercel.app`
   - Application privacy policy link: `https://termly-zeta.vercel.app/privacy` (merge เซสชัน 13 ก่อน หน้านี้ถึงจะเปิดได้)
   - Authorized domains: `termly-zeta.vercel.app`
   - **ไม่ต้องอัปโหลดโลโก้** — ใส่โลโก้ = Google บังคับตรวจแอป (รอหลายวัน)
   - กด Save
3. **Google Auth Platform → Audience** (ชื่อเก่า: OAuth consent screen) → **Publish app** → Confirm
4. สถานะเปลี่ยนเป็น **In production** — แอปขอแค่อีเมล/ชื่อ (ไม่ใช่ข้อมูลอ่อนไหว) จึง**ไม่ต้องรอ Google ตรวจ**
5. ลองล็อกอินด้วย Gmail ที่ไม่เคยอยู่ใน Test users → ต้องเข้าได้

สิ่งที่ผู้ทดลองจะเห็น (บอกไว้ในโพสต์): หน้าเลือกบัญชีขึ้น "ไปยัง adbgiuinkqeaohdcfnmm.supabase.co" — ปกติ แก้ทีหลังได้ (ดู Optional ใน CLAUDE.md)

## 3. ข้อความชวนเพื่อน (ก๊อปไปโพสต์ได้)
```
📚 ทำแอปช่วยจด deadline ชื่อ Termly — ขอคนช่วยลองหน่อย 🙏

วางซิลลาบัส / แคปประกาศงานจาก Canvas หรือ LINE กลุ่ม
→ AI ดึงงาน วันส่ง วันสอบ ออกมาให้ (ตรวจแก้ก่อนบันทึกได้)
→ ดูว่าสัปดาห์ไหนงานหนัก + ส่งเข้า Google Calendar ได้

🔗 https://termly-zeta.vercel.app
• ล็อกอินด้วย Google (หน้าเลือกบัญชีจะขึ้นชื่อ supabase.co เป็นเรื่องปกติ)
• ช่วงทดลองฟรีทุกอย่าง AI 10 ครั้ง/วัน
• มือถือกด "เพิ่มลงหน้าจอโฮม" ใช้เหมือนแอปได้

ใช้แล้วช่วยกด ⚙ → 💬 ส่งความเห็น หน่อยนะ ไม่ถึง 2 นาที 💙
```

## 4. ดูผล (Supabase → SQL Editor)
ใช้บัญชีเจ้าของใน SQL Editor จะเห็นข้อมูลทุกคน (ไม่ติด RLS) — ดูเฉพาะตัวเลขรวม ไม่เปิดดูงานของใครรายคน

**ความเห็นทั้งหมด**
```sql
select f.created_at at time zone 'Asia/Bangkok' as เวลา, u.email,
       f.rating, f.rating_note, f.ai_accuracy, f.ai_note,
       f.price, f.price_note, f.email_login, f.login_note, f.message
from feedback f left join auth.users u on u.id = f.user_id
order by f.created_at desc;
```

**สรุปราคาที่ยอมจ่าย / คะแนน / ความแม่นของ AI** (นับคำตอบล่าสุดของแต่ละคน)
```sql
with latest as (
  select distinct on (user_id) * from feedback order by user_id, created_at desc
)
select 'ราคา' as ข้อ, coalesce(price, '(ไม่ตอบ)') as คำตอบ, count(*) from latest group by 2
union all
select 'คะแนน', coalesce(rating::text, '(ไม่ตอบ)'), count(*) from latest group by 2
union all
select 'AI', coalesce(ai_accuracy, '(ไม่ตอบ)'), count(*) from latest group by 2
union all
select 'ล็อกอินอีเมล', coalesce(email_login, '(ไม่ตอบ)'), count(*) from latest group by 2
order by 1, 2;
```

**ใช้ซ้ำใน 2 สัปดาห์ไหม** (ตัววัดใน `docs/plan.md`: กลับมาใช้อีกในวันอื่นหลังวันแรก)
```sql
with activity as (
  select user_id, (created_at at time zone 'Asia/Bangkok')::date as d from tasks
  union select user_id, (created_at at time zone 'Asia/Bangkok')::date from events
  union select user_id, (created_at at time zone 'Asia/Bangkok')::date from ai_usage
  union select user_id, (created_at at time zone 'Asia/Bangkok')::date from courses
)
select u.email,
       (u.created_at at time zone 'Asia/Bangkok')::date as สมัคร,
       count(distinct a.d) as จำนวนวันที่ใช้,
       max(a.d) as ใช้ล่าสุด,
       count(distinct a.d) filter (
         where a.d > (u.created_at at time zone 'Asia/Bangkok')::date
           and a.d <= (u.created_at at time zone 'Asia/Bangkok')::date + 14
       ) > 0 as กลับมาใน_2_สัปดาห์
from auth.users u left join activity a on a.user_id = u.id
group by u.id order by สมัคร desc;
```
> ข้อจำกัด: นับจาก "วันที่เพิ่มของ" + "วันที่ใช้ AI" เท่านั้น (เปิดดูอย่างเดียวไม่ถูกนับ — ยังไม่มีตารางเก็บการเข้าใช้)

**การใช้ AI รายวัน** (เช็กว่าโควตา Gemini ฟรีจะพอไหม)
```sql
select (created_at at time zone 'Asia/Bangkok')::date as วัน,
       count(*) filter (where success) as สำเร็จ,
       count(*) filter (where not success) as ล้มเหลว,
       count(distinct user_id) as คน
from ai_usage group by 1 order by 1 desc;
```
ล้มเหลวเยอะ = มักเป็นโควตา Gemini ฟรีเต็ม (429) → พิจารณาเปิด billing หรือสลับไป Claude (ข้อ 5)

## 5. สลับ AI ไปใช้ Claude (เมื่อพร้อม)
ไม่ต้องแก้โค้ด:
1. https://console.anthropic.com → เติมเครดิต → สร้าง API key
2. Vercel → Settings → Environment Variables: `AI_PROVIDER` = `claude`, เพิ่ม `ANTHROPIC_API_KEY` (ติ๊ก Production + Preview) และถ้าจะใช้รุ่นถูกตั้ง `ANTHROPIC_MODEL` = `claude-haiku-5-5`
3. Deployments → Redeploy — หน้า "ข้อมูลและความเป็นส่วนตัว" เปลี่ยนข้อความเรื่อง AI ให้เอง
4. สลับกลับ = ตั้ง `AI_PROVIDER` = `gemini` แล้ว Redeploy

## 6. แพ็กเกจที่วางไว้ (ยังไม่เก็บเงิน — ถามราคาในฟอร์ม)
| | ฟรี | Pro 49/79/99 บาท/เทอม |
|---|---|---|
| AI อ่านข้อความ | 5 ครั้ง/วัน | 10 ครั้ง/วัน |
| AI อ่าน PDF/รูป | 5 ครั้ง/วัน | 20 ครั้ง/วัน |
| อื่น ๆ (งาน สอบ วิชา รายสัปดาห์ .ics) | ไม่จำกัด | ไม่จำกัด |
| ลิงก์ปฏิทินอัปเดตเอง, คำนวณเกรด | — | ✓ (ยังไม่ทำ) |

ช่วงทดลอง: ทุกคน 10 ครั้ง/วันรวมกัน (`AI_DAILY_LIMIT`) · ตัวเลขอยู่ใน `lib/plans.ts`
ต้นทุนถ้าเก็บเงินจริง ~2,800 บาท/เทอม (Vercel Pro ~700 บาท/เดือน, ไม่รวมค่า AI) → คุ้มทุนที่ ~58 คน (49 บ.) / ~36 คน (79 บ.) / ~29 คน (99 บ.)
