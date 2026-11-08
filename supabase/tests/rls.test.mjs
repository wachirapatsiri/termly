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
console.log(`\n${pass} ผ่าน, ${fail} ไม่ผ่าน`);
if (fail) process.exit(1);
})();
