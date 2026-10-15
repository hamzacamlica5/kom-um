import React, { useEffect, useState } from "react";
import { from, rpc } from "../lib/sb";
import { dateTimeTR } from "../lib/format";
import { useApp } from "../state";
import { ErrorBox, Field, Loading, Sheet, useAction, useLoad } from "../ui";

// 2021'den beri polis, jandarma, itfaiye, AFAD, orman yangını ve sahil güvenlik 112'de birleşik.
export const NUMBERS: { no: string; title: string; sub: string }[] = [
  { no: "186", title: "Elektrik arıza", sub: "Kesinti, kopan kablo, sayaç arızası" },
  { no: "187", title: "Doğalgaz acil", sub: "Gaz kokusu, gaz kaçağı" },
  { no: "185", title: "Su ve kanalizasyon arızası", sub: "Patlak boru, taşkın, kanal tıkanması (belediye su idaresi)" },
];

type Info = { water_valve: string | null; electric_panel: string | null; gas_valve: string | null; elevator_company: string | null; elevator_phone: string | null;
  caretaker_name: string | null; caretaker_phone: string | null; gathering_area: string | null; notes: string | null; updated_at: string };

const tel = (p: string) => "tel:" + p.replace(/[^\d+]/g, "");

function Call({ no, title, sub, big }: { no: string; title: string; sub?: string; big?: boolean }) {
  return (
    <a href={tel(no)} className={"call" + (big ? " call-big" : "")}>
      <span className="call-no">{no}</span>
      <span className="call-text"><b>{title}</b>{sub && <small>{sub}</small>}</span>
      <span className="call-go" aria-hidden="true">Ara</span>
    </a>
  );
}

export function Emergency() {
  const { b, isManager } = useApp();
  const bid = b!.building_id;
  const [edit, setEdit] = useState(false);
  const data = useLoad(async () => {
    const key = "komsum.emerg." + bid;
    try {
      const [info, managers] = await Promise.all([
        from<Info>("building_emergency").eq("building_id", bid).limit(1),
        rpc<{ full_name: string; phone: string | null }[]>("building_managers", { p_building: bid }),
      ]);
      const out = { info: info[0] || null, managers, offline: false };
      try { localStorage.setItem(key, JSON.stringify(out)); } catch {}
      return out;
    } catch (e) {
      // İnternet yoksa son kaydedilen bilgileri göster
      let cached: any = null;
      try { cached = JSON.parse(localStorage.getItem(key) || "null"); } catch {}
      if (cached) return { ...cached, offline: true };
      throw e;
    }
  }, [bid]);
  const i = data.data?.info;
  const places: [string, string | null | undefined][] = [
    ["Ana su vanası", i?.water_valve], ["Elektrik panosu", i?.electric_panel], ["Doğalgaz vanası", i?.gas_valve], ["Toplanma alanı", i?.gathering_area],
  ];
  const hasAny = !!i && (places.some(([, v]) => v) || i.elevator_phone || i.caretaker_phone || i.notes);

  return (
    <div className="page">
      <header className="pagehead"><div className="pagehead-text"><h1>Acil durum</h1><p className="muted">{b!.name}</p></div></header>

      <section className="emer-112">
        <p className="emer-warn">Hayati tehlike, yangın, yaralanma, suç ya da afet durumunda hemen 112'yi ara.</p>
        <Call no="112" title="Acil Çağrı Merkezi" sub="Ambulans, itfaiye, polis, jandarma, AFAD" big />
      </section>

      <h2 className="h-sec">Arıza hatları</h2>
      <div className="calls">{NUMBERS.map((n) => <Call key={n.no} {...n} />)}</div>

      <div className="row-between"><h2 className="h-sec">Binamız</h2>{isManager && <button className="btn btn-ghost btn-sm" onClick={() => setEdit(true)}>{hasAny ? "Düzenle" : "Doldur"}</button>}</div>
      {data.loading && !data.data ? <Loading /> : data.error ? <ErrorBox msg={data.error} retry={data.reload} /> : (
        <>
          {!hasAny && (
            <p className="note-info">{isManager
              ? "Su vanası, elektrik panosu, asansör firmasının acil hattı ve toplanma alanını bir kez yaz; acil bir anda herkes buradan bulsun."
              : "Yönetici henüz binanın acil durum bilgilerini girmedi."}</p>
          )}
          <div className="calls">
            {data.data!.managers.filter((m) => m.phone).map((m) => <Call key={m.full_name} no={m.phone!} title={m.full_name} sub="Yönetici" />)}
            {i?.caretaker_phone && <Call no={i.caretaker_phone} title={i.caretaker_name || "Kapıcı / görevli"} sub="Kapıcı / bina görevlisi" />}
            {i?.elevator_phone && <Call no={i.elevator_phone} title={i.elevator_company || "Asansör firması"} sub="Asansör acil hattı (asansörde kalınırsa)" />}
          </div>
          {places.some(([, v]) => v) && (
            <ul className="list compact places">
              {places.filter(([, v]) => v).map(([k, v]) => <li key={k}><div className="row-main"><span className="eyebrow">{k}</span><b className="prewrap">{v}</b></div></li>)}
            </ul>
          )}
          {i?.notes && <div className="card"><span className="eyebrow">Notlar</span><p className="prewrap">{i.notes}</p></div>}
          <a className="linkbtn" href="https://www.turkiye.gov.tr/afet-ve-acil-durum-yonetimi-acil-toplanma-alani-sorgulama" target="_blank" rel="noopener">AFAD toplanma alanını e-Devlet'te sorgula ↗</a>
          {data.data!.offline && <p className="note-warn">İnternet bağlantısı yok; en son kaydedilen bilgiler gösteriliyor.</p>}
          {i?.updated_at && <p className="small muted">Bina bilgileri son güncelleme: {dateTimeTR(i.updated_at)}</p>}
        </>
      )}
      <p className="small muted">Bu ekran internet olmadan da açılır; arama düğmeleri telefonunun arama ekranını açar. KOMŞUM acil çağrı hizmeti değildir.</p>
      <EditSheet open={edit} bid={bid} info={i || null} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); data.reload(); }} />
    </div>
  );
}

const FIELDS: [keyof Info, string, string, boolean?][] = [
  ["water_valve", "Ana su vanası nerede?", "Örn. Bodrum kat, kazan dairesi kapısının solu", true],
  ["electric_panel", "Elektrik panosu nerede?", "Örn. Giriş kat, merdiven altı", true],
  ["gas_valve", "Doğalgaz ana vanası nerede?", "Örn. Bina dışı, sağ köşe", true],
  ["elevator_company", "Asansör firması", "Örn. ABC Asansör"],
  ["elevator_phone", "Asansör 7/24 acil hattı", "0212 …"],
  ["caretaker_name", "Kapıcı / görevli adı", ""],
  ["caretaker_phone", "Kapıcı / görevli telefonu", "05xx …"],
  ["gathering_area", "En yakın toplanma alanı", "Örn. Moda Parkı, deniz tarafındaki giriş", true],
  ["notes", "Diğer notlar", "Örn. Yangın tüpleri her katta merdiven başında. Sığınak anahtarı kapıcıda.", true],
];

function EditSheet({ open, bid, info, onClose, onSaved }: { open: boolean; bid: string; info: Info | null; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<Record<string, string>>({});
  const { busy, run } = useAction();
  useEffect(() => { if (open) setV(Object.fromEntries(FIELDS.map(([k]) => [k, (info?.[k] as string) || ""]))); }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title="Binanın acil durum bilgileri">
      <form className="stack" onSubmit={async (e) => { e.preventDefault(); if (await run(() => rpc("save_emergency_info", { p_building: bid, p_info: v }), "Acil durum bilgileri kaydedildi.")) onSaved(); }}>
        <p className="muted small">Tüm sakinler bu bilgileri görür. Yöneticinin telefonu, profilinde yazılıysa otomatik eklenir.</p>
        {FIELDS.map(([k, label, ph, long]) => (
          <Field key={k} label={label}>
            {long ? <textarea id={"em-" + k} rows={k === "notes" ? 3 : 2} maxLength={k === "notes" ? 2000 : 300} value={v[k] || ""} placeholder={ph} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
              : <input id={"em-" + k} type={k.endsWith("phone") ? "tel" : "text"} maxLength={k.endsWith("phone") ? 30 : 120} value={v[k] || ""} placeholder={ph} onChange={(e) => setV({ ...v, [k]: e.target.value })} />}
          </Field>
        ))}
        <button className="btn btn-primary btn-lg" disabled={busy}>Kaydet</button>
      </form>
    </Sheet>
  );
}
