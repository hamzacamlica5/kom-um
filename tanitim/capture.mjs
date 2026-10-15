import { chromium } from "/home/claude/.npm-global/lib/node_modules/playwright/index.mjs";
const BASE = "http://localhost:5174", OUT = "/home/claude/promo/shots/";
const browser = await chromium.launch();
async function as(email) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const p = await ctx.newPage();
  await p.goto(BASE); await p.fill("#email", email); await p.click("text=Giriş kodu gönder");
  await p.fill("#otp", "123456"); await p.click("button:has-text('Giriş yap')");
  await p.waitForSelector(".tabbar");
  await p.addStyleTag({ content: ".toast{display:none!important} *{animation:none!important;transition:none!important}" });
  return p;
}
const go = async (p, path, wait) => { await p.evaluate((x) => { history.pushState(null, "", x); dispatchEvent(new PopStateEvent("popstate")); }, path); await p.waitForSelector(wait); await p.waitForTimeout(500); };
const snap = async (p, name, full = false) => {
  if (full) await p.addStyleTag({ content: ".topbar,.tabbar{visibility:hidden!important}" });
  await p.screenshot({ path: OUT + name + ".png", fullPage: full });
  if (full) await p.evaluate(() => { const s = [...document.querySelectorAll("style")].pop(); s.remove(); });
};

const m = await as("murat@demo.komsum");
const dims = await m.evaluate(() => ({ top: document.querySelector(".topbar").getBoundingClientRect().height, tab: document.querySelector(".tabbar").getBoundingClientRect().height }));
(await import("fs")).writeFileSync(OUT + "dims.json", JSON.stringify(dims));
await go(m, "/", ".sumgrid"); await snap(m, "m-home"); await snap(m, "m-home-full", true);
await go(m, "/kasa", ".ledger li"); await snap(m, "m-kasa"); await snap(m, "m-kasa-full", true);
await go(m, "/aidat", ".stats3"); await snap(m, "m-aidat"); await snap(m, "m-aidat-full", true);
await go(m, "/bildirimler", ".notice"); await snap(m, "m-bildirim");
const ob = await m.locator(".notice >> button:has-text('Onayla')").boundingBox();
(await import("fs")).writeFileSync(OUT + "onayla.json", JSON.stringify(ob));
await go(m, "/talepler", ".list li"); await snap(m, "m-talepler");

const r = await as("ayse@demo.komsum");
await go(r, "/", ".balance"); await snap(r, "r-home");
await go(r, "/nereye", ".donut"); await r.click(".seg >> text=3 ay"); await r.waitForTimeout(800); await snap(r, "r-nereye"); await snap(r, "r-nereye-full", true);
await go(r, "/aidat", ".hero-debt"); await snap(r, "r-aidat");
await go(r, "/acil", ".places"); await snap(r, "r-acil"); await snap(r, "r-acil-full", true);
await browser.close();
console.log("ok");
