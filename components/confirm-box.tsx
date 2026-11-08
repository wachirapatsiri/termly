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
    <div role="alert" className="space-y-2 rounded-card border border-amber-300 bg-amber-50 p-3 text-sm">
      <p className="text-amber-900">{message}</p>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.intent}
            type="submit"
            name="intent"
            value={a.intent}
            className={`rounded-card px-3 py-2 ${
              a.primary ? "bg-accent text-white" : "border border-line bg-white"
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
