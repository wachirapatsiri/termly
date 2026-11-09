import { getUserSettings } from "@/lib/preferences";
import { ThemeSync } from "@/components/theme-sync";

// ใช้ใน root layout ภายใน <Suspense> (อ่าน cookie / ฐานข้อมูล)
export async function ThemeFromAccount() {
  const { theme } = await getUserSettings();
  return <ThemeSync theme={theme} />;
}
