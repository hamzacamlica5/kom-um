// Üretim derlemesi: src → dist/app.js, public → dist
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync } from "fs";
import { createHash } from "crypto";
const root = new URL("..", import.meta.url).pathname;
const STORE = process.env.TARGET === "store";
const OUT = STORE ? "dist-store" : "dist";
// Mağaza paketinde sayfa gerçek web adresinde çalışmaz: adres ve herkese açık ayarlar pakete gömülür.
const APP_ORIGIN = (process.env.APP_ORIGIN || "https://app.apartmanca.com").replace(/\/$/, "");
async function storeConfig(): Promise<string> {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY) {
    return "window.KOMSUM=" + JSON.stringify({ supabaseUrl: process.env.SUPABASE_URL.replace(/\/$/, ""), supabaseKey: process.env.SUPABASE_PUBLISHABLE_KEY, vapidPublicKey: "", aiEnabled: process.env.AI_ENABLED === "1" }) + ";";
  }
  const r = await fetch(APP_ORIGIN + "/api/config");
  const t = await r.text();
  if (!r.ok || !t.includes("supabaseUrl")) throw new Error("Ayarlar alınamadı: " + APP_ORIGIN + "/api/config");
  return t;
}
rmSync(root + OUT, { recursive: true, force: true });
mkdirSync(root + OUT, { recursive: true });
const r = await Bun.build({
  entrypoints: [root + "src/main.tsx"], outdir: root + OUT, naming: "app.js", minify: true, target: "browser",
  define: { "process.env.NODE_ENV": '"production"', __STORE__: STORE ? "true" : "false", __APP_ORIGIN__: JSON.stringify(APP_ORIGIN) },
});
if (!r.success) { for (const l of r.logs) console.error(l); process.exit(1); }
cpSync(root + "public", root + OUT, { recursive: true });
const js = readFileSync(root + OUT + "/app.js"); const css = readFileSync(root + OUT + "/app.css");
const build = createHash("sha1").update(js).update(css).update(readFileSync(root + "public/sw.js")).digest("hex").slice(0, 10);
for (const f of ["index.html", "sw.js"]) {
  const p = root + OUT + "/" + f; writeFileSync(p, readFileSync(p, "utf8").replaceAll("__BUILD__", build));
}
if (STORE) {
  const p = root + OUT + "/index.html";
  let h = readFileSync(p, "utf8").replace('<script src="/api/config"></script>', "<script>" + (await storeConfig()) + "</script>");
  h = h.replace('<link rel="manifest" href="/manifest.webmanifest">\n', "");
  writeFileSync(p, h);
  for (const f of ["sw.js", "manifest.webmanifest"]) rmSync(root + OUT + "/" + f, { force: true });
}
console.log("Derleme tamam" + (STORE ? " (mağaza)" : "") + ":", build, (js.length / 1024).toFixed(0) + " KB js");
