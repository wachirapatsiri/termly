// ย่อรูปในเบราว์เซอร์ก่อนส่งให้ AI (ใช้ใน components/import-form.tsx เท่านั้น — ต้องมี DOM)
// ด้านยาวเกิน IMAGE_MAX_EDGE หรือไฟล์ใหญ่ → วาดลง canvas แล้วบันทึกเป็น JPEG
// รูป HEIC จาก iPhone: Safari เปิดได้ → ถูกแปลงเป็น JPEG ไปด้วย (เบราว์เซอร์ที่เปิดไม่ได้จะขึ้นข้อความเตือน)
import { IMAGE_MAX_EDGE } from "@/lib/ai/limits";

const KEEP_TYPES = ["image/jpeg", "image/png", "image/webp"];
const KEEP_MAX_BYTES = 1024 * 1024; // รูปเล็กอยู่แล้ว (เช่น แคปหน้าจอ PNG) ส่งไฟล์เดิม ตัวหนังสือคมกว่า

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode"));
    };
    img.src = url;
  });
}

export async function prepareImage(file: File): Promise<File> {
  const img = await loadImage(file);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) throw new Error("decode");
  const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(w, h));
  if (scale === 1 && KEEP_TYPES.includes(file.type) && file.size <= KEEP_MAX_BYTES) return file;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#ffffff"; // PNG โปร่งใส → พื้นขาว (JPEG ไม่มีความโปร่งใส)
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  if (!blob) throw new Error("encode");
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
