// Üretim derlemesi: src → dist/app.js, public → dist
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync } from "fs";
import { createHash } from "crypto";
const root = new URL("..", import.meta.url).pathname;
rmSync(root + "dist", { recursive: true, force: true });
mkdirSync(root + "dist", { recursive: true });
const r = await Bun.build({
  entrypoints: [root + "src/main.tsx"], outdir: root + "dist", naming: "app.js", minify: true, target: "browser",
  define: { "process.env.NODE_ENV": '"production"' },
});
if (!r.success) { for (const l of r.logs) console.error(l); process.exit(1); }
cpSync(root + "public", root + "dist", { recursive: true });
const js = readFileSync(root + "dist/app.js"); const css = readFileSync(root + "dist/app.css");
const build = createHash("sha1").update(js).update(css).update(readFileSync(root + "public/sw.js")).digest("hex").slice(0, 10);
for (const f of ["index.html", "sw.js"]) {
  const p = root + "dist/" + f; writeFileSync(p, readFileSync(p, "utf8").replaceAll("__BUILD__", build));
}
console.log("Derleme tamam:", build, (js.length / 1024).toFixed(0) + " KB js");
