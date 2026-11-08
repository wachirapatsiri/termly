// ประเภทงาน (ตาราง task_categories) — ใช้ทั้งฟอร์มงาน หน้าตั้งค่า และหน้านำเข้า
import type { SupabaseClient } from "@supabase/supabase-js";

// ค่าในช่องเลือกประเภท ที่หมายถึง "+ พิมพ์ประเภทใหม่…"
export const NEW_CATEGORY = "__new";
export const MAX_CATEGORY_LENGTH = 30;

// เทียบชื่อประเภทแบบเดียวกับ unique index ในฐานข้อมูล (lower + btrim)
export const categoryKey = (s: string) => s.trim().toLowerCase();

// แปลงค่าที่ผู้ใช้เลือก → category_id
// { name } = ใช้ประเภทชื่อนี้ถ้ามีอยู่แล้ว (ไม่สนตัวพิมพ์) ไม่งั้นสร้างใหม่
export async function resolveCategory(
  supabase: SupabaseClient,
  choice: { id: string } | { name: string } | null,
): Promise<{ ok: true; id: string | null } | { ok: false; error: string }> {
  if (!choice) return { ok: true, id: null };
  if ("id" in choice) return { ok: true, id: choice.id };

  const name = choice.name.replace(/\s+/g, " ").trim().slice(0, MAX_CATEGORY_LENGTH);
  if (!name) return { ok: true, id: null };

  const { data: existing, error: loadError } = await supabase
    .from("task_categories")
    .select("id, name");
  if (loadError) {
    console.error("resolveCategory: load", loadError);
    return { ok: false, error: "บันทึกประเภทงานไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
  const found = existing?.find((c) => categoryKey(c.name) === categoryKey(name));
  if (found) return { ok: true, id: found.id };

  // user_id ฐานข้อมูลเติมให้ (auth.uid())
  const { data, error } = await supabase
    .from("task_categories")
    .insert({ name })
    .select("id")
    .single();
  if (error || !data) {
    console.error("resolveCategory: insert", error);
    return { ok: false, error: "สร้างประเภทงานไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
  return { ok: true, id: data.id };
}
