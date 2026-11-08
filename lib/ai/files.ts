// ตรวจไฟล์ที่ผู้ใช้แนบ (PDF / รูป) ก่อนส่งให้ AI — ใช้ฝั่งเซิร์ฟเวอร์ใน app/api/extract/route.ts
// ตรวจชนิดจาก "เนื้อไฟล์" (magic bytes) ไม่เชื่อนามสกุลหรือ type ที่เบราว์เซอร์บอก
// ไม่เก็บไฟล์ลงที่ไหน: แปลงเป็น base64 ส่ง AI แล้วทิ้ง
import { MAX_IMAGES, MAX_UPLOAD_BYTES } from "./limits.ts";

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
export type FileMediaType = "application/pdf" | ImageMediaType;

export type Attachment = { media_type: FileMediaType; data: string }; // data = base64

const startsWith = (b: Uint8Array, sig: number[], offset = 0) =>
  b.length >= offset + sig.length && sig.every((v, i) => b[offset + i] === v);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

export function detectMediaType(b: Uint8Array): FileMediaType | null {
  // PDF อาจมีขยะนำหน้าเล็กน้อย → หา "%PDF-" ใน 1 KB แรก
  const head = Buffer.from(b.subarray(0, 1024)).toString("latin1");
  if (head.includes("%PDF-")) return "application/pdf";
  if (startsWith(b, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(b, ascii("RIFF")) && startsWith(b, ascii("WEBP"), 8)) return "image/webp";
  if (startsWith(b, ascii("GIF87a")) || startsWith(b, ascii("GIF89a"))) return "image/gif";
  return null;
}

export type UploadInput = { name: string; bytes: Uint8Array };
export type UploadCheck =
  | { ok: true; kind: "none" | "pdf" | "image"; attachments: Attachment[] }
  | { ok: false; error: string };

const mb = (n: number) => `${(n / 1024 / 1024).toLocaleString("th-TH", { maximumFractionDigits: 1 })} MB`;

export function checkUploads(files: UploadInput[]): UploadCheck {
  if (files.length === 0) return { ok: true, kind: "none", attachments: [] };

  const total = files.reduce((s, f) => s + f.bytes.length, 0);
  if (total > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `ไฟล์ใหญ่เกินไป (${mb(total)}) รวมกันได้ไม่เกิน ${mb(MAX_UPLOAD_BYTES)} — ลองแคปเฉพาะหน้าที่มีกำหนดส่ง หรือบีบอัด PDF ก่อน`,
    };
  }

  const typed = files.map((f) => ({ ...f, type: detectMediaType(f.bytes) }));
  const bad = typed.find((f) => !f.type || f.bytes.length === 0);
  if (bad) {
    return { ok: false, error: `ไฟล์ "${bad.name}" ไม่รองรับ ใช้ได้เฉพาะ PDF หรือรูป (JPG, PNG, WEBP)` };
  }

  const pdfs = typed.filter((f) => f.type === "application/pdf");
  if (pdfs.length > 0 && typed.length > 1) {
    return { ok: false, error: "ส่ง PDF ได้ครั้งละ 1 ไฟล์ และไม่ปนกับรูป" };
  }
  if (pdfs.length === 0 && typed.length > MAX_IMAGES) {
    return { ok: false, error: `ส่งรูปได้ครั้งละไม่เกิน ${MAX_IMAGES} รูป` };
  }

  return {
    ok: true,
    kind: pdfs.length ? "pdf" : "image",
    attachments: typed.map((f) => ({
      media_type: f.type!,
      data: Buffer.from(f.bytes).toString("base64"),
    })),
  };
}
