import { chromium } from "/home/claude/.npm-global/lib/node_modules/playwright/index.mjs";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.goto("file:///home/claude/promo/promo.html"); await p.waitForLoadState("networkidle"); await p.evaluate(() => document.fonts.ready);
const ts = process.argv.slice(2).map(Number);
for (const t of ts) { await p.evaluate((t) => render(t), t); await p.screenshot({ path: `/tmp/pv-${t}.png` }); }
await b.close(); console.log(errs.join("\n") || "ok");
