// Tanıtım sitesi derlemesi: site-src + src/legal → site/ (statik, çerezsiz, dış kaynaksız).
// Kullanım: bun scripts/build-site.ts   (uygulama adresi için SITE_APP_URL ortam değişkeni)
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { LinkCtx, LEGAL_PAGES, LEGAL_UPDATED, PROMISES } from "../src/legal/texts";
import { COMPANY as C, PRICE as P, monthly, yearly } from "../src/legal/info";

const root = new URL("..", import.meta.url).pathname;
const SRC = root + "site-src/", OUT = root + "site/";
const SITE = "https://" + C.site;
const APP = process.env.SITE_APP_URL || "https://" + C.app;
const YEAR = 2026;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const file = (p: string) => (p === "/" ? "index.html" : p.slice(1) + ".html");
const tl = (n: number) => n.toLocaleString("tr-TR") + " TL";

const LOGO = `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="10" width="36" height="32" rx="4" fill="currentColor"/><path d="M4 14 24 3l20 11" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><g fill="#F3F5F2"><rect x="12" y="17" width="7" height="6" rx="1.5"/><rect x="29" y="17" width="7" height="6" rx="1.5"/><rect x="12" y="28" width="7" height="6" rx="1.5"/><rect x="20.5" y="30" width="7" height="12" rx="1.5"/></g><rect x="29" y="28" width="7" height="6" rx="1.5" fill="#E3A535"/></svg>`;

function head(title: string, desc: string, path: string) {
  const full = path === "/" ? title : `${title} | ${C.brand}`;
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${path === "/" ? "/" : path}">
<meta name="theme-color" content="#1D5C4F">
<meta property="og:type" content="website">
<meta property="og:locale" content="tr_TR">
<meta property="og:site_name" content="${C.brand}">
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:image" content="${SITE}/img/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/icon-192.png">
<link rel="apple-touch-icon" href="assets/icon-180.png">
<link rel="preload" href="assets/plus-jakarta-sans.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/site.css">
</head>
<body>
<a class="skip" href="#icerik">İçeriğe geç</a>
<header class="top"><div class="wrap">
  <a class="logo" href="index.html" aria-label="${C.brand} ana sayfa">${LOGO}<span>${C.brand}</span></a>
  <nav class="nav" aria-label="Ana menü">
    <a class="hide-s" href="index.html#nasil">Nasıl çalışır</a>
    <a class="hide-s" href="index.html#fiyat">Fiyat</a>
    <a class="hide-s" href="index.html#sss">Sık sorulanlar</a>
    <a class="hide-s" href="${APP}">Giriş yap</a>
    <a class="btn btn-door" href="${APP}">Ücretsiz dene</a>
  </nav>
</div></header>
`;
}

function foot() {
  const legal = LEGAL_PAGES.filter((p) => p.path !== "/iletisim" && p.path !== "/guven");
  return `<footer><div class="wrap">
  <div class="cols">
    <div><a class="logo" href="index.html">${LOGO}<span>${C.brand}</span></a><p class="tag">Apartmanda ne oluyor, herkes bilsin.</p></div>
    <div><h3>Ürün</h3><ul>
      <li><a href="index.html#nasil">Nasıl çalışır</a></li>
      <li><a href="index.html#fiyat">Fiyat</a></li>
      <li><a href="index.html#sss">Sık sorulanlar</a></li>
      <li><a href="guven.html">Güven Merkezi</a></li>
      <li><a href="${APP}">Giriş yap</a></li>
    </ul></div>
    <div><h3>Yasal</h3><ul>${legal.map((p) => `<li><a href="${file(p.path)}">${esc(p.title)}</a></li>`).join("")}</ul></div>
    <div><h3>İletişim</h3><ul>
      <li><a href="mailto:${esc(C.eposta)}">${esc(C.eposta)}</a></li>
      <li>${esc(C.telefon)}</li>
      <li>${esc(C.unvan)}</li>
      <li>${esc(C.adres)}</li>
      <li>MERSİS: ${esc(C.mersis)}</li>
      <li><a href="iletisim.html">Tüm şirket bilgileri</a></li>
    </ul></div>
  </div>
  <p class="legal-line">© ${YEAR} ${esc(C.unvan)}. Bu sitede çerez, analiz veya reklam aracı kullanılmaz. Fiyatlara KDV dahildir.</p>
</div></footer>
<script src="assets/site.js" defer></script>
</body>
</html>
`;
}

function facade() {
  // 12 daire: 4 kat × 3 pencere. Ödeyen 9 dairenin yanma sırası data-o; ödemeyenler sönük kalır.
  const order = [5, 1, 0, 8, 2, 0, 9, 4, 6, 0, 3, 7];
  let w = "";
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    const i = r * 3 + c, x = 98 + c * 78, y = 112 + r * 74, o = order[i];
    w += `<rect class="win${o ? " on" : ""}" ${o ? `data-o="${o}"` : ""} x="${x}" y="${y}" width="48" height="50" rx="4"/>`;
    w += `<rect x="${x - 6}" y="${y + 54}" width="60" height="4" rx="2" fill="#2E6E60"/>`;
  }
  return `<svg class="facade" viewBox="0 0 400 520" role="img" aria-label="12 daireli bir apartman; aidatını ödeyen dokuz dairenin penceresi sarı yanıyor.">
  <rect x="0" y="498" width="400" height="22" rx="4" fill="#E1E7E1"/>
  <path d="M46 92 200 26l154 66" fill="none" stroke="#1D5C4F" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="66" y="84" width="268" height="416" rx="10" fill="#1D5C4F"/>
  ${w}
  <rect x="176" y="416" width="48" height="84" rx="5" fill="#10302A"/>
  <circle cx="215" cy="460" r="3" fill="#E3A535"/>
  <rect x="236" y="430" width="22" height="34" rx="3" fill="#F3F5F2"/>
  ${[0, 1, 2, 3, 4, 5].map((k) => `<circle cx="${243 + (k % 2) * 8}" cy="${437 + Math.floor(k / 2) * 10}" r="2.2" fill="#1D5C4F"/>`).join("")}
  <rect x="96" y="430" width="56" height="40" rx="4" fill="#123D34"/>
</svg>`;
}

const fill = (s: string) => s
  .replaceAll("{{APP}}", APP).replaceAll("{{TRIAL}}", String(P.trialDays)).replaceAll("{{PER}}", String(P.perUnit))
  .replaceAll("{{MIN}}", String(P.min)).replaceAll("{{REFUND}}", String(P.refundDays))
  .replaceAll("{{EX_MONTH}}", tl(monthly(12))).replaceAll("{{EX_YEAR}}", tl(yearly(12)))
  .replaceAll("{{FACADE}}", facade())
  .replaceAll("{{PROMISES}}", PROMISES.map(([t, d]) => `<li><div><h3>${esc(t)}</h3><p>${esc(d)}</p></div></li>`).join(""));

// ---- çıktı
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT + "assets", { recursive: true });
cpSync(SRC + "img", OUT + "img", { recursive: true });
cpSync(SRC + "site.css", OUT + "assets/site.css");
cpSync(SRC + "site.js", OUT + "assets/site.js");
cpSync(root + "public/fonts/plus-jakarta-sans.woff2", OUT + "assets/plus-jakarta-sans.woff2");
cpSync(root + "public/fonts/OFL.txt", OUT + "assets/OFL.txt");
for (const f of ["icon-180.png", "icon-192.png"]) cpSync(root + "public/icons/" + f, OUT + "assets/" + f);
cpSync(SRC + "favicon.ico", OUT + "favicon.ico");

const ld = { "@context": "https://schema.org", "@type": "SoftwareApplication", name: C.brand, applicationCategory: "BusinessApplication", operatingSystem: "Web, Android, iOS",
  description: "Apartman ve site yönetimi: aidat takibi, şeffaf kasa, duyuru, arıza ve acil durum rehberi.", url: SITE,
  offers: { "@type": "Offer", price: String(P.perUnit), priceCurrency: "TRY", description: `Daire başına aylık ${P.perUnit} TL, aylık en az ${P.min} TL, KDV dahil` } };
const home = head(`${C.brand}: apartman yönetimi uygulaması`, `Aidat, kasa, duyuru ve arıza tek yerde. Sakinler aidatlarının nereye gittiğini görür. Daire başına ayda ${P.perUnit} TL, ${P.trialDays} gün ücretsiz, kart istemez.`, "/")
  .replace("</head>", `<script type="application/ld+json">${JSON.stringify(ld)}</script>\n</head>`)
  + fill(readFileSync(SRC + "index.body.html", "utf8")) + foot();
writeFileSync(OUT + "index.html", home);

const SiteLink = ({ to, children }: { to: string; children: React.ReactNode }) =>
  React.createElement("a", { href: to.startsWith("/") ? file(to) : to }, children);
for (const p of LEGAL_PAGES) {
  let body = renderToStaticMarkup(React.createElement(LinkCtx.Provider, { value: SiteLink }, React.createElement(p.Body)));
  body = body.replaceAll('<table class="tbl">', '<div class="tbl-wrap"><table class="tbl">').replaceAll("</table>", "</table></div>");
  const others = LEGAL_PAGES.filter((o) => o.path !== p.path).map((o) => `<a href="${file(o.path)}">${esc(o.title)}</a>`).join("");
  writeFileSync(OUT + file(p.path), head(p.title, p.desc, p.path) +
    `<main id="icerik" class="doc"><div class="wrap"><h1>${esc(p.title)}</h1><p class="updated">Son güncelleme: ${LEGAL_UPDATED}</p><article>${body}</article><nav class="others" aria-label="Diğer sayfalar">${others}</nav></div></main>\n` + foot());
}

writeFileSync(OUT + "404.html", head("Sayfa bulunamadı", "Aradığın sayfa bulunamadı.", "/404") +
  `<main id="icerik" class="doc"><div class="wrap"><h1>Bu sayfa bulunamadı</h1><article><p>Adres yanlış yazılmış ya da sayfa taşınmış olabilir.</p><p><a href="index.html">Ana sayfaya dön</a> ya da <a href="${APP}">uygulamaya giriş yap</a>.</p></article></div></main>\n` + foot());

const pages = ["/", ...LEGAL_PAGES.map((p) => p.path)];
writeFileSync(OUT + "sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${SITE}${p}</loc></url>`).join("\n")}\n</urlset>\n`);
writeFileSync(OUT + "robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);

const csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'; object-src 'none'; upgrade-insecure-requests";
writeFileSync(OUT + "vercel.json", JSON.stringify({
  cleanUrls: true,
  trailingSlash: false,
  headers: [
    { source: "/(.*)", headers: [
      { key: "Content-Security-Policy", value: csp },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
      { key: "X-Frame-Options", value: "DENY" },
    ] },
    { source: "/assets/(.*)", headers: [{ key: "Cache-Control", value: "public, max-age=604800" }] },
  ],
}, null, 2) + "\n");

console.log("Site hazır:", pages.length + 1, "sayfa →", OUT, "· uygulama adresi:", APP);
