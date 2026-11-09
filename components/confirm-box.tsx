// กล่องถามยืนยันในฟอร์ม (เช่น "มีงานนี้อยู่แล้ว เพิ่มซ้ำไหม?")
// ปุ่มที่มี intent เป็นปุ่ม submit ของฟอร์ม → ส่ง intent ไปให้ Server Action
export function ConfirmBox({
  message,
  actions,
  onCancel,
  cancelLabel = "ไม่เพิ่ม",
}: {
  message: React.ReactNode;
  actions: { intent: string; label: string; primary?: boolean }[];
  onCancel: () => void;
  cancelLabel?: string;
}) {
  return (
    <div role="alert" className="space-y-2 rounded-card border border-warn-line bg-warn-soft p-3 text-sm">
      <p className="text-warn">{message}</p>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.intent}
            type="submit"
            name="intent"
            value={a.intent}
            className={`rounded-card px-3 py-2 ${
              a.primary ? "bg-accent text-white" : "border border-line bg-surface"
            }`}
          >
            {a.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onCancel}
          className="rounded-card px-3 py-2 text-muted"
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}

// ปุ่ม submit ล่องหน วางเป็นลูกตัวแรกของฟอร์มที่มี ConfirmBox
// เหตุผล: กด Enter ในช่องกรอก เบราว์เซอร์จะใช้ "ปุ่ม submit ตัวแรก" ของฟอร์ม
// ถ้าตัวแรกเป็นปุ่มใน ConfirmBox (เช่น "แก้วิชาเดิม") จะทำงานนั้นทั้งที่ผู้ใช้ไม่ได้กด
// ปุ่มนี้ไม่มี intent → Enter = บันทึกปกติ (ถ้ายังซ้ำ กล่องถามจะขึ้นอีกครั้ง)
export function DefaultSubmit() {
  return <button type="submit" tabIndex={-1} aria-hidden="true" className="sr-only" />;
}
