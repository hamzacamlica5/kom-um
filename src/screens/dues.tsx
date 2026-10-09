import React, { useMemo, useState } from "react";
import { from, rpc, upload, fileUrl } from "../lib/sb";
import { tl, currentPeriod, shiftPeriod, periodName, dateTR, istanbulToday, parseAmount } from "../lib/format";
import { useApp } from "../state";
import { Badge, Empty, ErrorBox, Field, FilePick, Loading, Money, PageHead, ReasonSheet, Segmented, Sheet, useAction, useLoad, useToast } from "../ui";

type Charge = { id: string; unit_id: string; unit_label: string; period: string; period_id: string; amount: number; due_date: string; paid: number; remaining: number; pending: number; status: string };
type Payment = { id: string; charge_id: string; amount: number; paid_on: string; method: string; note: string | null; notice_id: string | null; created_at: string; voided_at: string | null; void_reason: string | null };
type Notice = { id: string; charge_id: string; unit_id: string; submitted_by: string; amount: number; paid_on: string; receipt_path: string | null; note: string | null; status: string; reject_reason: string | null; created_at: string; reviewed_at: string | null };

export function openFile(path: string, toast: (m: string, k?: any) => void) {
  // Pencereyi tıklama anında aç; adres gelince yönlendir (açılır pencere engelini önler).
  const w = window.open("", "_blank");
  fileUrl(path).then((u) => { if (w) w.location.href = u; else location.href = u; }, (e) => { w?.close(); toast(e.message, "err"); });
}

export function Dues() {
  const { isManager } = useApp();
  return isManager ? <ManagerDues /> : <ResidentDues />;
}

// ===================== Yönetici =====================
function ManagerDues() {
  const { b } = useApp();
  const bid = b!.building_id;
  const [period, setPeriod] = useState(currentPeriod());
  const [filter, setFilter] = useState<"all" | "open" | "paid">("all");
  const [sel, setSel] = useState<Charge | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const { busy, run } = useAction();
  const toast = useToast();

  const data = useLoad(async () => {
    const [charges, periods, preview, settings] = await Promise.all([
      from<Charge>("charge_status").eq("building_id", bid).eq("period", period).isNull("cancelled_at").order("unit_label"),
      from("dues_periods", "id,period,created_at").eq("building_id", bid).eq("period", period).isNull("cancelled_at"),
      rpc<any[]>("dues_preview", { p_building: bid, p_period: period }),
      from("buildings", "reminder_enabled,reminder_day,reminder_hour").eq("id", bid),
    ]);
    charges.sort((a, b) => a.unit_label.localeCompare(b.unit_label, "tr", { numeric: true }));
    return { charges, periodRow: periods[0] || null, preview: preview[0], settings: settings[0] };
  }, [bid, period]);

  const d = data.data;
  const totals = useMemo(() => {
    const c = d?.charges || [];
    return { billed: c.reduce((s, x) => s + Number(x.amount), 0), paid: c.reduce((s, x) => s + Number(x.paid), 0), left: c.reduce((s, x) => s + Number(x.remaining), 0), pending: c.filter((x) => Number(x.pending) > 0).length };
  }, [d]);
  const list = (d?.charges || []).filter((c) => filter === "all" || (filter === "paid" ? c.status === "paid" : c.status !== "paid"));

  return (
    <div className="page">
      <PageHead title="Aidatlar" sub="Aylık borçlar, tahsilatlar ve hatırlatmalar" />
      <div className="periodbar">
        <button className="iconbtn" onClick={() => setPeriod(shiftPeriod(period, -1))} aria-label="Önceki ay">‹</button>
        <b>{periodName(period)}</b>
        <button className="iconbtn" onClick={() => setPeriod(shiftPeriod(period, 1))} aria-label="Sonraki ay">›</button>
      </div>

      {data.loading && !d ? <Loading /> : data.error ? <ErrorBox msg={data.error} retry={data.reload} /> : !d!.periodRow ? (
        <section className="card stack">
          <h2>{periodName(period)} aidatlarını oluştur</h2>
          {d!.preview.unit_count === 0 ? (
            <p className="muted">Aidat tutarı girilmiş daire yok. Önce <b>Daireler</b> bölümünden aidatları belirle.</p>
          ) : (
            <>
              <div className="kv"><span>Borç yazılacak daire</span><b>{d!.preview.unit_count}</b></div>
              <div className="kv"><span>Toplam tahakkuk</span><b>{tl(d!.preview.total)}</b></div>
              <p className="muted small">Borç oluşturmak kasaya para eklemez. Para, ödeme kaydedilince ya da dekont onaylanınca kasaya girer. Sakinlere bildirim gider.</p>
              <button className="btn btn-primary" disabled={busy} onClick={() => run(() => rpc("generate_dues", { p_building: bid, p_period: period }), "Borçlar oluşturuldu, sakinlere bildirim gitti.").then((ok) => ok && data.reload())}>
                Borçları oluştur
              </button>
            </>
          )}
        </section>
      ) : (
        <>
          <section className="stats3">
            <div><span>Tahakkuk</span><b>{tl(totals.billed)}</b></div>
            <div><span>Tahsil edilen</span><b className="pos">{tl(totals.paid)}</b></div>
            <div><span>Kalan</span><b className={totals.left > 0 ? "neg" : ""}>{tl(totals.left)}</b></div>
          </section>
          <div className="row-between">
            <Segmented value={filter} onChange={setFilter} options={[["all", "Tümü"], ["open", "Ödenmeyen"], ["paid", "Ödenen"]]} />
          </div>
          <ul className="list">
            {list.map((c) => (
              <li key={c.id}>
                <button className="rowbtn" onClick={() => setSel(c)}>
                  <div className="row-main"><b>{c.unit_label}</b><span className="muted small">{tl(c.amount)} · son gün {dateTR(c.due_date)}</span></div>
                  <div className="row-side">
                    <Badge s={c.status} />
                    {c.status !== "paid" && <span className="small">{tl(c.remaining)} kaldı</span>}
                    {Number(c.pending) > 0 && <span className="chip chip-warn">dekont bekliyor</span>}
                  </div>
                </button>
              </li>
            ))}
            {list.length === 0 && <Empty title="Bu filtrede kayıt yok" />}
          </ul>
          <section className="card stack">
            <h2>Hatırlatma</h2>
            <p className="muted small">Borcu devam eden dairelere bildirim gider. Ödemesini tamamlayanlar ve dekontu inceleme bekleyenler atlanır.</p>
            <button className="btn btn-ghost" disabled={busy} onClick={async () => {
              const n = await run(() => rpc<number>("send_dues_reminder", { p_building: bid }));
              if (n !== undefined) toast(n === 0 ? "Hatırlatılacak borçlu daire yok." : `${n} kişiye hatırlatma gönderildi.`);
            }}>Şimdi hatırlatma gönder</button>
            <ReminderSettings bid={bid} s={d!.settings} onSaved={data.reload} />
          </section>
          <button className="linkbtn danger" onClick={() => setCancelOpen(true)}>Bu ayın aidat dönemini iptal et</button>
        </>
      )}

      <ChargeSheet charge={sel} onClose={() => setSel(null)} onChanged={() => { data.reload(); }} />
      <ReasonSheet open={cancelOpen} onClose={() => setCancelOpen(false)} title="Dönemi iptal et" confirm="Dönemi iptal et"
        desc={`${periodName(period)} için oluşturulan tüm borçlar iptal edilir. Kayıtlı ödeme varsa önce onları iptal etmelisin.`}
        onSubmit={(r) => run(() => rpc("cancel_dues_period", { p_period_id: d?.periodRow?.id, p_reason: r }), "Dönem iptal edildi.").then((ok) => { if (ok) data.reload(); return ok; })} />
    </div>
  );
}

function ReminderSettings({ bid, s, onSaved }: { bid: string; s: any; onSaved: () => void }) {
  const [en, setEn] = useState<boolean>(!!s?.reminder_enabled);
  const [day, setDay] = useState(String(s?.reminder_day ?? 5));
  const [hour, setHour] = useState(String(s?.reminder_hour ?? 10));
  const { busy, run } = useAction();
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); run(() => rpc("set_reminder_settings", { p_building: bid, p_enabled: en, p_day: parseInt(day), p_hour: parseInt(hour) }), "Hatırlatma ayarı kaydedildi.").then((ok) => ok && onSaved()); }}>
      <label className="switch"><input id="remind-on" type="checkbox" checked={en} onChange={(e) => setEn(e.target.checked)} /><span>Otomatik aylık hatırlatma</span></label>
      {en && (
        <div className="grid2">
          <Field label="Ayın kaçında"><select id="remind-day" value={day} onChange={(e) => setDay(e.target.value)}>{Array.from({ length: 28 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></Field>
          <Field label="Saat"><select id="remind-hour" value={hour} onChange={(e) => setHour(e.target.value)}>{Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>)}</select></Field>
        </div>
      )}
      <button className="btn btn-ghost btn-sm" disabled={busy}>Ayarı kaydet</button>
    </form>
  );
}

function ChargeSheet({ charge, onClose, onChanged }: { charge: Charge | null; onClose: () => void; onChanged: () => void }) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(istanbulToday());
  const [method, setMethod] = useState<"cash" | "bank">("bank");
  const [note, setNote] = useState("");
  const [voidP, setVoidP] = useState<Payment | null>(null);
  const { busy, run } = useAction();
  const pays = useLoad(async () => charge ? from<Payment>("payments").eq("charge_id", charge.id).order("created_at", false) : [], [charge?.id]);
  const [cur, setCur] = useState<Charge | null>(null);
  React.useEffect(() => { setCur(charge); setAmount(charge ? String(Number(charge.remaining)) : ""); setNote(""); setDate(istanbulToday()); }, [charge]);
  const refreshCharge = async () => {
    if (!charge) return;
    const r = await from<Charge>("charge_status").eq("id", charge.id);
    setCur(r[0]); setAmount(String(Number(r[0]?.remaining || 0))); pays.reload(); onChanged();
  };
  const c = cur;
  return (
    <Sheet open={!!charge} onClose={onClose} title={c ? `${c.unit_label} · ${periodName(c.period)}` : ""}>
      {c && (
        <div className="stack">
          <div className="kvs">
            <div className="kv"><span>Borç</span><b>{tl(c.amount)}</b></div>
            <div className="kv"><span>Ödenen</span><b>{tl(c.paid)}</b></div>
            <div className="kv"><span>Kalan</span><b>{tl(c.remaining)}</b></div>
            <div className="kv"><span>Durum</span><Badge s={c.status} /></div>
          </div>
          {Number(c.pending) > 0 && <p className="note-warn">Bu borç için {tl(c.pending)} tutarında inceleme bekleyen dekont var. <b>Ödeme bildirimleri</b> bölümünden onaylayabilirsin.</p>}
          {c.status !== "paid" && (
            <form className="stack card-inset" onSubmit={async (e) => {
              e.preventDefault();
              const v = parseAmount(amount);
              if (await run(() => rpc("record_payment", { p_charge: c.id, p_amount: v, p_paid_on: date, p_method: method, p_note: note }), "Ödeme kaydedildi.")) await refreshCharge();
            }}>
              <h3>Ödeme kaydet</h3>
              <div className="grid2">
                <Field label="Alınan tutar (TL)"><input id="pay-amount" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
                <Field label="Tarih"><input id="pay-date" type="date" required max={istanbulToday()} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
              </div>
              <Segmented value={method} onChange={setMethod} options={[["bank", "Banka"], ["cash", "Nakit"]]} />
              <Field label="Not (isteğe bağlı)"><input id="pay-note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
              <p className="muted small">Bu işlem aldığın parayı kaydeder; uygulama para çekmez. Kalan borçtan az girersen <b>Kısmi ödendi</b> olur.</p>
              <button className="btn btn-primary" disabled={busy}>Ödemeyi kaydet</button>
            </form>
          )}
          <h3>Ödeme geçmişi</h3>
          {pays.loading && !pays.data ? <Loading /> : (pays.data || []).length === 0 ? <p className="muted small">Henüz ödeme yok.</p> : (
            <ul className="list compact">
              {pays.data!.map((p) => (
                <li key={p.id} className={p.voided_at ? "voided" : ""}>
                  <div className="row-main"><b>{tl(p.amount)}</b><span className="muted small">{dateTR(p.paid_on)} · {p.method === "cash" ? "Nakit" : "Banka"}{p.notice_id ? " · dekontla" : ""}</span>
                    {p.voided_at && <span className="small neg">İptal: {p.void_reason}</span>}</div>
                  {!p.voided_at && <button className="linkbtn danger" onClick={() => setVoidP(p)}>Kaydı iptal et</button>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <ReasonSheet open={!!voidP} onClose={() => setVoidP(null)} title="Ödeme kaydını iptal et" confirm="Kaydı iptal et"
        desc={voidP ? `${tl(voidP.amount)} tutarındaki ödeme iptal edilir, borç tekrar açılır ve kasadan düşer. Kayıt silinmez, geçmişte görünür.` : ""}
        onSubmit={(r) => run(() => rpc("void_payment", { p_payment: voidP!.id, p_reason: r }), "Ödeme kaydı iptal edildi.").then(async (ok) => { if (ok) await refreshCharge(); return ok; })} />
    </Sheet>
  );
}

// ===================== Sakin =====================
function ResidentDues() {
  const { b, userId } = useApp();
  const bid = b!.building_id;
  const [sel, setSel] = useState<Charge | null>(null);
  const data = useLoad(async () => {
    const [charges, notices, pays] = await Promise.all([
      from<Charge>("charge_status").eq("building_id", bid).isNull("cancelled_at").order("period", false).limit(36),
      from<Notice>("payment_notices").eq("building_id", bid).order("created_at", false).limit(30),
      from<Payment>("payments").eq("building_id", bid).isNull("voided_at").order("paid_on", false).limit(30),
    ]);
    return { charges, notices, pays };
  }, [bid]);
  if (!b!.unit_id) return (
    <div className="page"><PageHead title="Aidatlarım" />
      <Empty title="Henüz bir daireye bağlı değilsin">Yöneticiden kendi dairen için davet bağlantısı iste.</Empty></div>
  );
  const d = data.data;
  const open = (d?.charges || []).filter((c) => c.status === "unpaid" || c.status === "partial");
  const debt = open.reduce((s, c) => s + Number(c.remaining), 0);
  const periodOf = (cid: string) => d?.charges.find((c) => c.id === cid)?.period;
  return (
    <div className="page">
      <PageHead title="Aidatlarım" sub={b!.unit_label} />
      {data.loading && !d ? <Loading /> : data.error ? <ErrorBox msg={data.error} retry={data.reload} /> : (
        <>
          <section className={"hero-debt " + (debt > 0 ? "has" : "none")}>
            <span>{debt > 0 ? "Ödenmemiş borcun" : "Borcun yok"}</span>
            <b>{tl(debt)}</b>
            {debt > 0 && <small>Parayı banka hesabına gönderdikten sonra dekontunu buradan bildir. Yönetici onaylayınca borcun düşer.</small>}
          </section>
          <h2 className="h-sec">Borçlar</h2>
          <ul className="list">
            {d!.charges.map((c) => (
              <li key={c.id}>
                <div className="row-main"><b>{periodName(c.period)}</b><span className="muted small">{tl(c.amount)} · son gün {dateTR(c.due_date)}</span>
                  {Number(c.pending) > 0 && <span className="chip chip-warn">{tl(c.pending)} inceleniyor</span>}</div>
                <div className="row-side">
                  <Badge s={c.status} />
                  {(c.status === "unpaid" || c.status === "partial") && Number(c.remaining) - Number(c.pending) > 0 &&
                    <button className="btn btn-primary btn-sm" onClick={() => setSel(c)}>Ödeme bildir</button>}
                </div>
              </li>
            ))}
            {d!.charges.length === 0 && <Empty title="Henüz aidat borcu oluşturulmadı" />}
          </ul>
          {d!.notices.length > 0 && <>
            <h2 className="h-sec">Ödeme bildirimlerim</h2>
            <ul className="list compact">
              {d!.notices.map((n) => (
                <li key={n.id}>
                  <div className="row-main"><b>{tl(n.amount)}</b><span className="muted small">{periodOf(n.charge_id) ? periodName(periodOf(n.charge_id)!) + " · " : ""}{dateTR(n.paid_on)}</span>
                    {n.status === "rejected" && n.reject_reason && <span className="small neg">Gerekçe: {n.reject_reason}</span>}</div>
                  <Badge s={n.status} />
                </li>
              ))}
            </ul>
          </>}
          {d!.pays.length > 0 && <>
            <h2 className="h-sec">Ödemelerim</h2>
            <ul className="list compact">
              {d!.pays.map((p) => (
                <li key={p.id}><div className="row-main"><b>{tl(p.amount)}</b><span className="muted small">{periodOf(p.charge_id) ? periodName(periodOf(p.charge_id)!) + " · " : ""}{dateTR(p.paid_on)}</span></div><Money v={p.amount} sign="in" /></li>
              ))}
            </ul>
          </>}
        </>
      )}
      <NoticeSheet charge={sel} bid={bid} onClose={() => setSel(null)} onDone={() => { setSel(null); data.reload(); }} />
    </div>
  );
}

function NoticeSheet({ charge, bid, onClose, onDone }: { charge: Charge | null; bid: string; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(istanbulToday());
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const { busy, run } = useAction();
  const max = charge ? Number(charge.remaining) - Number(charge.pending) : 0;
  React.useEffect(() => { if (charge) { setAmount(String(max)); setFile(null); setNote(""); setDate(istanbulToday()); } }, [charge]);
  return (
    <Sheet open={!!charge} onClose={onClose} title="Ödeme bildir">
      {charge && (
        <form className="stack" onSubmit={async (e) => {
          e.preventDefault();
          const ok = await run(async () => {
            const path = file ? await upload(bid, file) : null;
            return rpc("submit_payment_notice", { p_charge: charge.id, p_amount: parseAmount(amount), p_paid_on: date, p_receipt_path: path, p_note: note });
          }, "Bildirimin yöneticiye gönderildi.");
          if (ok) onDone();
        }}>
          <p className="muted">{periodName(charge.period)} aidatı · bildirebileceğin en fazla tutar <b>{tl(max)}</b></p>
          <div className="grid2">
            <Field label="Gönderdiğin tutar (TL)"><input id="n-amount" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
            <Field label="Ödeme tarihi"><input id="n-date" type="date" required max={istanbulToday()} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          </div>
          <Field label="Dekont"><FilePick id="n-file" file={file} onFile={setFile} label="Dekont ekle" /></Field>
          <Field label="Not (isteğe bağlı)"><input id="n-note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Örn. Ekim aidatı" /></Field>
          <p className="muted small">Yönetici paranın hesaba geldiğini kontrol edip onaylayınca borcun düşer. Dekontu yalnızca sen ve yönetici görebilir.</p>
          <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? "Gönderiliyor…" : "Bildirimi gönder"}</button>
        </form>
      )}
    </Sheet>
  );
}

// ===================== Yönetici: ödeme bildirimleri =====================
export function Notices() {
  const { b } = useApp();
  const bid = b!.building_id;
  const toast = useToast();
  const [tab, setTab] = useState<"pending" | "done">("pending");
  const [rej, setRej] = useState<Notice | null>(null);
  const [approve, setApprove] = useState<Notice | null>(null);
  const { busy, run } = useAction();
  const data = useLoad(async () => {
    const q = from<Notice>("payment_notices").eq("building_id", bid);
    const notices = await (tab === "pending" ? q.eq("status", "pending").order("created_at") : q.neq("status", "pending").order("reviewed_at", false).limit(50));
    const ids = [...new Set(notices.map((n) => n.submitted_by))];
    const cids = [...new Set(notices.map((n) => n.charge_id))];
    const [profiles, charges] = await Promise.all([
      ids.length ? from("profiles", "id,full_name").in("id", ids) : [],
      cids.length ? from<Charge>("charge_status").in("id", cids) : [],
    ]);
    return { notices, names: Object.fromEntries((profiles as any[]).map((p) => [p.id, p.full_name])), charges: Object.fromEntries(charges.map((c) => [c.id, c])) };
  }, [bid, tab]);
  const d = data.data;
  return (
    <div className="page">
      <PageHead title="Ödeme bildirimleri" sub="Sakinlerin gönderdiği dekontlar" />
      <Segmented value={tab} onChange={setTab} options={[["pending", "Onay bekleyen"], ["done", "Sonuçlananlar"]]} />
      {data.loading && !d ? <Loading /> : data.error ? <ErrorBox msg={data.error} retry={data.reload} /> : d!.notices.length === 0 ? (
        <Empty title={tab === "pending" ? "Onay bekleyen bildirim yok" : "Henüz sonuçlanan bildirim yok"}>{tab === "pending" ? "Sakin dekont gönderdiğinde burada ve telefonunda bildirim olarak görünür." : undefined}</Empty>
      ) : (
        <ul className="list">
          {d!.notices.map((n) => {
            const c = d!.charges[n.charge_id];
            return (
              <li key={n.id} className="notice">
                <div className="row-main">
                  <b>{c?.unit_label} · {tl(n.amount)}</b>
                  <span className="muted small">{d!.names[n.submitted_by] || "Sakin"} · {c ? periodName(c.period) : ""} · ödeme {dateTR(n.paid_on)}</span>
                  {n.note && <span className="small">“{n.note}”</span>}
                  {c && n.status === "pending" && <span className="small muted">Kalan borç {tl(c.remaining)}</span>}
                  {n.status === "rejected" && <span className="small neg">Ret: {n.reject_reason}</span>}
                </div>
                <div className="row-actions">
                  {n.receipt_path ? <button className="btn btn-ghost btn-sm" onClick={() => openFile(n.receipt_path!, toast)}>Dekontu aç</button> : <span className="small muted">Dekont yok</span>}
                  {n.status === "pending" ? <>
                    <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => setApprove(n)}>Onayla</button>
                    <button className="btn btn-ghost btn-sm danger" onClick={() => setRej(n)}>Reddet</button>
                  </> : <Badge s={n.status} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <ApproveSheet n={approve} onClose={() => setApprove(null)} onDone={() => { setApprove(null); data.reload(); }} />
      <ReasonSheet open={!!rej} onClose={() => setRej(null)} title="Bildirimi reddet" confirm="Reddet"
        desc="Borç ve kasa değişmez. Sakin gerekçeyi bildirim olarak görür."
        onSubmit={(r) => run(() => rpc("reject_payment_notice", { p_notice: rej!.id, p_reason: r }), "Bildirim reddedildi.").then((ok) => { if (ok) data.reload(); return ok; })} />
    </div>
  );
}

function ApproveSheet({ n, onClose, onDone }: { n: Notice | null; onClose: () => void; onDone: () => void }) {
  const [method, setMethod] = useState<"bank" | "cash">("bank");
  const { busy, run } = useAction();
  return (
    <Sheet open={!!n} onClose={onClose} title="Ödemeyi onayla">
      {n && <div className="stack">
        <p><b>{tl(n.amount)}</b> tutarındaki ödemenin hesaba geldiğini kontrol ettin mi? Onaylayınca borç düşer ve tutar kasaya gelir olarak yazılır.</p>
        <Segmented value={method} onChange={setMethod} options={[["bank", "Bankaya geldi"], ["cash", "Elden alındı"]]} />
        <button className="btn btn-primary btn-lg" disabled={busy} onClick={async () => { if (await run(() => rpc("approve_payment_notice", { p_notice: n.id, p_method: method }), "Ödeme onaylandı.")) onDone(); }}>Onayla</button>
      </div>}
    </Sheet>
  );
}

