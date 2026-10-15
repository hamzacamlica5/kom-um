// Acil durum ekranı, bina acil rehberi, çevrimdışı önbellek ve Güven Merkezi.
import { chromium } from "/home/claude/.npm-global/lib/node_modules/playwright/index.mjs";
import { mkdirSync } from "fs";

const BASE = process.env.BASE || "http://localhost:5173";
const OUT = "/tmp/shots3/"; mkdirSync(OUT, { recursive: true });
const stamp = Date.now().toString(36);
const browser = await chromium.launch();
const errors = [];
const mk = async (name, dark = false) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "tr-TR", timezoneId: "Europe/Istanbul", colorScheme: dark ? "dark" : "light" });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(name + ": " + e.message));
  return p;
};
const shot = (p, n) => p.screenshot({ path: OUT + n + ".png", fullPage: true });
const step = (s) => console.log("•", s);
async function login(p, email, name, phone) {
  await p.goto(BASE); await p.fill("#email", email); await p.click("text=Giriş kodu gönder");
  await p.fill("#otp", "123456"); await p.click("button:has-text('Giriş yap')");
  await p.waitForSelector("#fullname"); await p.fill("#fullname", name); if (phone) await p.fill("#phone", phone); await p.click("text=Devam et");
}

step("Güven Merkezi girişsiz");
const g = await mk("misafir");
await g.goto(BASE); await g.click("text=Güven Merkezi"); await g.waitForSelector("h1:has-text('Güven Merkezi')"); await shot(g, "01-guven");

step("yönetici acil rehberi dolduruyor");
const m = await mk("yönetici");
await login(m, `y3+${stamp}@test.com`, "Hamza Yönetici", "0555 111 22 33");
await m.click("text=Apartmanımı kuracağım"); await m.fill("#bname", "Lale Apartmanı"); await m.fill("#bunits", "4"); await m.fill("#bdues", "800");
await m.click("text=Apartmanı oluştur"); await m.waitForSelector("text=Daire 4");
await m.click(".sos"); await m.waitForSelector("text=Acil Çağrı Merkezi");
const href112 = await m.getAttribute(".call-big", "href");
if (href112 !== "tel:112") errors.push("112 bağlantısı yanlış: " + href112);
await shot(m, "02-acil-bos");
await m.click("text=Doldur");
await m.fill("#em-water_valve", "Bodrum kat, kazan dairesi kapısının solunda kırmızı vana");
await m.fill("#em-electric_panel", "Giriş kat, merdiven altı");
await m.fill("#em-elevator_company", "ABC Asansör"); await m.fill("#em-elevator_phone", "0212 555 00 00");
await m.fill("#em-caretaker_name", "Mehmet Bey"); await m.fill("#em-caretaker_phone", "0532 000 11 22");
await m.fill("#em-gathering_area", "Moda Parkı, deniz tarafındaki giriş");
await m.fill("#em-notes", "Yangın tüpleri her katta merdiven başında.");
await m.click(".sheet >> text=Kaydet"); await m.waitForSelector("text=Acil durum bilgileri kaydedildi");
await m.waitForSelector(".places >> text=Moda Parkı");
await shot(m, "03-acil-dolu");

step("sakin katılıp görüyor");
await m.click(".tabbar >> text=Menü"); await m.click("text=Daireler ve sakinler"); await m.click(".list >> text=Daire 1");
await m.click(".sheet >> button:has-text('Davet bağlantısı oluştur')"); await m.waitForSelector(".invite-link code");
const link = await m.textContent(".invite-link code");
const r = await mk("sakin", true);
await r.goto(link.replace(/^https?:\/\/[^/]+/, BASE));
await r.fill("#email", `s3+${stamp}@test.com`); await r.click("text=Giriş kodu gönder"); await r.fill("#otp", "123456"); await r.click("button:has-text('Giriş yap')");
await r.waitForSelector("#fullname"); await r.fill("#fullname", "Ayşe Sakin"); await r.click("text=Devam et");
await r.click("text=Apartmana katıl"); await r.waitForSelector("text=Merhaba Ayşe");
await r.click(".sos"); await r.waitForSelector(".places >> text=Bodrum kat");
const calls = await r.$$eval(".call", (els) => els.map((e) => e.getAttribute("href")));
step("sakinin gördüğü aramalar: " + calls.join(" "));
for (const want of ["tel:112", "tel:186", "tel:187", "tel:185", "tel:05551112233", "tel:05320001122", "tel:02125550000"]) if (!calls.includes(want)) errors.push("eksik arama: " + want);
if (await r.$("text=Düzenle")) errors.push("sakin düzenle düğmesini görmemeli");
await shot(r, "04-acil-sakin-karanlik");

step("çevrimdışı: son bilgiler gösteriliyor");
await r.click(".tabbar >> text=Özet"); await r.waitForSelector(".balance");
await r.context().setOffline(true);
await r.click(".sos"); await r.waitForSelector("text=İnternet bağlantısı yok; en son kaydedilen bilgiler gösteriliyor.");
await r.waitForSelector(".places >> text=Moda Parkı");
await r.context().setOffline(false);
await shot(r, "05-acil-cevrimdisi");

await browser.close();
console.log(errors.length ? "HATALAR:\n" + errors.join("\n") : "Senaryo hatasız tamamlandı.");
