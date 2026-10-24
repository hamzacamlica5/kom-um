// Aidat güncelleme (zam): toplu yüzde artış, seçili daireye yeni tutar, sakinin aidat geçmişi ve duyuru.
import { chromium } from "/home/claude/.npm-global/lib/node_modules/playwright/index.mjs";
import { mkdirSync } from "fs";

const BASE = process.env.BASE || "http://localhost:5173";
const OUT = "/tmp/shots4/"; mkdirSync(OUT, { recursive: true });
const stamp = Date.now().toString(36);
const browser = await chromium.launch();
const errors = [];
const mk = async (name) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(name + ": " + e.message));
  return p;
};
const shot = (p, n) => p.screenshot({ path: OUT + n + ".png", fullPage: true });
const step = (s) => console.log("•", s);
const nav = (p, path) => p.evaluate((x) => { history.pushState(null, "", x); dispatchEvent(new PopStateEvent("popstate")); }, path);
async function login(p, email, name) {
  await p.goto(BASE); await p.fill("#email", email); await p.click("text=Giriş kodu gönder");
  await p.fill("#otp", "123456"); await p.click("button:has-text('Giriş yap')");
  await p.waitForSelector("#fullname"); await p.fill("#fullname", name); await p.click("text=Devam et");
}
const rpc = (p, fn, args) => p.evaluate(async ([fn, args]) => {
  const s = JSON.parse(localStorage.getItem("komsum.session"));
  const c = window.KOMSUM;
  const r = await fetch(c.supabaseUrl + "/rest/v1/rpc/" + fn, { method: "POST", headers: { apikey: c.supabaseKey, Authorization: "Bearer " + s.access_token, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  return r.json();
}, [fn, args]);

step("yönetici apartmanı kuruyor ve bu ayın aidatlarını oluşturuyor");
const m = await mk("yönetici");
await login(m, `y4+${stamp}@test.com`, "Hamza Yönetici");
await m.click("text=Apartmanımı kuracağım"); await m.fill("#bname", "Zam Apartmanı"); await m.fill("#bunits", "4"); await m.fill("#bdues", "800");
await m.click("text=Apartmanı oluştur"); await m.waitForSelector("text=Daire 4");
const bid = await m.evaluate(() => localStorage.getItem("komsum.building"));
const now = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" }).slice(0, 7);
await rpc(m, "generate_dues", { p_building: bid, p_period: now });

step("%25 zam, kurul kararı ve açıklamayla");
await nav(m, "/daireler"); await m.waitForSelector("text=Aidatları güncelle (zam)");
await m.click("text=Aidatları güncelle (zam)");
await m.waitForSelector("text=aidatlarından itibaren geçerli olur");
await m.fill("#du-val", "25");
await m.fill("#du-date", new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" }));
await m.fill("#du-note", "Asansör revizyonu nedeniyle");
await m.waitForSelector(".preview >> text=1.000");
await shot(m, "01-zam-onizleme");
await m.click("button:has-text('4 dairenin aidatını güncelle')");
await m.waitForSelector("text=Aidatlar güncellendi");
await m.waitForSelector("text=Aidat geçmişi");
if (!(await m.textContent("body")).includes("%25 artış")) errors.push("geçmişte %25 artış görünmüyor");

step("yalnızca Daire 2'ye yeni tutar, duyurusuz");
await m.click("text=Aidatları güncelle (zam)");
await m.click(".sheet >> text=Yeni tutar"); await m.fill("#du-val", "1500");
await m.click("text=Seçtiğim daireler");
await m.click(".pick-list >> text=Daire 2");
await m.click("text=Sakinlere duyuru olarak bildir");
await m.click("button:has-text('1 dairenin aidatını güncelle')");
await m.waitForSelector("text=Aidatlar güncellendi.");
await m.waitForTimeout(600);
const list = await m.locator(".list .rowbtn").allTextContents();
if (!list.some((t) => t.includes("Daire 2") && t.includes("1.500"))) errors.push("Daire 2 1.500 TL değil: " + list.join(" | "));
if (!list.some((t) => t.includes("Daire 1") && t.includes("1.000"))) errors.push("Daire 1 1.000 TL değil");
await shot(m, "02-daireler-gecmis");
const charges = await m.evaluate(async (bid) => {
  const s = JSON.parse(localStorage.getItem("komsum.session")); const c = window.KOMSUM;
  const r = await fetch(c.supabaseUrl + "/rest/v1/dues_charges?select=amount&building_id=eq." + bid, { headers: { apikey: c.supabaseKey, Authorization: "Bearer " + s.access_token } });
  return (await r.json()).map((x) => Number(x.amount));
}, bid);
if (charges.some((a) => a !== 800)) errors.push("oluşmuş borçlar değişti: " + charges.join(","));

step("sakin katılıyor; aidat geçmişi ve duyuru");
const token = await rpc(m, "create_invite", { p_unit: (await rpc(m, "bulk_invites", { p_building: bid })).find((r) => r.unit_label === "Daire 1").unit_id });
const r = await mk("sakin");
await login(r, `s4+${stamp}@test.com`, "Ayşe Sakin");
await r.waitForSelector("text=Davet bağlantım var");
await r.goto(BASE + "/davet/" + token); await r.click("text=Apartmana katıl"); await r.waitForSelector(".tabbar");
await nav(r, "/aidat"); await r.waitForSelector("text=Aidat geçmişi");
const body = await r.textContent("body");
if (!body.includes("800 TL → 1.000 TL")) errors.push("sakin kendi dairesinin değişikliğini görmüyor");
if (body.includes("1.500")) errors.push("sakin başka dairenin değişikliğini görüyor");
await shot(r, "03-sakin-aidat");
await nav(r, "/duyurular"); await r.waitForSelector("text=Aidat güncellemesi");
await shot(r, "04-sakin-duyuru");

await browser.close();
if (errors.length) { console.log("HATALAR:\n" + errors.join("\n")); process.exit(1); }
console.log("Senaryo hatasız tamamlandı.");
