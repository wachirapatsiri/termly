// Service worker ของ Termly — ทำแค่ "หน้าออฟไลน์"
// ไม่เก็บข้อมูลงาน/หน้าเว็บไว้ในเครื่อง (กันข้อมูลเก่าหรือข้อมูลของบัญชีอื่นค้าง)
// เปิดหน้าใด ๆ ตอนไม่มีเน็ต → แสดง /offline.html แทนหน้า error ของเบราว์เซอร์
// แก้ไฟล์นี้หรือ offline.html → เปลี่ยนเลข CACHE ให้เบราว์เซอร์โหลดใหม่
const CACHE = "termly-offline-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // เฉพาะการเปิดหน้า (navigation) — อย่างอื่นปล่อยให้เบราว์เซอร์ทำตามปกติ
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => (await caches.match(OFFLINE_URL)) ?? Response.error()),
    );
    return;
  }
  // ไอคอนในหน้าออฟไลน์
  if (req.method === "GET" && new URL(req.url).pathname === "/icons/icon.svg") {
    event.respondWith(fetch(req).catch(async () => (await caches.match(req)) ?? Response.error()));
  }
});
