// ตารางเทียบแพ็กเกจ ฟรี / Pro (ยังไม่เปิดขายจริง — ใช้ถามราคาในหน้าความเห็น) ใช้ได้ทั้ง server/client
import { PLAN_FEATURES, PRO_PRICES } from "@/lib/plans";

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <span className="text-accent">✓</span>;
  if (v === false) return <span className="text-muted">—</span>;
  return <span>{v}</span>;
}

export function PlanTable() {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface text-sm">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-line text-left">
            <th className="px-3 py-2 font-normal text-muted">ฟีเจอร์</th>
            <th className="w-[26%] px-2 py-2 text-center font-medium">ฟรี</th>
            <th className="w-[26%] px-2 py-2 text-center font-medium text-accent">
              Pro
              <span className="block text-xs font-normal text-muted">
                {PRO_PRICES.join(" / ")} บ./เทอม
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {PLAN_FEATURES.map((f) => (
            <tr key={f.label} className="border-b border-line last:border-0">
              <td className="px-3 py-2">
                {f.label}
                {f.soon && <span className="ml-1 text-xs text-muted">(เร็ว ๆ นี้)</span>}
              </td>
              <td className="px-2 py-2 text-center">
                <Cell v={f.free} />
              </td>
              <td className="px-2 py-2 text-center">
                <Cell v={f.pro} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
