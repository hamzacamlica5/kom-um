// Excel'in Türkçe ayarlarıyla doğrudan açılan CSV: noktalı virgül ayraç, UTF-8 BOM, virgüllü ondalık.
export type Cell = string | number | null | undefined;

export function toCsv(header: string[], rows: Cell[][]): string {
  const esc = (v: Cell) => {
    if (v === null || v === undefined) return "";
    if (typeof v === "number") return String(v).replace(".", ",");
    const s = String(v);
    return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return "﻿" + [header, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
}

export async function downloadCsv(name: string, csv: string) {
  // Mağaza paketi: dosyayı uygulamanın geçici klasörüne yazıp telefonun paylaşım menüsünü aç
  const P = (window as any).Capacitor?.Plugins;
  if (P?.Filesystem && P?.Share) {
    const w = await P.Filesystem.writeFile({ path: name, data: csv, directory: "CACHE", encoding: "utf8" });
    await P.Share.share({ title: name, files: [w.uri] }).catch(() => {});
    return;
  }
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const file = new File([blob], name, { type: "text/csv" });
  const nav: any = navigator;
  // Telefonda paylaşım menüsü (Dosyalara kaydet, WhatsApp, e-posta), bilgisayarda indirme
  if (nav.canShare && nav.canShare({ files: [file] }) && matchMedia("(pointer: coarse)").matches) {
    return nav.share({ files: [file], title: name }).catch(() => {});
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export function slug(s: string) {
  return s.toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
