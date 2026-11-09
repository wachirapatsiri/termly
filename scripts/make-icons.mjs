// สร้างไอคอนแอป (PWA / หน้าจอโฮม) จาก SVG ด้วย Chromium ของ Playwright
// รัน: node scripts/make-icons.mjs → public/icons/*.png + app/apple-icon.png
// ไอคอน: พื้นสีเน้น #3B5BDB + ปฏิทินสีขาวมีเครื่องหมายถูก (วาดด้วย path ไม่ต้องพึ่งฟอนต์)
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

// playwright ติดตั้งไว้ในเครื่อง (ไม่ได้อยู่ใน package.json) → ใช้ require
const { chromium } = createRequire(import.meta.url)("playwright");

// inset = ระยะขอบ (maskable ต้องเว้นขอบมาก เพราะ Android ตัดเป็นวงกลม/รูปทรงอื่น)
function svg({ rounded, inset }) {
  const s = 512;
  const w = s - inset * 2;
  const x = inset;
  const k = w / 512; // ย่อ/ขยายรูปปฏิทินตามพื้นที่ที่เหลือ
  const t = (v) => x + v * k;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" rx="${rounded ? 112 : 0}" fill="#3B5BDB"/>
  <rect x="${t(96)}" y="${t(120)}" width="${320 * k}" height="${296 * k}" rx="${40 * k}" fill="#FFFFFF"/>
  <rect x="${t(96)}" y="${t(120)}" width="${320 * k}" height="${76 * k}" rx="${40 * k}" fill="#DBE4FF"/>
  <rect x="${t(96)}" y="${t(160)}" width="${320 * k}" height="${36 * k}" fill="#DBE4FF"/>
  <rect x="${t(164)}" y="${t(88)}" width="${32 * k}" height="${72 * k}" rx="${16 * k}" fill="#FFFFFF"/>
  <rect x="${t(316)}" y="${t(88)}" width="${32 * k}" height="${72 * k}" rx="${16 * k}" fill="#FFFFFF"/>
  <path d="M ${t(186)} ${t(304)} L ${t(236)} ${t(352)} L ${t(330)} ${t(250)}" fill="none"
    stroke="#3B5BDB" stroke-width="${36 * k}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

const outputs = [
  { file: "public/icons/icon-192.png", size: 192, rounded: true, inset: 0 },
  { file: "public/icons/icon-512.png", size: 512, rounded: true, inset: 0 },
  { file: "public/icons/maskable-512.png", size: 512, rounded: false, inset: 64 },
  // iOS ตัดมุมเอง → ใช้สี่เหลี่ยมเต็ม
  { file: "app/apple-icon.png", size: 180, rounded: false, inset: 0 },
];

await mkdir("public/icons", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
for (const o of outputs) {
  await page.setViewportSize({ width: o.size, height: o.size });
  const markup = svg(o).replace(/width="512" height="512"/, `width="${o.size}" height="${o.size}"`);
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${markup}</body></html>`,
  );
  const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: o.size, height: o.size } });
  await writeFile(o.file, png);
  console.log("wrote", o.file);
}
// SVG ไว้ใช้เป็น favicon/ไอคอนในหน้าออฟไลน์
await writeFile("public/icons/icon.svg", svg({ rounded: true, inset: 0 }));
console.log("wrote public/icons/icon.svg");
await browser.close();
