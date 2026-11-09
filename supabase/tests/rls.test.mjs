// ทดสอบตาราง + RLS ด้วย Postgres จำลองในเครื่อง (PGlite) ไม่ต้องต่อ Supabase จริง
// รัน: npm run test:db
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";

const MIGRATIONS = path.join(import.meta.dirname, "..", "migrations");
const A='11111111-1111-1111-1111-111111111111', B='22222222-2222-2222-2222-222222222222';
(async()=>{
const db=new PGlite();
// จำลองของที่ Supabase มีให้
await db.exec(`
create role anon nologin; create role authenticated nologin;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
grant usage on schema auth, public to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
insert into auth.users values ('${A}'),('${B}');
`);
for (const f of fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
  await db.exec(fs.readFileSync(path.join(MIGRATIONS, f), 'utf8'));
}
let pass=0, fail=0;
async function as(uid, sql){ await db.exec(`reset role; set request.jwt.claim.sub='${uid??''}'; set role ${uid?'authenticated':'anon'};`); try { return (await db.query(sql)).rows; } finally { await db.exec('reset role'); } }
async function ok(name, fn){ try{ await fn(); console.log('✓',name); pass++;}catch(e){console.log('✗',name,e.message); fail++;} }
async function rejects(name, fn){ try{ await fn(); console.log('✗',name,'(ไม่ error)'); fail++;}catch(e){console.log('✓',name,'→',e.message.slice(0,80)); pass++;} }
const eq=(a,b,m)=>{ if(JSON.stringify(a)!==JSON.stringify(b)) throw new Error(`${m}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`); };

let cA, cB, tA;
await ok('A เพิ่มวิชา (user_id เติมเอง)', async()=>{ const r=await as(A,`insert into courses(name,code) values('สถิติ','DS101') returning id,user_id`); cA=r[0].id; eq(r[0].user_id,A,'user_id'); });
await ok('B เพิ่มวิชา', async()=>{ cB=(await as(B,`insert into courses(name) values('B วิชา') returning id`))[0].id; });
await ok('A เพิ่มงานผูกวิชาตัวเอง', async()=>{ tA=(await as(A,`insert into tasks(title,course_id,due_at,due_has_time) values('รายงาน','${cA}','2026-11-11T16:59:00Z',false) returning id`))[0].id; });
await ok('A เพิ่มงานไม่มีวันส่ง', async()=>{ await as(A,`insert into tasks(title) values('งานยังไม่รู้วัน')`); });
await rejects('ไม่มีวันส่งแต่ due_has_time=true', ()=>as(A,`insert into tasks(title,due_has_time) values('x',true)`));
await rejects('A ผูกงานกับวิชาของ B', ()=>as(A,`insert into tasks(title,course_id) values('แอบ','${cB}')`));
await rejects('A ปลอม user_id เป็น B', ()=>as(A,`insert into tasks(title,user_id) values('ปลอม','${B}')`));
await rejects('ชื่องานว่าง', ()=>as(A,`insert into tasks(title) values('   ')`));
await rejects('source แปลก', ()=>as(A,`insert into tasks(title,source) values('x','hack')`));
await ok('B มองไม่เห็นงาน/วิชาของ A', async()=>{ eq((await as(B,`select id from tasks`)).length,0,'tasks'); eq((await as(B,`select id from courses`)).length,1,'courses'); });
await ok('B แก้/ลบงานของ A ไม่ได้ (0 แถว)', async()=>{ eq((await as(B,`update tasks set title='hack' where id='${tA}' returning id`)).length,0,'upd'); eq((await as(B,`delete from tasks where id='${tA}' returning id`)).length,0,'del'); });
await rejects('A ย้ายงานไปเป็นของ B', ()=>as(A,`update tasks set user_id='${B}' where id='${tA}'`));
await ok('A ติ๊กเสร็จได้', async()=>{ eq((await as(A,`update tasks set done=true where id='${tA}' returning done`))[0].done,true,'done'); });
await ok('A แก้ชื่อ/รหัสวิชาได้', async()=>{ const r=await as(A,`update courses set name='สถิติ 1', code=null where id='${cA}' returning name,code`); eq(r[0],{name:'สถิติ 1',code:null},'upd'); });
await rejects('ชื่อวิชาว่าง', ()=>as(A,`update courses set name='  ' where id='${cA}'`));
await ok('B แก้/ลบวิชาของ A ไม่ได้ (0 แถว)', async()=>{ eq((await as(B,`update courses set name='hack' where id='${cA}' returning id`)).length,0,'upd'); eq((await as(B,`delete from courses where id='${cA}' returning id`)).length,0,'del'); });
await ok('ลบวิชา → งานยังอยู่ course_id = null', async()=>{ await as(A,`delete from courses where id='${cA}'`); const r=await as(A,`select course_id,user_id from tasks where id='${tA}'`); eq(r[0].course_id,null,'course'); eq(r[0].user_id,A,'user'); });
await ok('A ลบงานได้', async()=>{ eq((await as(A,`delete from tasks where id='${tA}' returning id`)).length,1,'del'); });
await rejects('anon อ่าน tasks ไม่ได้', ()=>as(null,`select * from tasks`));
await ok('ai_usage: เพิ่ม/ดูได้', async()=>{ await as(A,`insert into ai_usage(input_type,success) values('text',true)`); eq((await as(A,`select id from ai_usage`)).length,1,'n'); eq((await as(B,`select id from ai_usage`)).length,0,'B'); });
await rejects('ai_usage: ลบไม่ได้', ()=>as(A,`delete from ai_usage`));
await rejects('ai_usage: แก้ไม่ได้', ()=>as(A,`update ai_usage set success=false`));
await ok('events: เพิ่มสอบ', async()=>{ await as(A,`insert into events(title,kind,starts_at) values('Midterm','exam','2026-12-01T02:00:00Z')`); });
await rejects('events: kind แปลก', ()=>as(A,`insert into events(title,kind,starts_at) values('x','party',now())`));
await rejects('events: ends ก่อน starts', ()=>as(A,`insert into events(title,starts_at,ends_at) values('x','2026-12-01','2026-11-01')`));
// ── 0002: ประเภทงาน + สอบ ──
let catA, catB;
await ok('ผู้ใช้เดิมได้ประเภทตั้งต้น 7 แบบ', async()=>{ const r=await as(A,`select id,name from task_categories order by position`); eq(r.length,7,'n'); eq(r[0].name,'การบ้าน','first'); eq(r[6].name,'อื่น ๆ','last'); catA=r[0].id; });
await ok('ผู้ใช้ใหม่ได้ประเภทตั้งต้นอัตโนมัติ', async()=>{ const C='33333333-3333-3333-3333-333333333333'; await db.exec(`insert into auth.users values ('${C}')`); eq((await as(C,`select id from task_categories`)).length,7,'n'); });
await ok('B เห็นเฉพาะประเภทของตัวเอง', async()=>{ const r=await as(B,`select id from task_categories`); eq(r.length,7,'n'); catB=r[0].id; });
await ok('A เพิ่มประเภทเอง', async()=>{ await as(A,`insert into task_categories(name) values('Workshop')`); });
await rejects('ชื่อประเภทซ้ำ (ไม่สนตัวพิมพ์)', ()=>as(A,`insert into task_categories(name) values(' quiz ')`));
await rejects('ชื่อประเภทยาวเกิน 30', ()=>as(A,`insert into task_categories(name) values('${'ก'.repeat(31)}')`));
await rejects('ผู้ใช้เรียกฟังก์ชันเติมประเภทเองไม่ได้', ()=>as(A,`select public.seed_task_categories('${B}')`));
let tCat;
await ok('A ใส่ประเภทให้งาน', async()=>{ tCat=(await as(A,`insert into tasks(title,category_id) values('HW1','${catA}') returning id`))[0].id; });
await rejects('A ใช้ประเภทของ B', ()=>as(A,`insert into tasks(title,category_id) values('แอบ','${catB}')`));
await ok('ลบประเภท → งานยังอยู่ category_id = null', async()=>{ await as(A,`delete from task_categories where id='${catA}'`); eq((await as(A,`select category_id from tasks where id='${tCat}'`))[0].category_id,null,'cat'); });
await ok('events: สอบที่ยังไม่รู้วัน', async()=>{ await as(A,`insert into events(title,kind,exam_type) values('สอบปลายภาค','exam','final')`); });
await ok('events: สอบมีเวลาเริ่ม–จบ', async()=>{ await as(A,`insert into events(title,kind,exam_type,starts_at,ends_at,has_time,location) values('สอบกลางภาค','exam','midterm','2026-12-16T01:00:00Z','2026-12-16T04:00:00Z',true,'ห้อง 101')`); });
await rejects('events: ไม่มีวันแต่มีเวลา', ()=>as(A,`insert into events(title,kind,has_time) values('x','exam',true)`));
await rejects('events: ไม่มีวันแต่มีเวลาจบ', ()=>as(A,`insert into events(title,kind,ends_at) values('x','exam',now())`));
await rejects('events: exam_type แปลก', ()=>as(A,`insert into events(title,kind,exam_type,starts_at) values('x','exam','quiz',now())`));
await rejects('events: exam_type กับ kind ที่ไม่ใช่สอบ', ()=>as(A,`insert into events(title,kind,exam_type,starts_at) values('x','activity','final',now())`));
await ok('ลบผู้ใช้ → ข้อมูลหายตาม', async()=>{ await db.exec(`delete from auth.users where id='${A}'`); eq((await db.query(`select count(*)::int n from tasks`)).rows[0].n,0,'tasks'); });
// ── 0003: ติ๊กไม่มีสอบ ──
let cA3;
// (A ถูกลบไปในข้อก่อนหน้า → ใช้ B เป็นเจ้าของ, C เป็นคนอื่น)
const C3='33333333-3333-3333-3333-333333333333';
await ok('วิชาใหม่: no_midterm/no_final ค่าตั้งต้น false', async()=>{ const r=await as(B,`insert into courses(name) values('วิชา 0003') returning id,no_midterm,no_final`); cA3=r[0].id; eq([r[0].no_midterm,r[0].no_final],[false,false],'default'); });
await ok('เจ้าของติ๊กไม่มีสอบกลางภาคได้', async()=>{ eq((await as(B,`update courses set no_midterm=true where id='${cA3}' returning no_midterm`))[0].no_midterm,true,'upd'); });
await ok('คนอื่นติ๊กแทนไม่ได้ (0 แถว)', async()=>{ eq((await as(C3,`update courses set no_final=true where id='${cA3}' returning id`)).length,0,'upd'); });
// ── 0004: การตั้งค่าผู้ใช้ ──
await ok('user_settings: ค่าตั้งต้น code / be (user_id เติมเอง)', async()=>{ const r=await as(B,`insert into user_settings default values returning user_id,course_label,year_mode`); eq(r[0],{user_id:B,course_label:'code',year_mode:'be'},'row'); });
await ok('user_settings: upsert เปลี่ยนเฉพาะช่องที่ส่ง', async()=>{ const r=await as(B,`insert into user_settings(year_mode) values('ce') on conflict (user_id) do update set year_mode=excluded.year_mode returning course_label,year_mode`); eq(r[0],{course_label:'code',year_mode:'ce'},'row'); });
await rejects('user_settings: ค่าแปลก', ()=>as(B,`update user_settings set course_label='emoji'`));
await rejects('user_settings: ปลอม user_id เป็นคนอื่น', ()=>as(C3,`insert into user_settings(user_id) values('${B}')`));
await ok('user_settings: คนอื่นมองไม่เห็น/แก้ไม่ได้', async()=>{ eq((await as(C3,`select * from user_settings`)).length,0,'sel'); eq((await as(C3,`update user_settings set year_mode='be' returning user_id`)).length,0,'upd'); });
await rejects('user_settings: ลบไม่ได้', ()=>as(B,`delete from user_settings`));
await rejects('user_settings: anon อ่านไม่ได้', ()=>as(null,`select * from user_settings`));
// ── 0005: ธีม + สีวิชา ──
await ok('user_settings: theme ค่าตั้งต้น system', async()=>{ eq((await as(B,`select theme from user_settings`))[0].theme,'system','theme'); });
await ok('user_settings: เปลี่ยนเป็น dark ได้', async()=>{ eq((await as(B,`update user_settings set theme='dark' returning theme`))[0].theme,'dark','upd'); });
await rejects('user_settings: theme แปลก', ()=>as(B,`update user_settings set theme='pink'`));
await ok('courses: color ค่าตั้งต้น null + ตั้ง 0–7 ได้', async()=>{ const r=await as(B,`insert into courses(name) values('สีวิชา') returning id,color`); eq(r[0].color,null,'default'); eq((await as(B,`update courses set color=7 where id='${r[0].id}' returning color`))[0].color,7,'upd'); });
await rejects('courses: color เกิน 7', ()=>as(B,`update courses set color=8 where name='สีวิชา'`));
await ok('courses: คนอื่นเปลี่ยนสีวิชาไม่ได้ (0 แถว)', async()=>{ eq((await as(C3,`update courses set color=1 where name='สีวิชา' returning id`)).length,0,'upd'); });
// ── 0006: ความเห็น + ลบข้อมูล/บัญชี ──
const D='44444444-4444-4444-4444-444444444444';
await db.exec(`insert into auth.users values ('${D}')`);
await ok('feedback: ส่งได้ (user_id เติมเอง)', async()=>{ const r=await as(D,`insert into feedback(rating,price,message) values(4,'79','ดีมาก') returning user_id`); eq(r[0].user_id,D,'uid'); });
await ok('feedback: ส่งซ้ำได้ + เห็นของตัวเอง', async()=>{ await as(D,`insert into feedback(ai_accuracy,ai_note) values('some_fixes','วันที่ผิด 1 อัน')`); eq((await as(D,`select id from feedback`)).length,2,'n'); });
await ok('feedback: คนอื่นมองไม่เห็น', async()=>{ eq((await as(B,`select id from feedback`)).length,0,'B'); });
await rejects('feedback: ว่างทุกข้อ', ()=>as(D,`insert into feedback(message) values('   ')`));
await rejects('feedback: คะแนนเกิน 5', ()=>as(D,`insert into feedback(rating) values(6)`));
await ok('feedback: เลือกฟีเจอร์ Pro หลายข้อได้', async()=>{ const r=await as(D,`insert into feedback(pro_features) values(array['reminders','grade_calc']) returning pro_features`); eq(r[0].pro_features,['reminders','grade_calc'],'arr'); });
await rejects('feedback: ฟีเจอร์ Pro แปลก', ()=>as(D,`insert into feedback(pro_features) values(array['hack'])`));
await rejects('feedback: เลือกฟีเจอร์ว่าง = ไม่ได้ตอบ', ()=>as(D,`insert into feedback(pro_features) values(array[]::text[])`));
await rejects('feedback: ราคาแปลก', ()=>as(D,`insert into feedback(price) values('1000')`));
await rejects('feedback: ปลอม user_id', ()=>as(D,`insert into feedback(user_id,rating) values('${B}',1)`));
await rejects('feedback: แก้ไม่ได้', ()=>as(D,`update feedback set rating=1`));
await rejects('feedback: ลบไม่ได้', ()=>as(D,`delete from feedback`));
await rejects('feedback: anon ส่งไม่ได้', ()=>as(null,`insert into feedback(rating) values(5)`));
await rejects('delete_my_data: anon เรียกไม่ได้', ()=>as(null,`select public.delete_my_data()`));
await ok('delete_my_data: ลบของตัวเองหมด ของคนอื่นยังอยู่', async()=>{
  await as(D,`insert into courses(name) values('จะลบ')`); await as(D,`insert into tasks(title) values('จะลบ')`);
  await as(D,`insert into events(title,kind) values('จะลบ','exam')`); await as(D,`insert into ai_usage(input_type,success) values('pdf',true)`);
  await as(D,`insert into task_categories(name) values('ประเภทเอง')`);
  await as(D,`insert into user_settings(theme) values('dark') on conflict (user_id) do update set theme='dark'`);
  const bBefore=(await as(B,`select id from tasks`)).length + (await as(B,`select id from courses`)).length;
  await as(D,`select public.delete_my_data()`);
  for (const t of ['tasks','events','courses','user_settings']) eq((await as(D,`select 1 from ${t}`)).length,0,t);
  const cats=(await as(D,`select name from task_categories order by position`)).map(r=>r.name);
  eq(cats.length,7,'ประเภทตั้งต้นกลับมา'); eq(cats.includes('ประเภทเอง'),false,'ประเภทเองหาย');
  eq((await as(D,`select id from ai_usage`)).length>0,true,'ai_usage ยังอยู่');
  eq((await as(D,`select id from feedback`)).length,3,'feedback ยังอยู่');
  eq((await as(B,`select id from tasks`)).length + (await as(B,`select id from courses`)).length,bBefore,'ของ B ไม่หาย');
});
await ok('delete_my_account: ลบบัญชี → feedback เหลือแบบไม่ระบุตัวตน', async()=>{
  await as(D,`select public.delete_my_account()`);
  const r=await db.query(`select count(*)::int n from auth.users where id='${D}'`); eq(r.rows[0].n,0,'user');
  const f=await db.query(`select user_id from feedback`); eq(f.rows.length,3,'feedback'); eq(f.rows.every(x=>x.user_id===null),true,'null');
  const c=await db.query(`select count(*)::int n from task_categories where user_id='${D}'`); eq(c.rows[0].n,0,'cascade');
  eq((await db.query(`select count(*)::int n from auth.users where id='${B}'`)).rows[0].n,1,'B ยังอยู่');
});
console.log(`\n${pass} ผ่าน, ${fail} ไม่ผ่าน`);
if (fail) process.exit(1);
})();
