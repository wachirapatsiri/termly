import { getYearMode } from "@/lib/preferences";
import { YearModeProvider } from "@/components/year-mode";

// อ่านค่าปี พ.ศ./ค.ศ. จาก cookie แล้วส่งให้ลูกทั้งหมด — อ่าน cookie ได้ ต้องอยู่ภายใน <Suspense>
export async function WithYearMode({ children }: { children: React.ReactNode }) {
  return <YearModeProvider mode={await getYearMode()}>{children}</YearModeProvider>;
}
