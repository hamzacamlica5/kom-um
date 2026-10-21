import React, { useMemo, useState } from "react";
import { from, rpc, upload } from "../lib/sb";
import { tl, dateTR, istanbulToday, parseAmount, dateTimeTR } from "../lib/format";
import { useApp } from "../state";
import { Empty, ErrorBox, Field, FilePick, Loading, Money, PageHead, ReasonSheet, Segmented, Sheet, useAction, useLoad, useToast } from "../ui";
import { openFile } from "./dues";

type Row = { id: string; source: string; direction: "in" | "out"; amount: number; effective_on: string; description: string; actor: string; created_at: string; voided_at: string | null; void_reason: string | null; reverses_id: string | null };

const SOURCE_LABEL: Record<string, string> = {
  payment: "Aidat", expense: "Gider", cash_opening: "Başlangıç bakiyesi", cash_manual: "Kasa hareketi", cash_reversal: "Düzeltme",
};
export const EXPENSE_CATS = ["Temizlik", "Elektrik", "Su", "Doğalgaz", "Asansör", "Bakım-onarım", "Bahçe", "Sigorta", "Personel", "Kırtasiye", "Diğer"];

export function Cash() {
  const { b, isManager } = useApp();
  const bid = b!.building_id;
  const toast = useToast();
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const [sheet, setSheet] = useState<null | "expense" | "entry" | "opening">(null);
  const [act, setAct] = useState<Row | null>(null);
  const { run } = useAction();

  const data = useLoad(async () => {
    const [rows, balance, expenses] = await Promise.all([
      from<Row>("ledger").eq("building_id", bid).order("effective_on", false).order("created_at", false).limit(300),
      rpc<number>("cash_balance", { p_building: bid }),
      from("expenses", "id,attachment_path").eq("building_id", bid).notNull("attachment_path"),
    ]);
    const ids = [...new Set(rows.map((r) => r.actor))];
    const names = ids.length ? await from("profiles", "id,full_name").in("id", ids) : [];
    return { rows, balance: Number(balance), att: Object.fromEntries((expenses as any[]).map((e) => [e.id, e.attachment_path])), names: Object.fromEntries((names as any[]).map((p) => [p.id, p.full_name])) };
  }, [bid]);
  const d = data.data;

  const reversed = useMemo(() => new Set((d?.rows || []).filter((r) => r.reverses_id).map((r) => r.reverses_id)), [d]);
  const rows = (d?.rows || []).filter((r) => filter === "all" || r.direction === filter);
  const hasOpening = (d?.rows || []).some((r) => r.source === "cash_opening" && !reversed.has(r.id));

  return (
    <div className="page">
      <PageHead title="Kasa ve giderler" sub="Her hareket kayıtlı. Hiçbir kayıt silinmez." />
      {data.loading && !d ? <Loading /> : data.error ? <ErrorBox msg={data.error} retry={data.reload} /> : (
        <>
          <section className="balance">
            <span>Güncel kasa (kasa + banka)</span>
            <b className={d!.balance < 0 ? "neg" : ""}>{tl(d!.balance)}</b>
            <small>Başlangıç bakiyesi + tahsilatlar + kasa girişleri − giderler − kasa çıkışları</small>
          </section>
          {isManager && (
            <div className="actions3">
              <button className="btn btn-primary" onClick={() => setSheet("expense")}>Gider ekle</button>
              <button className="btn btn-ghost" onClick={() => setSheet("entry")}>Para giriş / çıkış</button>
              <button className="btn btn-ghost" onClick={() => setSheet("opening")}>{hasOpening ? "Başlangıç bakiyesini düzelt" : "Başlangıç bakiyesi gir"}</button>
            </div>
          )}
          {isManager && !hasOpening && d!.rows.length < 3 && (
            <p className="note-info">Apartmanın kasasında Apartmanca'ya geçmeden önce para varsa <b>Başlangıç bakiyesi gir</b> ile ekle. Tutar, seçtiğin günün başındaki kasa + banka toplamı olmalı.</p>
          )}
          <h2 className="h-sec">Hesap hareketleri</h2>
          <Segmented value={filter} onChange={setFilter} options={[["all", "Tümü"], ["in", "Girişler"], ["out", "Çıkışlar"]]} />
          <ul className="list ledger">
            {rows.map((r) => {
              const dead = !!r.voided_at || reversed.has(r.id);
              return (
                <li key={r.source + r.id} className={dead ? "voided" : ""}>
                  <div className="row-main">
                    <span className="eyebrow">{SOURCE_LABEL[r.source] || r.source}</span>
                    <b className="desc">{r.description}</b>
                    <span className="muted small">{dateTR(r.effective_on)} · {d!.names[r.actor] || "Yönetici"} · kayıt {dateTimeTR(r.created_at)}</span>
                    {r.voided_at && <span className="small neg">İptal edildi: {r.void_reason}</span>}
                    {reversed.has(r.id) && <span className="small neg">Ters kayıtla düzeltildi</span>}
                    {r.source === "expense" && d!.att[r.id] && <button className="linkbtn small" onClick={() => openFile(d!.att[r.id], toast)}>Faturayı aç</button>}
                  </div>
                  <div className="row-side">
                    <Money v={r.amount} sign={r.direction} />
                    {isManager && !dead && (r.source === "expense" || r.source === "cash_manual" || r.source === "cash_opening") &&
                      <button className="linkbtn small" onClick={() => setAct(r)}>{r.source === "expense" ? "İptal et" : "Düzelt"}</button>}
                  </div>
                </li>
              );
            })}
            {rows.length === 0 && <Empty title="Henüz hareket yok">Aidat tahsilatları, giderler ve kasa hareketleri burada görünür.</Empty>}
          </ul>
        </>
      )}
      <ExpenseSheet open={sheet === "expense"} bid={bid} onClose={() => setSheet(null)} onDone={() => { setSheet(null); data.reload(); }} />
      <EntrySheet open={sheet === "entry"} bid={bid} onClose={() => setSheet(null)} onDone={() => { setSheet(null); data.reload(); }} />
      <OpeningSheet open={sheet === "opening"} bid={bid} hasOpening={hasOpening} onClose={() => setSheet(null)} onDone={() => { setSheet(null); data.reload(); }} />
      <ReasonSheet open={!!act} onClose={() => setAct(null)}
        title={act?.source === "expense" ? "Gideri iptal et" : "Ters kayıtla düzelt"}
        confirm={act?.source === "expense" ? "Gideri iptal et" : "Ters kayıt oluştur"}
        desc={act ? (act.source === "expense"
          ? `${tl(act.amount)} tutarındaki gider iptal edilir ve kasaya geri döner. Kayıt silinmez.`
          : `${tl(act.amount)} tutarında ters yönde bir düzeltme kaydı eklenir. Orijinal kayıt silinmez, ikisi de hareketlerde görünür.`) : ""}
        onSubmit={(r) => run(() => act!.source === "expense"
          ? rpc("void_expense", { p_expense: act!.id, p_reason: r })
          : act!.source === "cash_opening"
            ? rpc("set_opening_balance", { p_building: bid, p_amount: 0, p_effective_on: act!.effective_on, p_note: r })
            : rpc("reverse_cash_entry", { p_entry: act!.id, p_reason: r }), "Düzeltme kaydedildi.").then((ok) => { if (ok) data.reload(); return ok; })} />
    </div>
  );
}

function ExpenseSheet({ open, bid, onClose, onDone }: { open: boolean; bid: string; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ cat: "Temizlik", desc: "", vendor: "", amount: "", date: istanbulToday() });
  const [file, setFile] = useState<File | null>(null);
  const { busy, run } = useAction();
  React.useEffect(() => { if (open) { setF({ cat: "Temizlik", desc: "", vendor: "", amount: "", date: istanbulToday() }); setFile(null); } }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title="Gider ekle">
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault();
        if (await run(async () => {
          const path = file ? await upload(bid, file) : null;
          return rpc("add_expense", { p_building: bid, p_category: f.cat, p_description: f.desc, p_vendor: f.vendor, p_amount: parseAmount(f.amount), p_spent_on: f.date, p_attachment_path: path });
        }, "Gider kaydedildi.")) onDone();
      }}>
        <Field label="Kategori"><select id="e-cat" value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })}>{EXPENSE_CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Açıklama"><input id="e-desc" required maxLength={300} value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} placeholder="Örn. Ekim ayı merdiven temizliği" /></Field>
        <Field label="Firma / kişi (isteğe bağlı)"><input id="e-vendor" maxLength={80} value={f.vendor} onChange={(e) => setF({ ...f, vendor: e.target.value })} /></Field>
        <div className="grid2">
          <Field label="Tutar (TL)"><input id="e-amount" inputMode="decimal" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          <Field label="Tarih"><input id="e-date" type="date" required max={istanbulToday()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        </div>
        <Field label="Fatura / fiş (isteğe bağlı)" hint="Eklersen tüm sakinler görebilir."><FilePick id="e-file" file={file} onFile={setFile} label="Fatura ekle" /></Field>
        <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? "Kaydediliyor…" : "Gideri kaydet"}</button>
      </form>
    </Sheet>
  );
}

function EntrySheet({ open, bid, onClose, onDone }: { open: boolean; bid: string; onClose: () => void; onDone: () => void }) {
  const [dir, setDir] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(istanbulToday());
  const { busy, run } = useAction();
  React.useEffect(() => { if (open) { setAmount(""); setDesc(""); setDate(istanbulToday()); setDir("in"); } }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title="Kasaya para giriş / çıkış">
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => rpc("add_cash_entry", { p_building: bid, p_direction: dir, p_amount: parseAmount(amount), p_description: desc, p_effective_on: date }), "Kasa hareketi kaydedildi.")) onDone();
      }}>
        <p className="muted small">Aidat ve giderler kasayı zaten otomatik etkiler. Bunu devir, bağış, faiz, kasa farkı gibi ek işlemler için kullan. Hareket sakinlere de görünür ve silinemez; yanlışsa ters kayıtla düzeltilir.</p>
        <Segmented value={dir} onChange={setDir} options={[["in", "Para girişi"], ["out", "Para çıkışı"]]} />
        <div className="grid2">
          <Field label="Tutar (TL)"><input id="c-amount" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="İşlem tarihi"><input id="c-date" type="date" required max={istanbulToday()} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        <Field label="Açıklama (zorunlu)"><input id="c-desc" required minLength={3} maxLength={300} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Örn. Eski yönetimden devir" /></Field>
        <button className="btn btn-primary btn-lg" disabled={busy}>Kaydet</button>
      </form>
    </Sheet>
  );
}

function OpeningSheet({ open, bid, hasOpening, onClose, onDone }: { open: boolean; bid: string; hasOpening: boolean; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(istanbulToday());
  const [note, setNote] = useState("");
  const { busy, run } = useAction();
  React.useEffect(() => { if (open) { setAmount(""); setNote(""); setDate(istanbulToday()); } }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title={hasOpening ? "Başlangıç bakiyesini düzelt" : "Başlangıç bakiyesi"}>
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => rpc("set_opening_balance", { p_building: bid, p_amount: parseAmount(amount), p_effective_on: date, p_note: note }), "Başlangıç bakiyesi kaydedildi.")) onDone();
      }}>
        <p className="muted small">Apartmanca'yı kullanmaya başladığın gün kasada ve bankada toplam ne kadar para vardı? Bu tutar aidat tahsilatı sayılmaz; ilk hareket olarak görünür.</p>
        <div className="grid2">
          <Field label="Tutar (TL)"><input id="o-amount" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="Tarih"><input id="o-date" type="date" required max={istanbulToday()} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        <Field label={hasOpening ? "Düzeltme gerekçesi (zorunlu)" : "Not (isteğe bağlı)"}>
          <input id="o-note" required={hasOpening} minLength={hasOpening ? 3 : 0} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {hasOpening && <p className="note-info">Eski başlangıç kaydı silinmez; ters kayıtla kapatılır ve yeni tutar eklenir. Geçmiş korunur.</p>}
        <button className="btn btn-primary btn-lg" disabled={busy}>Kaydet</button>
      </form>
    </Sheet>
  );
}
