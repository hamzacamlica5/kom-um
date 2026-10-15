import React from "react";
import { from, rpc } from "../lib/sb";
import { tl, currentPeriod, periodName, ago } from "../lib/format";
import { useApp, Link } from "../state";
import { ErrorBox, Loading, useLoad } from "../ui";

type Summary = { period: string; billed: number; collected_for_period: number; income_in_month: number; expense_in_month: number; outstanding_total: number | null; units_with_debt: number | null; balance: number; pending_notices: number | null; open_requests: number };

export function Home() {
  const { b, isManager, profile } = useApp();
  const bid = b!.building_id;
  const period = currentPeriod();
  const data = useLoad(async () => {
    const [s, anns, myCharges, units] = await Promise.all([
      rpc<Summary>("monthly_summary", { p_building: bid, p_period: period }),
      from("announcements", "id,title,created_at").eq("building_id", bid).isNull("archived_at").order("created_at", false).limit(3),
      !isManager || b!.unit_id ? from("charge_status", "remaining,pending,status").eq("building_id", bid).eq("unit_id", b!.unit_id || "00000000-0000-0000-0000-000000000000").isNull("cancelled_at") : Promise.resolve([]),
      isManager ? from("units", "id").eq("building_id", bid).isNull("archived_at").gte("monthly_dues", 0.01).limit(1) : Promise.resolve([1]),
    ]);
    const myDebt = (myCharges as any[]).filter((c) => c.status === "unpaid" || c.status === "partial").reduce((t, c) => t + Number(c.remaining), 0);
    return { s, anns: anns as any[], myDebt, noDues: (units as any[]).length === 0 };
  }, [bid, period, isManager]);
  const d = data.data;
  const first = profile?.full_name.split(" ")[0];

  return (
    <div className="page">
      <header className="home-head">
        <span className="eyebrow">{b!.role === "manager" ? "Yönetici" : "Bina sakini"}{b!.unit_label ? " · " + b!.unit_label : ""}</span>
        <h1>Merhaba {first}</h1>
      </header>
      {data.loading && !d ? <Loading /> : data.error ? <ErrorBox msg={data.error} retry={data.reload} /> : (
        <>
          <section className="balance">
            <span>Apartman kasası</span>
            <b className={Number(d!.s.balance) < 0 ? "neg" : ""}>{tl(d!.s.balance)}</b>
            <Link to="/kasa" className="balance-link">Hesap hareketlerini gör →</Link>
          </section>

          {isManager && d!.noDues && (
            <Link to="/daireler" className="todo"><b>İlk adım: daireleri ve aidatları ayarla</b><span>Aidat tutarlarını gir, sakinlere davet bağlantısı gönder.</span></Link>
          )}
          {isManager && Number(d!.s.pending_notices) > 0 && (
            <Link to="/bildirimler" className="todo warn"><b>{d!.s.pending_notices} ödeme bildirimi onay bekliyor</b><span>Dekontları incele, paranın geldiğini kontrol edip onayla.</span></Link>
          )}
          {isManager && Number(d!.s.open_requests) > 0 && (
            <Link to="/talepler" className="todo"><b>{d!.s.open_requests} açık arıza talebi</b><span>Durumlarını güncelle; talep sahibine bildirim gider.</span></Link>
          )}
          {b!.unit_id && (
            <Link to="/aidat" className={"todo " + (d!.myDebt > 0 ? "warn" : "ok")}>
              <b>{d!.myDebt > 0 ? `Dairenin ödenmemiş aidatı: ${tl(d!.myDebt)}` : "Dairenin aidat borcu yok"}</b>
              <span>{d!.myDebt > 0 ? "Ödediysen dekontunu bildir." : "Ödeme geçmişini görmek için dokun."}</span>
            </Link>
          )}

          <section className="card">
            <div className="row-between"><h2>{periodName(period)}</h2>{isManager && <Link to="/aidat" className="small">Aidatlar →</Link>}</div>
            <div className="sumgrid">
              <div><span>Tahakkuk eden aidat</span><b>{tl(d!.s.billed)}</b></div>
              <div><span>Bu dönemin tahsilatı</span><b className="pos">{tl(d!.s.collected_for_period)}</b></div>
              <div><span>Bu ay yapılan gider</span><b>{tl(d!.s.expense_in_month)}</b></div>
              {isManager && <div><span>Toplam açık borç</span><b className={Number(d!.s.outstanding_total) > 0 ? "neg" : ""}>{tl(d!.s.outstanding_total)}</b><small>{d!.s.units_with_debt} daire</small></div>}
            </div>
            {Number(d!.s.billed) > 0 && (
              <div className="meter" aria-label="Tahsilat oranı">
                <div style={{ width: Math.min(100, (Number(d!.s.collected_for_period) / Number(d!.s.billed)) * 100) + "%" }} />
                <span>%{Math.round((Number(d!.s.collected_for_period) / Number(d!.s.billed)) * 100)} tahsil edildi</span>
              </div>
            )}
          </section>

          <Link to="/nereye" className="todo whereto"><b>Aidatım nereye gitti?</b><span>Giderlerin dağılımını ve dairenin payını gör.</span></Link>

          <section className="card">
            <div className="row-between"><h2>Son duyurular</h2><Link to="/duyurular" className="small">Tümü →</Link></div>
            {d!.anns.length === 0 ? <p className="muted small">Henüz duyuru yok.</p> : (
              <ul className="list compact">{d!.anns.map((a) => <li key={a.id}><Link to="/duyurular" className="row-main"><b>{a.title}</b><span className="small muted">{ago(a.created_at)}</span></Link></li>)}</ul>
            )}
          </section>

          <div className="quick">
            <Link to="/talepler" className="quick-btn">Arıza bildir</Link>
            <Link to="/evrak" className="quick-btn">Evrak</Link>
            {isManager ? <Link to="/kasa" className="quick-btn">Gider ekle</Link> : <Link to="/aidat" className="quick-btn">Ödeme bildir</Link>}
          </div>
        </>
      )}
    </div>
  );
}
