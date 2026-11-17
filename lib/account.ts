// คำที่ต้องพิมพ์ยืนยันก่อนลบข้อมูล / ลบบัญชี (ใช้ทั้งฟอร์มและ server action)
export const DELETE_CONFIRM_WORD = "ลบ";
export const DELETE_CONFIRM_WORD_EN = "DELETE";

// รับคำยืนยันได้ทั้งสองภาษา (ไม่สนตัวพิมพ์ของ DELETE)
export function isDeleteWord(input: string): boolean {
  const w = input.trim();
  return w === DELETE_CONFIRM_WORD || w.toUpperCase() === DELETE_CONFIRM_WORD_EN;
}
