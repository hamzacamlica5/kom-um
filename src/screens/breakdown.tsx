import React, { useMemo, useState } from "react";
import { rpc } from "../lib/sb";
import { tl, istanbulToday, dateTR } from "../lib/format";
import { useApp, Link } from "../state";
import { Empty, ErrorBox, Loading, PageHead, Segmented, useLoad, useToast } from "../ui";

type Cat = { category: string; amount: number; count: number };
type Data = { from: string; to: string; total_expense: number; categories: Cat[]; my_billed: number | null; building_billed: number; share_ratio: number | null; unit_count: number };

// Kategori renkleri: iki temada da okunur, yan yana ayırt edilir.
const COLORS = ["#1D7A64", "#E3A535", "#3F6FB5", "#C2553F", "#8A5BB0", "#2E9AA6", "#A8742A", "#5C8A3A", "#C2477F", "#7A8590"];

type Range = "month" | "last" | "q" | "year";
function rangeDates(r: Range): [string, string, string] {
  const today = istanbulToday();
  const [y, m] = today.split("-").map(Number);
  const iso = (yy: number, mm: number, dd: number) => new Date(Date.UTC(yy, mm - 1, dd)).toISOString().slice(0, 10);
  const lastDay = (yy: number, mm: number) => new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  if (r === "month") return [iso(y, m, 1), iso(y, m, lastDay(y, m)), "Bu ay"];
  if (r === "last") { const py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1; return [iso(py, pm, 1), iso(py, pm, lastDay(py, pm)), "Geçen ay"]; }
  if (r === "q") return [iso(y, m - 2, 1), iso(y, m, lastDay(y, m)), "Son 3 ay"];
  return [iso(y, m - 11, 1), iso(y, m, lastDay(y, m)), "Son 12 ay"];
}

export function Donut({ cats, total, center, sub }: { cats: Cat[]; total: number; center: string; sub: string }) {
  const R = 70, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <svg viewBox="0 0 200 200" className="donut" role="img" aria-label="Gider dağılımı grafiği">
      <circle cx="100" cy="100" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="26" />
      {cats.map((c, i) => {
        const frac = total > 0 ? Number(c.amount) / total : 0;
        const len = Math.max(frac * C - (cats.length > 1 ? 2 : 0), 0.5);
        const el = <circle key={c.category} cx="100" cy="100" r={R} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="26"
          strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} transform="rotate(-90 100 100)" />;
        acc += frac * C;
        return el;
      })}
      <text x="100" y="98" textAnchor="middle" className="donut-big">{center}</text>
      <text x="100" y="120" textAnchor="middle" className="donut-sub">{sub}</text>
    </svg>
  );
}

export function Breakdown() {
  const { b } = useApp();
  const bid = b!.building_id;
  const toast = useToast();
  const [range, setRange] = useState<Range>("q");
  const [from, to, label] = useMemo(() => rangeDates(range), [range]);
  const data = useLoad(() => rpc<Data>("expense_breakdown", { p_building: bid, p_from: from, p_to: to }), [bid, from, to]);
  const d = data.data;
  const total = Number(d?.total_expense || 0);
  const ratio = d?.share_ratio == null ? null : Number(d.share_ratio);
  const mine = ratio == null ? null : total * ratio;
  const perUnit = d && d.unit_count ? total / d.unit_count : 0;

  const share = async () => {
    if (!d) return;
    const top = d.categories.slice(0, 4).map((c) => `${c.category} %${Math.round((Number(c.amount) / total) * 100)}`).join(", ");
    const text = `${b!.name} · ${label.toLowerCase()} giderler: ${tl(total)}. ${top}. KOMŞUM ile her kuruş kayıtlı.`;
    try {
      if ((navigator as any).share) await (navigator as any).share({ title: "Aidatımız nereye gitti?", text, url: location.origin });
      else { await navigator.clipboard.writeText(text + " " + location.origin); toast("Özet kopyalandı."); }
    } catch {}
  };

  return (
    <div className="page">
      <PageHead title="Aidatım nereye gitti?" sub={b!.unit_label ? `${b!.unit_label} · ${b!.name}` : b!.name} />
      <Segmented value={range} onChange={setRange} options={[["month", "Bu ay"], ["last", "Geçen ay"], ["q", "3 ay"], ["year", "12 ay"]]} />
      {data.loading && !d ? <Loading /> : data.error ? <ErrorBox msg={data.error} retry={data.reload} /> : total === 0 ? (
        <Empty title={`${label} kayıtlı gider yok`}>Yönetici gider girdikçe, aidatların hangi işlere harcandığı burada görünür.</Empty>
      ) : (
        <>
          <section className="card breakdown">
            <Donut cats={d!.categories} total={total}
              center={mine != null ? tl(Math.round(mine)) : tl(Math.round(total))}
              sub={mine != null ? "senin payın" : "toplam gider"} />
            <div className="bd-head">
              {mine != null ? (
                <p>{label} apartmanın <b>{tl(total)}</b> harcadı. Dairenin payına düşen <b>{tl(Math.round(mine))}</b>.</p>
              ) : (
                <p>{label} apartmanın <b>{tl(total)}</b> harcadı. Daire başına ortalama <b>{tl(Math.round(perUnit))}</b>.</p>
              )}
              <p className="muted small">{dateTR(from)} – {dateTR(to)} · {d!.categories.reduce((n, c) => n + Number(c.count), 0)} kayıtlı gider</p>
            </div>
          </section>

          <ul className="list bd-list">
            {d!.categories.map((c, i) => {
              const pct = (Number(c.amount) / total) * 100;
              return (
                <li key={c.category}>
                  <span className="swatch" style={{ background: COLORS[i % COLORS.length] }} />
                  <div className="row-main">
                    <b>{c.category}</b>
                    <span className="bar"><span style={{ width: pct + "%", background: COLORS[i % COLORS.length] }} /></span>
                    <span className="small muted">%{pct < 1 ? "<1" : Math.round(pct)} · {c.count} kayıt</span>
                  </div>
                  <div className="row-side">
                    <span className="money">{tl(Math.round(Number(c.amount)))}</span>
                    {ratio != null && <span className="small muted">senin payın {tl(Math.round(Number(c.amount) * ratio))}</span>}
                  </div>
                </li>
              );
            })}
          </ul>

          {mine != null && d!.my_billed != null && Number(d!.my_billed) > 0 && (
            <p className="note-info">
              Bu dönemde dairene tahakkuk eden aidat <b>{tl(d!.my_billed)}</b>.{" "}
              {Number(d!.my_billed) >= mine
                ? <>Giderlerdeki payın bunun %{Math.round((mine / Number(d!.my_billed)) * 100)}'i; kalanı apartman kasasında birikiyor.</>
                : <>Giderler aidatlardan fazla; fark apartman kasasından karşılandı.</>}
            </p>
          )}
          <div className="row-wrap">
            <button className="btn btn-ghost" onClick={share}>Özeti paylaş</button>
            <Link to="/kasa" className="btn btn-ghost">Tüm hareketleri gör</Link>
          </div>
          <p className="small muted">Grafik, yöneticinin girdiği ve iptal edilmemiş giderlerden hesaplanır. Payın, dairene bu dönemde tahakkuk eden aidatın binanın toplam aidatına oranıdır.</p>
        </>
      )}
    </div>
  );
}
