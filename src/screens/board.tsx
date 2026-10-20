import React, { useState } from "react";
import { config, from, rpc, serverPost, upload } from "../lib/sb";
import { ago, dateTimeTR, dateTR } from "../lib/format";
import { useApp } from "../state";
import { Badge, Empty, ErrorBox, Field, FilePick, Loading, PageHead, ReasonSheet, Segmented, Sheet, useAction, useLoad, useToast } from "../ui";
import { openFile } from "./dues";

// ===================== Duyurular =====================
type Ann = { id: string; title: string; body: string; created_at: string; archived_at: string | null; archive_reason: string | null };
export function Announcements() {
  const { b, isManager } = useApp();
  const bid = b!.building_id;
  const [open, setOpen] = useState(false);
  const [arch, setArch] = useState<Ann | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const { busy, run } = useAction();
  const [t, setT] = useState(""); const [body, setBody] = useState("");
  const data = useLoad(() => from<Ann>("announcements").eq("building_id", bid).order("created_at", false).limit(100), [bid]);
  const list = (data.data || []).filter((a) => showArchived ? a.archived_at : !a.archived_at);
  return (
    <div className="page">
      <PageHead title="Duyurular" action={isManager && <button className="btn btn-primary btn-sm" onClick={() => { setT(""); setBody(""); setOpen(true); }}>Yeni duyuru</button>} />
      {isManager && <Segmented value={showArchived ? "a" : "l"} onChange={(v) => setShowArchived(v === "a")} options={[["l", "Yayında"], ["a", "Arşiv"]]} />}
      {data.loading && !data.data ? <Loading /> : data.error ? <ErrorBox msg={data.error} retry={data.reload} /> : list.length === 0 ? (
        <Empty title={showArchived ? "Arşivde duyuru yok" : "Henüz duyuru yok"}>{isManager && !showArchived ? "Yayınladığın duyuru tüm sakinlere bildirim olarak gider." : undefined}</Empty>
      ) : (
        <div className="stack">
          {list.map((a) => (
            <article key={a.id} className="card ann">
              <div className="row-between"><span className="eyebrow">{dateTimeTR(a.created_at)}</span>
                {isManager && !a.archived_at && <button className="linkbtn small" onClick={() => setArch(a)}>Arşivle</button>}</div>
              <h2>{a.title}</h2>
              <p className="prewrap">{a.body}</p>
              {a.archived_at && <p className="small muted">Arşivlendi: {a.archive_reason}</p>}
            </article>
          ))}
        </div>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title="Yeni duyuru">
        {config()?.aiEnabled && <AiDraft buildingId={bid} onDraft={(d) => { setT(d.title); setBody(d.body); }} />}
        <form className="stack" onSubmit={async (e) => { e.preventDefault(); if (await run(() => rpc("post_announcement", { p_building: bid, p_title: t, p_body: body }), "Duyuru yayınlandı, sakinlere bildirim gitti.")) { setOpen(false); data.reload(); } }}>
          <Field label="Başlık"><input id="a-title" required maxLength={120} value={t} onChange={(e) => setT(e.target.value)} placeholder="Örn. Su kesintisi" /></Field>
          <Field label="Duyuru metni"><textarea id="a-body" required rows={6} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
          <button className="btn btn-primary btn-lg" disabled={busy}>Yayınla</button>
        </form>
      </Sheet>
      <ReasonSheet open={!!arch} onClose={() => setArch(null)} title="Duyuruyu arşivle" confirm="Arşivle" desc="Duyuru sakinlerin ekranından kalkar, arşivde saklanır."
        onSubmit={(r) => run(() => rpc("archive_announcement", { p_id: arch!.id, p_reason: r }), "Duyuru arşivlendi.").then((ok) => { if (ok) data.reload(); return ok; })} />
    </div>
  );
}

// Yapay zekâ ile duyuru taslağı (OmniRoute, /api/ai-draft). Yalnızca kurulumda açıksa görünür.
function AiDraft({ buildingId, onDraft }: { buildingId: string; onDraft: (d: { title: string; body: string }) => void }) {
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const { busy, run } = useAction();
  const go = async () => {
    const d = await run(() => serverPost<{ title: string; body: string }>("/api/ai-draft", { building: buildingId, notes }));
    if (d && typeof d === "object") { onDraft(d); setDone(true); }
  };
  return (
    <div className="ai-draft stack">
      <Field label="Yapay zekâ ile taslak" hint={done ? "Taslak aşağıya yazıldı. Yayınlamadan önce oku ve [köşeli parantezli] yerleri doldur." : "Birkaç kelime yeter: ne oluyor, ne zaman, kimi etkiliyor."}>
        <textarea id="a-notes" rows={3} maxLength={1500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Örn. cuma 10-14 arası su kesik, tesisat tamiri, depoya su doldurun" />
      </Field>
      <button type="button" className="btn btn-ghost btn-sm" disabled={busy || notes.trim().length < 5} onClick={go}>{busy ? "Hazırlanıyor…" : done ? "Yeniden oluştur" : "Notlardan taslak oluştur"}</button>
    </div>
  );
}

// ===================== Bakım ve arıza =====================
type Req = { id: string; unit_id: string | null; created_by: string; title: string; description: string | null; photo_path: string | null; status: string; created_at: string; updated_at: string };
type Upd = { id: string; request_id: string; status: string; note: string | null; created_by: string; created_at: string };
export function Requests() {
  const { b, isManager } = useApp();
  const bid = b!.building_id;
  const toast = useToast();
  const [tab, setTab] = useState<"open" | "done">("open");
  const [newOpen, setNewOpen] = useState(false);
  const [sel, setSel] = useState<Req | null>(null);
  const data = useLoad(async () => {
    const reqs = await from<Req>("maintenance_requests").eq("building_id", bid).order("created_at", false).limit(200);
    const uids = [...new Set(reqs.map((r) => r.created_by))];
    const unitIds = [...new Set(reqs.map((r) => r.unit_id).filter(Boolean))] as string[];
    const [names, units] = await Promise.all([
      uids.length ? from("profiles", "id,full_name").in("id", uids) : [],
      unitIds.length ? from("units", "id,label").in("id", unitIds) : [],
    ]);
    return { reqs, names: Object.fromEntries((names as any[]).map((p) => [p.id, p.full_name])), units: Object.fromEntries((units as any[]).map((u) => [u.id, u.label])) };
  }, [bid]);
  const d = data.data;
  const list = (d?.reqs || []).filter((r) => (tab === "open" ? r.status !== "resolved" : r.status === "resolved"));
  return (
    <div className="page">
      <PageHead title="Bakım ve arıza" sub={isManager ? "Apartmanın tüm talepleri" : "Açtığın talepler"} action={<button className="btn btn-primary btn-sm" onClick={() => setNewOpen(true)}>Yeni talep</button>} />
      <Segmented value={tab} onChange={setTab} options={[["open", "Açık"], ["done", "Çözülenler"]]} />
      {data.loading && !d ? <Loading /> : data.error ? <ErrorBox msg={data.error} retry={data.reload} /> : list.length === 0 ? (
        <Empty title={tab === "open" ? "Açık talep yok" : "Çözülen talep yok"}>{tab === "open" ? "Lamba yanmıyor, asansör takıldı… Fotoğrafla bildir, yönetici durumunu güncellesin." : undefined}</Empty>
      ) : (
        <ul className="list">
          {list.map((r) => (
            <li key={r.id}><button className="rowbtn" onClick={() => setSel(r)}>
              <div className="row-main"><b>{r.title}</b><span className="muted small">{[r.unit_id && d!.units[r.unit_id], isManager && d!.names[r.created_by], ago(r.created_at)].filter(Boolean).join(" · ")}</span></div>
              <div className="row-side"><Badge s={r.status} />{r.photo_path && <span className="chip">fotoğraflı</span>}</div>
            </button></li>
          ))}
        </ul>
      )}
      <NewRequest open={newOpen} bid={bid} onClose={() => setNewOpen(false)} onDone={() => { setNewOpen(false); setTab("open"); data.reload(); }} />
      <RequestSheet r={sel} isManager={isManager} onClose={() => setSel(null)} onChanged={(nr) => { setSel(nr); data.reload(); }} toast={toast} />
    </div>
  );
}

function NewRequest({ open, bid, onClose, onDone }: { open: boolean; bid: string; onClose: () => void; onDone: () => void }) {
  const [t, setT] = useState(""); const [desc, setDesc] = useState(""); const [file, setFile] = useState<File | null>(null);
  const { busy, run } = useAction();
  React.useEffect(() => { if (open) { setT(""); setDesc(""); setFile(null); } }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title="Yeni talep">
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault();
        if (await run(async () => {
          const path = file ? await upload(bid, file) : null;
          return rpc("create_maintenance_request", { p_building: bid, p_title: t, p_description: desc, p_photo_path: path });
        }, "Talebin iletildi.")) onDone();
      }}>
        <Field label="Sorun ne?"><input id="r-title" required minLength={3} maxLength={120} value={t} onChange={(e) => setT(e.target.value)} placeholder="Örn. -2 otoparkta lamba yanmıyor" /></Field>
        <Field label="Ayrıntı (isteğe bağlı)"><textarea id="r-desc" rows={4} maxLength={2000} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        <Field label="Fotoğraf (isteğe bağlı)"><FilePick id="r-file" file={file} onFile={setFile} label="Fotoğraf ekle" /></Field>
        <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? "Gönderiliyor…" : "Talebi gönder"}</button>
      </form>
    </Sheet>
  );
}

function RequestSheet({ r, isManager, onClose, onChanged, toast }: { r: Req | null; isManager: boolean; onClose: () => void; onChanged: (r: Req) => void; toast: any }) {
  const ups = useLoad(async () => (r ? from<Upd>("maintenance_updates").eq("request_id", r.id).order("created_at") : []), [r?.id, r?.status, r?.updated_at]);
  const [status, setStatus] = useState("received");
  const [note, setNote] = useState("");
  const { busy, run } = useAction();
  React.useEffect(() => { if (r) { setStatus(r.status === "new" ? "received" : r.status === "received" ? "in_progress" : r.status === "in_progress" ? "resolved" : "resolved"); setNote(""); } }, [r?.id, r?.status]);
  return (
    <Sheet open={!!r} onClose={onClose} title={r?.title || ""}>
      {r && <div className="stack">
        <div className="row-between"><Badge s={r.status} /><span className="small muted">{dateTR(r.created_at)}</span></div>
        {r.description && <p className="prewrap">{r.description}</p>}
        {r.photo_path && <button className="btn btn-ghost btn-sm" onClick={() => openFile(r.photo_path!, toast)}>Fotoğrafı aç</button>}
        <h3>Durum geçmişi</h3>
        {ups.loading && !ups.data ? <Loading /> : (
          <ol className="timeline">
            {(ups.data || []).map((u) => <li key={u.id}><Badge s={u.status} /><div><span className="small muted">{dateTimeTR(u.created_at)}</span>{u.note && <p>{u.note}</p>}</div></li>)}
          </ol>
        )}
        {isManager && (
          <form className="stack card-inset" onSubmit={async (e) => {
            e.preventDefault();
            if (await run(() => rpc("update_maintenance_status", { p_request: r.id, p_status: status, p_note: note }), "Durum güncellendi, talep sahibine bildirim gitti."))
              onChanged({ ...r, status, updated_at: new Date().toISOString() });
          }}>
            <h3>Durumu güncelle</h3>
            <Segmented value={status} onChange={setStatus} options={[["received", "Alındı"], ["in_progress", "İşlemde"], ["resolved", "Çözüldü"]]} />
            <Field label="Açıklama (isteğe bağlı)"><input id="m-note" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Örn. Elektrikçi yarın gelecek" /></Field>
            <button className="btn btn-primary" disabled={busy}>Kaydet</button>
          </form>
        )}
      </div>}
    </Sheet>
  );
}

// ===================== Evrak =====================
type Doc = { id: string; title: string; category: string; file_path: string; mime: string; size_bytes: number; visibility: string; created_at: string; archived_at: string | null; archive_reason: string | null };
const DOC_CATS = ["Fatura", "Tutanak", "Sözleşme", "Sigorta", "Asansör", "Bakım", "Demirbaş", "Diğer"];
export function Documents() {
  const { b, isManager } = useApp();
  const bid = b!.building_id;
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [arch, setArch] = useState<Doc | null>(null);
  const [cat, setCat] = useState("Tümü");
  const { busy, run } = useAction();
  const [f, setF] = useState({ title: "", cat: "Fatura", vis: "residents" });
  const [file, setFile] = useState<File | null>(null);
  const data = useLoad(() => from<Doc>("documents").eq("building_id", bid).isNull("archived_at").order("created_at", false).limit(300), [bid]);
  const cats = ["Tümü", ...Array.from(new Set((data.data || []).map((d) => d.category)))];
  const list = (data.data || []).filter((d) => cat === "Tümü" || d.category === cat);
  return (
    <div className="page">
      <PageHead title="Evrak" sub={isManager ? "Faturalar, tutanaklar, sözleşmeler" : "Yönetimin paylaştığı belgeler"}
        action={isManager && <button className="btn btn-primary btn-sm" onClick={() => { setF({ title: "", cat: "Fatura", vis: "residents" }); setFile(null); setOpen(true); }}>Belge yükle</button>} />
      {cats.length > 2 && <div className="chips">{cats.map((c) => <button key={c} className={"chip" + (c === cat ? " on" : "")} onClick={() => setCat(c)}>{c}</button>)}</div>}
      {data.loading && !data.data ? <Loading /> : data.error ? <ErrorBox msg={data.error} retry={data.reload} /> : list.length === 0 ? (
        <Empty title="Henüz belge yok">{isManager ? "Belge yöneticiden yöneticiye devirde de kaybolmaz." : undefined}</Empty>
      ) : (
        <ul className="list">
          {list.map((d) => (
            <li key={d.id}>
              <button className="rowbtn" onClick={() => openFile(d.file_path, toast)}>
                <span className={"filetype ft-" + (d.mime === "application/pdf" ? "pdf" : "img")}>{d.mime === "application/pdf" ? "PDF" : "IMG"}</span>
                <div className="row-main"><b>{d.title}</b><span className="muted small">{d.category} · {dateTR(d.created_at)} · {d.size_bytes < 1048576 ? Math.max(1, Math.round(d.size_bytes / 1024)) + " KB" : (d.size_bytes / 1048576).toFixed(1).replace(".", ",") + " MB"}</span>
                  {isManager && <span><span className={"chip" + (d.visibility === "managers" ? " chip-lock" : "")}>{d.visibility === "managers" ? "Yönetime özel" : "Sakinlere açık"}</span></span>}</div>
              </button>
              {isManager && <button className="linkbtn small" onClick={() => setArch(d)}>Arşivle</button>}
            </li>
          ))}
        </ul>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title="Belge yükle">
        <form className="stack" onSubmit={async (e) => {
          e.preventDefault();
          if (!file) { toast("Bir dosya seç.", "err"); return; }
          if (await run(async () => {
            const path = await upload(bid, file);
            return rpc("add_document", { p_building: bid, p_title: f.title, p_category: f.cat, p_file_path: path, p_mime: file.type, p_size: file.size, p_visibility: f.vis });
          }, f.vis === "residents" ? "Belge paylaşıldı, sakinlere bildirim gitti." : "Belge yüklendi.")) { setOpen(false); data.reload(); }
        }}>
          <Field label="Dosya"><FilePick id="d-file" file={file} onFile={(x) => { setFile(x); if (x && !f.title) setF({ ...f, title: x.name.replace(/\.[^.]+$/, "") }); }} /></Field>
          <Field label="Başlık"><input id="d-title" required maxLength={120} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Kategori"><select id="d-cat" value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })}>{DOC_CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Segmented value={f.vis} onChange={(v) => setF({ ...f, vis: v })} options={[["residents", "Sakinlere açık"], ["managers", "Yalnızca yönetim"]]} />
          <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? "Yükleniyor…" : "Yükle"}</button>
        </form>
      </Sheet>
      <ReasonSheet open={!!arch} onClose={() => setArch(null)} title="Belgeyi arşivle" confirm="Arşivle" desc="Belge listeden kalkar ama silinmez."
        onSubmit={(r) => run(() => rpc("archive_document", { p_id: arch!.id, p_reason: r }), "Belge arşivlendi.").then((ok) => { if (ok) data.reload(); return ok; })} />
    </div>
  );
}
