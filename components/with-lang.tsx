import { getLang } from "@/lib/preferences";
import { LangProvider } from "@/components/lang";

// อ่านภาษาจาก cookie/บัญชีแล้วส่งให้ลูกทั้งหมด — อ่าน cookie ได้ ต้องอยู่ภายใน <Suspense>
export async function WithLang({ children }: { children: React.ReactNode }) {
  return <LangProvider lang={await getLang()}>{children}</LangProvider>;
}
