export function tl(n: number | string | null | undefined): string {
  const v = Number(n || 0);
  const hasKurus = Math.round(v * 100) % 100 !== 0;
  return v.toLocaleString("tr-TR", { minimumFractionDigits: hasKurus ? 2 : 0, maximumFractionDigits: 2 }) + " TL";
}

export function istanbulToday(d = new Date()): string {
  // YYYY-MM-DD (İstanbul saati)
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function currentPeriod(d = new Date()): string { return istanbulToday(d).slice(0, 7); }

export function shiftPeriod(p: string, delta: number): string {
  const [y, m] = p.split("-").map(Number);
  const t = y * 12 + (m - 1) + delta;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
export function periodName(p: string): string {
  const [y, m] = p.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function dateTR(s: string | null | undefined): string {
  if (!s) return "";
  const d = s.length === 10 ? new Date(s + "T12:00:00") : new Date(s);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });
}

export function dateTimeTR(s: string | null | undefined): string {
  if (!s) return "";
  return new Date(s).toLocaleString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
}

export function ago(s: string): string {
  const diff = (Date.now() - new Date(s).getTime()) / 1000;
  if (diff < 60) return "az önce";
  if (diff < 3600) return Math.floor(diff / 60) + " dk önce";
  if (diff < 86400) return Math.floor(diff / 3600) + " sa önce";
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + " gün önce";
  return dateTR(s);
}

export function price(units: number): number {
  // Daire başı 15 TL (KDV dahil), en az 99 TL
  return Math.max(99, 15 * Math.max(units, 0));
}

export function parseAmount(s: string): number | null {
  // "1.250,50" veya "1250.5" veya "1250"
  const t = s.trim().replace(/\s|TL/gi, "");
  if (!t) return null;
  let norm = t;
  if (t.includes(",")) norm = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) norm = t.replace(/\./g, ""); // 25.000 → 25000
  const v = Number(norm);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
}

export const STATUS_LABEL: Record<string, string> = {
  unpaid: "Ödenmedi", partial: "Kısmi ödendi", paid: "Ödendi", cancelled: "İptal",
  pending: "İnceleniyor", approved: "Onaylandı", rejected: "Reddedildi",
  new: "Yeni", received: "Alındı", in_progress: "İşlemde", resolved: "Çözüldü",
};
