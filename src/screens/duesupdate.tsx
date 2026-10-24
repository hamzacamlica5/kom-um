// Aidat güncelleme (zam) ve herkese açık aidat geçmişi.
// Yeni tutarlar henüz oluşturulmamış ilk aydan geçerli olur; oluşmuş borçlar değişmez.
import React, { useMemo, useState } from "react";
import { from, rpc } from "../lib/sb";
import { tl, periodName, dateTR, parseAmount, istanbulToday } from "../lib/format";
import { Field, Loading, Segmented, Sheet, useAction, useLoad } from "../ui";

type Unit = { id: string; label: string; monthly_dues: number };
type Mode = "percent" | "add" | "set";
type Item = { unit_id: string; label: string; old: number; new: number };
export type DuesChange = { id: string; mode: Mode; value: number; effective_period: string; decision_date: string | null; note: string | null; items: Item[]; created_at: string };

const MODES: [Mode, string][] = [["percent", "Yüzde zam"], ["add", "Tutar ekle"], ["set", "Yeni tutar"]];

// Sunucudaki update_dues ile aynı hesap (ön izleme için)
function newAmount(mode: Mode, v: number, old: number) {
  if (mode === "set") return Math.round(v * 100) / 100;
  if (mode === "percent") return Math.round(old * (1 + v / 100));
  return Math.round((old + v) * 100) / 100;
}

export function DuesUpdateSheet({ open, bid, units, onClose, onDone }: { open: boolean; bid: string; units: Unit[]; onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState<Mode>("percent");
  const [val, setVal] = useState("");
  const [scope, setScope] = useState<"all" | "some">("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [decision, setDecision] = useState("");
  const [note, setNote] = useState("");
  const [announce, setAnnounce] = useState(true);
  const { busy, run } = useAction();
  const eff = useLoad(async () => (open ? rpc<string>("next_dues_period", { p_building: bid }) : ""), [open, bid]);

  const v = mode === "percent" ? Number(val.replace(",", ".")) : parseAmount(val) ?? NaN;
  const target = scope === "all" ? units.filter((u) => Number(u.monthly_dues) > 0) : units.filter((u) => picked.has(u.id));
  const rows = useMemo(() => Number.isFinite(v) && v !== 0
    ? target.map((u) => ({ u, old: Number(u.monthly_dues), nw: newAmount(mode, v, Number(u.monthly_dues)) })).filter((r) => r.nw !== r.old)
    : [], [mode, v, scope, picked, units]);
  const bad = rows.some((r) => r.nw < 0);
  const reset = () => { setVal(""); setNote(""); setDecision(""); setPicked(new Set()); setScope("all"); setAnnounce(true); setMode("percent"); };

  return (
    <Sheet open={open} onClose={onClose} title="Aidatları güncelle">
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault();
        const n = await run(() => rpc<number>("update_dues", {
          p_building: bid, p_mode: mode, p_value: v, p_units: scope === "all" ? null : [...picked],
          p_decision_date: decision || null, p_note: note.trim() || null, p_announce: announce,
        }), announce ? "Aidatlar güncellendi, sakinlere duyuru gitti." : "Aidatlar güncellendi.");
        if (n) { reset(); onDone(); onClose(); }
      }}>
        {eff.loading ? <Loading /> : eff.data && (
          <p className="note-info">Yeni tutarlar <b>{periodName(eff.data)}</b> aidatlarından itibaren geçerli olur. Daha önce oluşturulmuş borçlar değişmez.</p>
        )}
        <Segmented value={mode} options={MODES} onChange={(m) => { setMode(m); setVal(""); }} />
        <Field label={mode === "percent" ? "Artış oranı (%)" : mode === "add" ? "Her daireye eklenecek tutar (TL)" : "Yeni aylık aidat (TL)"}
          hint={mode === "percent" ? "Tutarlar tam liraya yuvarlanır. İndirim için eksi yaz (ör. -10)." : mode === "add" ? "Azaltmak için eksi yaz (ör. -100)." : undefined}>
          <input id="du-val" inputMode="decimal" required value={val} onChange={(e) => setVal(e.target.value)} placeholder={mode === "percent" ? "20" : mode === "add" ? "250" : "1750"} />
        </Field>
        <Segmented value={scope} options={[["all", "Aidatlı tüm daireler"], ["some", "Seçtiğim daireler"]]} onChange={setScope} />
        {scope === "some" && (
          <ul className="list compact pick-list">
            {units.map((u) => (
              <li key={u.id}><label className="check-row">
                <input type="checkbox" checked={picked.has(u.id)} onChange={(e) => { const s = new Set(picked); e.target.checked ? s.add(u.id) : s.delete(u.id); setPicked(s); }} />
                <span>{u.label}</span><span className="muted small">{Number(u.monthly_dues) > 0 ? tl(u.monthly_dues) : "Aidatsız"}</span>
              </label></li>
            ))}
          </ul>
        )}
        <Field label="Kat malikleri kurulu karar tarihi (isteğe bağlı)" hint="634 sayılı Kat Mülkiyeti Kanunu'na göre aidat, kat malikleri kurulunca belirlenir. Tarihi yazarsan duyuruda ve geçmişte görünür.">
          <input id="du-date" type="date" max={istanbulToday()} value={decision} onChange={(e) => setDecision(e.target.value)} />
        </Field>
        <Field label="Açıklama (isteğe bağlı)" hint="Örneğin zammın nedeni: asansör revizyonu, temizlik ücretindeki artış.">
          <textarea id="du-note" maxLength={500} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <label className="check-row"><input type="checkbox" checked={announce} onChange={(e) => setAnnounce(e.target.checked)} /><span>Sakinlere duyuru olarak bildir</span></label>

        {rows.length > 0 && (
          <div className="preview">
            <b>Ön izleme · {rows.length} daire</b>
            <ul className="list compact">
              {rows.map((r) => (
                <li key={r.u.id}><div className="row-main"><span>{r.u.label}</span></div>
                  <div className="row-side"><span className="small muted">{tl(r.old)}</span><span className={"small" + (r.nw < 0 ? " neg" : "")}><b>{tl(r.nw)}</b></span></div></li>
              ))}
            </ul>
          </div>
        )}
        {bad && <p className="note-warn">Bazı dairelerin aidatı sıfırın altına düşüyor. Tutarı kontrol et.</p>}
        <button className="btn btn-primary btn-lg" disabled={busy || rows.length === 0 || bad}>
          {busy ? "Güncelleniyor…" : rows.length ? `${rows.length} dairenin aidatını güncelle` : "Aidatları güncelle"}
        </button>
      </form>
    </Sheet>
  );
}

function describe(c: DuesChange, unitId?: string | null) {
  const mine = unitId ? c.items.find((i) => i.unit_id === unitId) : null;
  if (mine) return `${tl(mine.old)} → ${tl(mine.new)}`;
  if (c.mode === "percent") return `%${Math.abs(Number(c.value)).toLocaleString("tr-TR")} ${Number(c.value) > 0 ? "artış" : "indirim"} · ${c.items.length} daire`;
  if (c.mode === "add") return `${Number(c.value) > 0 ? "+" : "−"}${tl(Math.abs(Number(c.value)))} · ${c.items.length} daire`;
  return `Yeni tutar ${tl(c.value)} · ${c.items.length} daire`;
}

// Aidat geçmişi: yönetici tüm değişiklikleri, sakin kendi dairesini etkileyenleri görür.
export function DuesHistory({ bid, unitId, reloadKey = 0 }: { bid: string; unitId?: string | null; reloadKey?: number }) {
  const data = useLoad(() => from<DuesChange>("dues_changes").eq("building_id", bid).order("created_at", false).limit(20), [bid, reloadKey]);
  const list = (data.data || []).filter((c) => !unitId || c.items.some((i) => i.unit_id === unitId));
  if (!list.length) return null;
  return (
    <>
      <h2 className="h-sec">Aidat geçmişi</h2>
      <ul className="list compact">
        {list.map((c) => (
          <li key={c.id}>
            <div className="row-main"><b>{periodName(c.effective_period)} aidatlarından itibaren</b>
              <span className="muted small">{describe(c, unitId)}{c.decision_date ? ` · kurul kararı ${dateTR(c.decision_date)}` : ""}</span>
              {c.note && <span className="small">{c.note}</span>}</div>
            <div className="row-side"><span className="small muted">{dateTR(c.created_at)}</span></div>
          </li>
        ))}
      </ul>
    </>
  );
}
