export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Termly</h1>
        <p className="leading-relaxed text-muted">
          รวมงานและ deadline ของทุกวิชาไว้ในที่เดียว
          <br />
          วางประกาศหรือ syllabus แล้วให้ AI ช่วยดึงงานออกมาให้
        </p>
      </div>

      <div className="rounded-card border border-line p-5">
        <p className="text-sm text-muted">กำลังพัฒนา</p>
        <p className="mt-1">เร็ว ๆ นี้: ล็อกอินด้วย Google และแผนงานรายสัปดาห์</p>
      </div>

      <button
        type="button"
        disabled
        className="rounded-card bg-accent px-4 py-3 font-medium text-white opacity-60"
      >
        เข้าสู่ระบบด้วย Google
      </button>
    </main>
  );
}
