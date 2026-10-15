import { chromium } from "/home/claude/.npm-global/lib/node_modules/playwright/index.mjs";
const FPS = 30;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto("file:///home/claude/promo/promo.html"); await p.waitForLoadState("networkidle"); await p.evaluate(() => document.fonts.ready);
await p.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
const dur = await p.evaluate(() => window.DUR);
const n = Math.round(dur * FPS);
for (let i = 0; i < n; i++) {
  await p.evaluate((t) => render(t), i / FPS);
  await p.screenshot({ path: `frames/f${String(i).padStart(4, "0")}.jpg`, type: "jpeg", quality: 92 });
  if (i % 120 === 0) console.log("kare", i, "/", n);
}
await b.close();
