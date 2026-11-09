// ตัดข้อมูลส่วนตัวออกจากข้อความก่อนส่ง AI (เซสชัน 9, ผู้ใช้เลือก 9 พ.ย.): อีเมล + เบอร์โทรไทย
// ทำได้เฉพาะข้อความที่วาง (PDF/รูปตัดไม่ได้) — ไม่ตัดรหัสนักศึกษา เพราะเลขยาวพอ ๆ กับรหัสวิชา เสี่ยงตัดผิด
// เบอร์โทร: ขึ้นต้น 0 หรือ +66 รวม 9–10 หลัก — รหัสวิชา (เช่น 204383, 2110101, 01418112) สั้นกว่า
// และวันที่/เวลา (13/11/2569, 09:00) ใช้ / หรือ : จึงไม่โดนตัด

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;
// ตัวเลขที่อาจคั่นด้วยขีด/ช่องว่าง/จุด ไม่ติดตัวเลขอื่นด้านหน้า/หลัง
const PHONE = /(?<![\d/:])(?:\+66[-\s.]?|0[-\s.]?)\d(?:[-\s.]?\d){7,8}(?![\d/:])/g;

export type RedactResult = { text: string; emails: number; phones: number };

// จำนวนหลักแบบในประเทศ (+66 8x… = 08x…)
function digitCount(s: string, intl: boolean): number {
  const d = s.replace(/\D/g, "").length;
  return intl ? d - 1 : d;
}

export function redactPersonal(input: string): RedactResult {
  let emails = 0;
  let phones = 0;
  const text = input
    .replace(EMAIL, () => {
      emails++;
      return "[อีเมล]";
    })
    .replace(PHONE, (m) => {
      const n = digitCount(m, m.startsWith("+66"));
      // มือถือ 10 หลัก (06/08/09), บ้าน/สำนักงาน 9 หลัก (02, 053 …)
      const ok = n === 10 ? /^(?:\+66[-\s.]?|0)[689]/.test(m) : n === 9;
      // กันวันที่แบบ 09-11-2026 ที่บังเอิญมีเลขต่อท้าย
      if (!ok || /\d{1,2}[-.]\d{1,2}[-.]\d{4}/.test(m)) return m;
      phones++;
      return "[เบอร์โทร]";
    });
  return { text, emails, phones };
}
