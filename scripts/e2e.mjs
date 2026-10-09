// Uçtan uca senaryo: yönetici + sakin, gerçek tarayıcıda (telefon boyutu).
import { chromium } from "/home/claude/.npm-global/lib/node_modules/playwright/index.mjs";
import { writeFileSync, mkdirSync } from "fs";

const BASE = process.env.BASE || "http://localhost:5173";
const OUT = "/tmp/shots/"; mkdirSync(OUT, { recursive: true });
const stamp = Date.now().toString(36);
const browser = await chromium.launch();
const errors = [];
const mk = async (name, dark = false) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: dark ? "dark" : "light", locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(name + ": " + e.message));
  p.on("console", (m) => m.type() === "error" && !/favicon|fonts\.g/.test(m.text()) && errors.push(name + " console: " + m.text()));
  return p;
};
const shot = (p, n) => p.screenshot({ path: OUT + n + ".png", fullPage: true });
const step = (s) => console.log("•", s);

// fake PDF ve PNG
writeFileSync("/tmp/dekont.pdf", "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
writeFileSync("/tmp/foto.png", Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));

async function login(p, email) {
  await p.goto(BASE);
  await p.fill("#email", email);
  await p.click("text=Giriş kodu gönder");
  await p.fill("#otp", "123456");
  await p.click("button:has-text('Giriş yap')");
}

// ---------- yönetici ----------
const m = await mk("yönetici");
step("yönetici girişi");
await m.goto(BASE); await shot(m, "01-giris");
await login(m, `hamza+${stamp}@test.com`);
await m.waitForSelector("#fullname"); await m.fill("#fullname", "Hamza Çamlıca"); await m.fill("#phone", "0555 111 22 33");
await m.click("text=Devam et");
await m.waitForSelector("text=Apartmanımı kuracağım"); await shot(m, "02-baslangic");
await m.click("text=Apartmanımı kuracağım");
await m.fill("#bname", "Lale Apartmanı"); await m.fill("#baddr", "Moda, Kadıköy");
await m.fill("#bunits", "12"); await m.fill("#bdues", "750");
await shot(m, "03-apartman-kur");
await m.click("text=Apartmanı oluştur");
await m.waitForSelector("text=Daire 12"); await shot(m, "04-daireler");
step("daire düzenleme + davet");
await m.click("text=Daire 3"); await m.fill("#u-label", "Daire 3 (Dükkan)"); await m.fill("#u-dues", "1200"); await m.click(".sheet >> text=Kaydet");
await m.waitForSelector("text=Daire kaydedildi"); await m.click("[aria-label=Kapat]");
await m.click("text=Daire 2");
await m.click(".sheet >> button:has-text('Davet bağlantısı oluştur')");
await m.waitForSelector(".invite-link code");
const link = await m.textContent(".invite-link code");
await shot(m, "05-davet");
await m.click("[aria-label=Kapat]");

// ---------- sakin ----------
step("sakin davetle katılıyor: " + link);
const r = await mk("sakin");
await r.goto(link.replace(/^https?:\/\/[^/]+/, BASE));
await r.fill("#email", `ayse+${stamp}@test.com`); await r.click("text=Giriş kodu gönder");
await r.fill("#otp", "123456"); await r.click("button:has-text('Giriş yap')");
await r.waitForSelector("#fullname"); await r.fill("#fullname", "Ayşe Yılmaz"); await r.click("text=Devam et");
await r.waitForSelector("text=Apartmana katıl"); await shot(r, "06-davet-kabul");
await r.click("text=Apartmana katıl");
await r.waitForSelector("text=Merhaba Ayşe"); await shot(r, "07-sakin-ozet");

// ---------- aidat ----------
step("yönetici aidat oluşturuyor");
await m.click(".tabbar >> text=Aidat");
await m.waitForSelector("text=Borçları oluştur"); await shot(m, "08-aidat-olustur");
await m.click("text=Borçları oluştur");
await m.waitForSelector(".stats3"); await shot(m, "09-aidat-liste");
step("yönetici Daire 1 için kısmi ödeme kaydı");
await m.click(".list >> text=Daire 1");
await m.fill("#pay-amount", "300"); await m.click("text=Ödemeyi kaydet");
await m.waitForSelector(".sheet >> text=Kısmi ödendi"); await shot(m, "10-odeme-kaydi");
await m.click("[aria-label=Kapat]");

step("sakin dekontla ödeme bildiriyor");
await r.click(".tabbar >> text=Aidatım");
await r.waitForSelector("text=Ödeme bildir"); await shot(r, "11-sakin-aidat");
await r.click("button:has-text('Ödeme bildir')");
await r.fill("#n-amount", "500");
await r.setInputFiles("#n-file", "/tmp/dekont.pdf");
await r.fill("#n-note", "Ekim aidatı");
await shot(r, "12-odeme-bildir");
await r.click("text=Bildirimi gönder");
await r.waitForSelector("text=500 TL inceleniyor");

step("yönetici bildirimi onaylıyor");
await m.click(".tabbar >> text=Menü");
await m.click("text=Ödeme bildirimleri");
await m.waitForSelector("text=Daire 2 · 500 TL"); await shot(m, "13-bildirim-onay");
await m.click("button:has-text('Onayla')"); await m.click(".sheet >> button:has-text('Onayla')");
await m.waitForSelector("text=Onay bekleyen bildirim yok");

step("kasa: başlangıç bakiyesi, gider, elle giriş, ters kayıt");
await m.click(".tabbar >> text=Kasa");
await m.waitForSelector("text=Başlangıç bakiyesi gir");
await m.click("text=Başlangıç bakiyesi gir"); await m.fill("#o-amount", "25.000"); await m.click(".sheet >> text=Kaydet");
await m.waitForSelector("text=Başlangıç bakiyesi kaydedildi");
await m.click("text=Gider ekle"); await m.selectOption("#e-cat", "Asansör"); await m.fill("#e-desc", "Aylık asansör bakımı"); await m.fill("#e-vendor", "ABC Asansör"); await m.fill("#e-amount", "1800");
await m.setInputFiles("#e-file", "/tmp/foto.png");
await m.click("text=Gideri kaydet"); await m.waitForSelector("text=Gider kaydedildi");
await m.click("text=Para giriş / çıkış"); await m.fill("#c-amount", "1000"); await m.fill("#c-desc", "Eski yönetimden devir"); await m.click(".sheet >> text=Kaydet");
await m.waitForSelector("text=Kasa hareketi kaydedildi");
await m.waitForSelector(".ledger >> text=Eski yönetimden devir");
const bal1 = await m.textContent(".balance b");
step("kasa: " + bal1);
await m.click(".ledger li:has-text('Eski yönetimden devir') >> text=Düzelt");
await m.fill("#reason", "Tutar yanlış girildi"); await m.click("text=Ters kayıt oluştur");
await m.waitForSelector("text=Ters kayıtla düzeltildi");
await m.waitForTimeout(300);
const bal2 = await m.textContent(".balance b");
step("ters kayıt sonrası kasa: " + bal2);
await shot(m, "14-kasa");

step("duyuru, arıza, evrak");
await m.click(".tabbar >> text=Menü"); await m.click("text=Duyurular");
await m.click("text=Yeni duyuru"); await m.fill("#a-title", "Su kesintisi"); await m.fill("#a-body", "Yarın 10:00–14:00 arası İSKİ çalışması nedeniyle su kesilecek.");
await m.click(".sheet >> button:has-text('Yayınla')"); await m.waitForSelector("article >> text=Su kesintisi");
await r.click(".tabbar >> text=Talepler"); await r.click("text=Yeni talep");
await r.fill("#r-title", "-2 otoparkta lamba yanmıyor"); await r.setInputFiles("#r-file", "/tmp/foto.png");
await r.click("text=Talebi gönder"); await r.waitForSelector(".list >> text=-2 otoparkta lamba yanmıyor");
await m.click(".tabbar >> text=Talepler"); await m.click("text=-2 otoparkta lamba yanmıyor");
await m.click(".sheet >> role=tab[name='İşlemde']"); await m.fill("#m-note", "Elektrikçi yarın gelecek"); await m.click(".sheet >> text=Kaydet");
await m.waitForSelector("text=Durum güncellendi"); await shot(m, "15-ariza");
await m.click("[aria-label=Kapat]");
await m.click(".tabbar >> text=Menü"); await m.click("text=Evrak"); await m.click("text=Belge yükle");
await m.setInputFiles("#d-file", "/tmp/dekont.pdf"); await m.fill("#d-title", "Eylül toplantı tutanağı"); await m.selectOption("#d-cat", "Tutanak");
await m.click(".sheet >> button:has-text('Yükle')"); await m.waitForSelector(".list >> text=Eylül toplantı tutanağı");
await shot(m, "16-evrak");

step("sakin tarafı kontrolleri");
await r.click(".tabbar >> text=Özet"); await r.reload();
await r.waitForSelector(".balance b");
const rbal = await r.textContent(".balance b");
step("sakin kasayı görüyor: " + rbal);
await shot(r, "17-sakin-ozet2");
await r.click(".bell"); await r.waitForSelector("text=Ödemen onaylandı"); await shot(r, "18-sakin-bildirimler");
await r.click(".tabbar >> text=Menü"); await r.click("text=Evrak"); await r.waitForSelector("text=Eylül toplantı tutanağı");
await r.click(".tabbar >> text=Aidatım"); await r.waitForSelector("text=Ödemelerim"); await shot(r, "19-sakin-aidat2");

step("yönetici özet + ayarlar");
await m.click(".tabbar >> text=Özet"); await m.waitForSelector(".sumgrid"); await shot(m, "20-yonetici-ozet");
await m.click(".tabbar >> text=Menü"); await m.click("text=Ayarlar"); await m.waitForSelector("text=Yönetimi devret"); await shot(m, "21-ayarlar");

// karanlık tema
const dk = await mk("karanlık", true);
await login(dk, `hamza+${stamp}@test.com`); await dk.waitForSelector(".sumgrid"); await shot(dk, "22-karanlik-ozet");
await dk.click(".tabbar >> text=Kasa"); await dk.waitForSelector(".ledger"); await shot(dk, "23-karanlik-kasa");

// yatay taşma kontrolü
for (const [n, p] of [["yönetici", m], ["sakin", r]]) {
  const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (over > 0) errors.push(n + ": yatay taşma " + over + "px");
}
await browser.close();
console.log(errors.length ? "HATALAR:\n" + errors.join("\n") : "Senaryo hatasız tamamlandı.");
