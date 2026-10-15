// Yeni özellikler: toplu davet, aidat dağılımı, Excel'e aktarma, yasal sayfalar, hesap silme.
import { chromium } from "/home/claude/.npm-global/lib/node_modules/playwright/index.mjs";
import { mkdirSync, readFileSync } from "fs";

const BASE = process.env.BASE || "http://localhost:5173";
const OUT = "/tmp/shots2/"; mkdirSync(OUT, { recursive: true });
const stamp = Date.now().toString(36);
const browser = await chromium.launch();
const errors = [];
const mk = async (name) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "tr-TR", timezoneId: "Europe/Istanbul", acceptDownloads: true });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(name + ": " + e.message));
  p.on("console", (m) => m.type() === "error" && !/fonts\.g|TUNNEL/.test(m.text()) && errors.push(name + " console: " + m.text()));
  return p;
};
const shot = (p, n) => p.screenshot({ path: OUT + n + ".png", fullPage: true });
const step = (s) => console.log("•", s);
async function login(p, email, name) {
  await p.goto(BASE); await p.fill("#email", email); await p.click("text=Giriş kodu gönder");
  await p.fill("#otp", "123456"); await p.click("button:has-text('Giriş yap')");
  if (name) { await p.waitForSelector("#fullname"); await p.fill("#fullname", name); await p.click("text=Devam et"); }
}

step("yasal sayfa girişsiz açılıyor");
const g = await mk("misafir");
await g.goto(BASE); await g.click("text=KVKK Aydınlatma Metni");
await g.waitForSelector("h1:has-text('KVKK Aydınlatma Metni')"); await shot(g, "01-kvkk");

step("yönetici apartman kuruyor");
const m = await mk("yönetici");
await login(m, `yon+${stamp}@test.com`, "Hamza Yönetici");
await m.click("text=Apartmanımı kuracağım");
await m.fill("#bname", "Papatya Apartmanı"); await m.fill("#bunits", "6"); await m.fill("#bdues", "1000");
await m.click("text=Apartmanı oluştur"); await m.waitForSelector("text=Daire 6");

step("toplu davet");
await m.click("text=Toplu davet: boş dairelerin bağlantıları");
await m.waitForSelector(".sheet >> text=6 boş daire");
await shot(m, "02-toplu-davet");
const firstLink = await m.textContent(".sheet .invite-url >> nth=0");
await m.click("[aria-label=Kapat]");

step("aidat + giderler");
await m.click(".tabbar >> text=Aidat"); await m.click("text=Borçları oluştur"); await m.waitForSelector(".stats3");
await m.click(".tabbar >> text=Kasa");
for (const [cat, desc, amt] of [["Temizlik", "Merdiven temizliği", "1800"], ["Asansör", "Aylık bakım", "1200"], ["Elektrik", "Ortak alan elektriği", "650"], ["Su", "Bahçe sulama", "350"], ["Temizlik", "Temizlik malzemesi", "400"]]) {
  await m.click("text=Gider ekle"); await m.selectOption("#e-cat", cat); await m.fill("#e-desc", desc); await m.fill("#e-amount", amt);
  await m.click("text=Gideri kaydet"); await m.waitForSelector(`.ledger >> text=${desc}`);
}

step("sakin katılıp dağılımı görüyor");
const r = await mk("sakin");
await r.goto(firstLink.replace(/^https?:\/\/[^/]+/, BASE));
await r.fill("#email", `sakin+${stamp}@test.com`); await r.click("text=Giriş kodu gönder");
await r.fill("#otp", "123456"); await r.click("button:has-text('Giriş yap')");
await r.waitForSelector("#fullname"); await r.fill("#fullname", "Ayşe Sakin"); await r.click("text=Devam et");
await r.click("text=Apartmana katıl"); await r.waitForSelector("text=Merhaba Ayşe");
await r.click("text=Aidatım nereye gitti?");
await r.click(".seg >> text=Bu ay");
await r.waitForSelector(".donut"); await r.waitForTimeout(300);
const head = await r.textContent(".bd-head p");
step("sakin özeti: " + head);
if (!head.includes("4.400 TL") || !head.includes("733 TL")) errors.push("dağılım hesabı beklenmedik: " + head);
await shot(r, "03-nereye-sakin");

step("yönetici dağılım + Excel");
await m.click(".tabbar >> text=Menü"); await m.click("text=Aidatım nereye gitti?"); await m.click(".seg >> text=Bu ay"); await m.waitForSelector(".donut");
await shot(m, "04-nereye-yonetici");
await m.click(".tabbar >> text=Menü"); await m.click("text=Ayarlar"); await m.waitForSelector("text=Verileri Excel'e aktar");
const [dl] = await Promise.all([m.waitForEvent("download"), m.click("li:has-text('Kasa hareketleri') >> text=İndir")]);
const csv = readFileSync(await dl.path(), "utf8");
step("indirilen dosya: " + dl.suggestedFilename() + " · " + csv.split("\r\n").length + " satır");
if (!csv.startsWith("﻿Tarih;Tür;") || !csv.includes("Merdiven temizliği")) errors.push("CSV beklenmedik");
const [dl2] = await Promise.all([m.waitForEvent("download"), m.click("li:has-text('Aidat durumu') >> text=İndir")]);
if (!readFileSync(await dl2.path(), "utf8").includes("Ödenmedi")) errors.push("aidat CSV beklenmedik");
await shot(m, "05-ayarlar");

step("yönetici, sakin varken hesabını silemiyor");
await m.click("text=Hesabımı sil"); await m.fill("#del-confirm", "sil");
await m.click("text=Hesabımı kalıcı olarak sil");
await m.waitForSelector(".toast-err >> text=yönetimi bir sakine devret");
await shot(m, "06-silme-engel");

step("sakin hesabını siliyor");
await r.click(".tabbar >> text=Menü"); await r.click("text=Ayarlar"); await r.click("text=Hesabımı sil");
await r.fill("#del-confirm", "SİL"); await r.click("text=Hesabımı kalıcı olarak sil");
await r.waitForSelector("text=Giriş kodu gönder");
step("sakin çıkışa yönlendirildi");
await m.click("[aria-label=Kapat]");
await m.click(".tabbar >> text=Menü"); await m.click("text=Daireler ve sakinler");
await m.waitForSelector("text=0 sakin");

await browser.close();
console.log(errors.length ? "HATALAR:\n" + errors.join("\n") : "Senaryo hatasız tamamlandı.");
