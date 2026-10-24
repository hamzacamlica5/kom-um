import React, { useEffect, useState } from "react";
import { auth, from, rpc, serverPost, forgetSession } from "../lib/sb";
import { toCsv, downloadCsv, slug } from "../lib/csv";
import { STATUS_LABEL, istanbulToday } from "../lib/format";
import { tl, parseAmount, price, ago } from "../lib/format";
import { STORE, APP_ORIGIN } from "../lib/platform";
import { enablePush, disablePush, pushState, PushState, isStandalone } from "../lib/push";
import { useApp, useRoute, Link } from "../state";
import { Empty, ErrorBox, Field, Loading, PageHead, ReasonSheet, Sheet, useAction, useLoad, useToast } from "../ui";
import { CreateBuilding } from "./auth";

type Unit = { id: string; label: string; monthly_dues: number; due_day: number; sort_order: number };
type Member = { id: string; user_id: string; role: string; unit_id: string | null; created_at: string };
type Invite = { id: string; unit_id: string; token: string; expires_at: string; used_at: string | null; revoked_at: string | null };

const inviteUrl = (t: string) => `${APP_ORIGIN}/davet/${t}`;

// ===================== Daireler, sakinler, davetler =====================
export function Units() {
  const { b } = useApp();
  const bid = b!.building_id;
  const [sel, setSel] = useState<Unit | "new" | null>(null);
  const [bulk, setBulk] = useState(false);
  const data = useLoad(async () => {
    const [units, members, invites] = await Promise.all([
      from<Unit>("units").eq("building_id", bid).isNull("archived_at"),
      from<Member>("memberships").eq("building_id", bid).isNull("ended_at"),
      from<Invite>("invites").eq("building_id", bid).isNull("used_at").isNull("revoked_at"),
    ]);
    units.sort((a, b) => a.label.localeCompare(b.label, "tr", { numeric: true }));
    const ids = members.map((m) => m.user_id);
    const profiles = ids.length ? await from("profiles", "id,full_name,phone").in("id", ids) : [];
    return { units, members, invites: invites.filter((i) => new Date(i.expires_at) > new Date()), people: Object.fromEntries((profiles as any[]).map((p) => [p.id, p])) };
  }, [bid]);
  const d = data.data;
  const curUnit = sel && sel !== "new" ? sel : null;
  return (
    <div className="page">
      <PageHead title="Daireler" sub={d ? `${d.units.length} daire · ${d.members.filter((m) => m.role === "resident").length} sakin${STORE ? "" : ` · abonelik ${tl(price(d.units.length))}/ay`}` : undefined}
        action={<button className="btn btn-ghost btn-sm" onClick={() => setSel("new")}>Daire ekle</button>} />
      {data.loading && !d ? <Loading /> : data.error ? <ErrorBox msg={data.error} retry={data.reload} /> : (
        <>
          {d!.members.filter((m) => m.role === "resident").length === 0 && (
            <p className="note-info">Sakinleri davet etmek için <b>Toplu davet</b> ile tüm dairelerin bağlantılarını tek seferde al ya da bir daireye dokun. Bağlantılar 7 gün geçerli ve tek kullanımlık.</p>
          )}
          {d!.units.some((u) => !d!.members.some((m) => m.unit_id === u.id)) && (
            <button className="btn btn-primary" onClick={() => setBulk(true)}>Toplu davet: boş dairelerin bağlantıları</button>
          )}
          <ul className="list">
            {d!.units.map((u) => {
              const ms = d!.members.filter((m) => m.unit_id === u.id);
              const inv = d!.invites.find((i) => i.unit_id === u.id);
              return (
                <li key={u.id}><button className="rowbtn" onClick={() => setSel(u)}>
                  <div className="row-main"><b>{u.label}</b>
                    <span className="muted small">{ms.length ? ms.map((m) => d!.people[m.user_id]?.full_name || "Sakin").join(", ") : inv ? "Davet gönderildi, bekleniyor" : "Sakin yok"}</span></div>
                  <div className="row-side"><span className="small">{Number(u.monthly_dues) > 0 ? tl(u.monthly_dues) : "Aidatsız"}</span><span className="small muted">her ayın {u.due_day}'i</span></div>
                </button></li>
              );
            })}
          </ul>
        </>
      )}
      <UnitSheet open={!!sel} unit={curUnit} isNew={sel === "new"} bid={bid} d={d} onClose={() => setSel(null)} onChanged={data.reload} />
      <BulkInviteSheet open={bulk} bid={bid} building={b!.name} onClose={() => { setBulk(false); data.reload(); }} />
    </div>
  );
}

type BulkRow = { unit_id: string; unit_label: string; token: string; expires_at: string };
function BulkInviteSheet({ open, bid, building, onClose }: { open: boolean; bid: string; building: string; onClose: () => void }) {
  const toast = useToast();
  const data = useLoad(async () => {
    if (!open) return [] as BulkRow[];
    const rows = await rpc<BulkRow[]>("bulk_invites", { p_building: bid });
    return rows.sort((a, b) => a.unit_label.localeCompare(b.unit_label, "tr", { numeric: true }));
  }, [open, bid]);
  const rows = data.data || [];
  const all = rows.map((r) => `${r.unit_label}: ${inviteUrl(r.token)}`).join("\n");
  const message = `${building} artık Apartmanca'da! Aidat, kasa, duyuru ve arıza takibi tek yerde. Kendi dairenin bağlantısına dokunup katıl (7 gün geçerli):\n\n${all}`;
  const copy = async (text: string, ok: string) => {
    try { await navigator.clipboard.writeText(text); toast(ok); } catch { toast("Kopyalanamadı; metni basılı tutup kopyala.", "err"); }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Toplu davet">
      {data.loading && !data.data ? <Loading /> : data.error ? <ErrorBox msg={data.error} retry={data.reload} /> : rows.length === 0 ? <Empty title="Tüm dairelerde sakin var" /> : (
        <div className="stack">
          <p className="muted small">{rows.length} boş daire için bağlantı hazır. Hepsini apartmanın WhatsApp grubuna tek mesajla gönderebilirsin; herkes kendi dairesinin bağlantısına dokunur.</p>
          <div className="row-wrap">
            <a className="btn btn-primary btn-sm" href={"https://wa.me/?text=" + encodeURIComponent(message)} target="_blank" rel="noopener">WhatsApp'ta gönder</a>
            <button className="btn btn-ghost btn-sm" onClick={() => copy(message, "Davet mesajı kopyalandı.")}>Mesajı kopyala</button>
          </div>
          <ul className="list compact">
            {rows.map((r) => (
              <li key={r.unit_id}>
                <div className="row-main"><b>{r.unit_label}</b><span className="small muted invite-url">{inviteUrl(r.token)}</span></div>
                <button className="linkbtn small" onClick={() => copy(`${building} · ${r.unit_label} için Apartmanca davetin: ${inviteUrl(r.token)} (7 gün geçerli)`, r.unit_label + " bağlantısı kopyalandı.")}>Kopyala</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Sheet>
  );
}

function UnitSheet({ open, unit, isNew, bid, d, onClose, onChanged }: { open: boolean; unit: Unit | null; isNew: boolean; bid: string; d: any; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const { busy, run } = useAction();
  const [f, setF] = useState({ label: "", dues: "", day: "10" });
  const [link, setLink] = useState<string | null>(null);
  const [rm, setRm] = useState<Member | null>(null);
  useEffect(() => {
    if (!open) return;
    setF(unit ? { label: unit.label, dues: String(Number(unit.monthly_dues)), day: String(unit.due_day) } : { label: "", dues: "", day: "10" });
    const inv = unit && d?.invites.find((i: Invite) => i.unit_id === unit.id);
    setLink(inv ? inviteUrl(inv.token) : null);
  }, [open, unit?.id]);
  const ms: Member[] = unit ? d?.members.filter((m: Member) => m.unit_id === unit.id) || [] : [];
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast("Bağlantı kopyalandı."); }
    catch { toast("Kopyalanamadı; bağlantıyı basılı tutup kopyala.", "err"); }
  };
  const msg = link && unit ? `${unit.label} için Apartmanca davetin: ${link} (7 gün geçerli)` : "";
  return (
    <Sheet open={open} onClose={onClose} title={isNew ? "Daire ekle" : unit?.label || ""}>
      <div className="stack">
        <form className="stack" onSubmit={async (e) => {
          e.preventDefault();
          if (await run(() => rpc("save_unit", { p_building: bid, p_unit: unit?.id || null, p_label: f.label, p_monthly_dues: parseAmount(f.dues) || 0, p_due_day: parseInt(f.day) || 10 }), "Daire kaydedildi.")) { onChanged(); if (isNew) onClose(); }
        }}>
          <Field label="Daire adı"><input id="u-label" required maxLength={30} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="Örn. Daire 5 veya B-12" /></Field>
          <div className="grid2">
            <Field label="Aylık aidat (TL)"><input id="u-dues" inputMode="decimal" value={f.dues} onChange={(e) => setF({ ...f, dues: e.target.value })} /></Field>
            <Field label="Son ödeme günü"><input id="u-day" type="number" min={1} max={28} value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} /></Field>
          </div>
          {!isNew && <p className="muted small">Aidat değişikliği yalnızca bundan sonra oluşturulacak ayları etkiler; geçmiş borçlar korunur.</p>}
          <button className="btn btn-primary" disabled={busy}>Kaydet</button>
        </form>

        {unit && <>
          <h3>Sakinler</h3>
          {ms.length === 0 ? <p className="muted small">Bu dairede kayıtlı sakin yok.</p> : (
            <ul className="list compact">
              {ms.map((m) => {
                const p = d.people[m.user_id];
                return <li key={m.id}><div className="row-main"><b>{p?.full_name || "Sakin"}{m.role === "manager" ? " (yönetici)" : ""}</b>{p?.phone && <span className="small muted">{p.phone}</span>}</div>
                  {m.role !== "manager" && <button className="linkbtn small danger" onClick={() => setRm(m)}>Çıkar</button>}</li>;
              })}
            </ul>
          )}
          <h3>Davet</h3>
          {link ? (
            <div className="stack">
              <div className="invite-link"><code>{link}</code></div>
              <div className="row-wrap">
                <button className="btn btn-ghost btn-sm" onClick={() => copy(msg)}>Mesajı kopyala</button>
                <a className="btn btn-ghost btn-sm" href={"https://wa.me/?text=" + encodeURIComponent(msg)} target="_blank" rel="noopener">WhatsApp'ta gönder</a>
                <button className="btn btn-ghost btn-sm" disabled={busy} onClick={async () => { const t = await run(() => rpc<string>("create_invite", { p_unit: unit.id }), "Yeni bağlantı oluşturuldu; eskisi geçersiz."); if (t) { setLink(inviteUrl(t)); onChanged(); } }}>Yenile</button>
              </div>
              <p className="muted small">Tek kullanımlık ve 7 gün geçerli. Bağlantıyı açan kişi giriş yapıp bu daireye bina sakini olarak katılır.</p>
            </div>
          ) : (
            <button className="btn btn-primary" disabled={busy} onClick={async () => { const t = await run(() => rpc<string>("create_invite", { p_unit: unit.id })); if (t) { setLink(inviteUrl(t)); onChanged(); } }}>Davet bağlantısı oluştur</button>
          )}
          <button className="linkbtn danger" disabled={busy} onClick={async () => { if (await run(() => rpc("archive_unit", { p_unit: unit.id }), "Daire kaldırıldı.")) { onChanged(); onClose(); } }}>Daireyi kaldır</button>
        </>}
      </div>
      <ReasonSheet open={!!rm} onClose={() => setRm(null)} title="Sakini çıkar" confirm="Çıkar" desc="Kişi bu apartmanın verilerini artık göremez. Ödeme geçmişi daire üzerinde kalır."
        onSubmit={(r) => run(() => rpc("remove_member", { p_membership: rm!.id, p_reason: r }), "Sakin çıkarıldı.").then((ok) => { if (ok) onChanged(); return ok; })} />
    </Sheet>
  );
}

// ===================== Ayarlar =====================
export function Settings() {
  const { b, isManager, profile, refresh, buildings, select, email } = useApp();
  const { go } = useRoute();
  const toast = useToast();
  const { busy, run } = useAction();
  const [name, setName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [bf, setBf] = useState({ name: b?.name || "", address: b?.address || "" });
  const [ps, setPs] = useState<PushState | null>(null);
  const [transfer, setTransfer] = useState(false);
  const [newB, setNewB] = useState(false);
  const [del, setDel] = useState(false);
  useEffect(() => { pushState().then(setPs); }, []);
  useEffect(() => { setBf({ name: b?.name || "", address: b?.address || "" }); }, [b?.building_id]);

  return (
    <div className="page">
      <PageHead title="Ayarlar" />

      {/* Paket içinde web bildirimi çalışmaz; yerel bildirim gelene kadar gizli. */}
      {!STORE && <section className="card stack">
        <h2>Telefon bildirimleri</h2>
        {ps === null ? <Loading /> : ps === "on" ? (
          <>
            <p className="ok-line">Bu cihazda bildirimler açık.</p>
            <div className="row-wrap">
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run(() => rpc("send_test_notification"), "Test bildirimi gönderildi. Birkaç saniye içinde gelmeli.")}>Test bildirimi gönder</button>
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={async () => { await run(disablePush, "Bu cihazda bildirimler kapatıldı."); setPs(await pushState()); }}>Kapat</button>
            </div>
          </>
        ) : ps === "needs-install" ? (
          <p className="note-info">iPhone'da bildirim almak için önce Apartmanca'yı ana ekrana ekle: Safari'de <b>Paylaş</b> → <b>Ana Ekrana Ekle</b>. Sonra ana ekrandaki simgeden açıp buraya dön.</p>
        ) : ps === "denied" ? (
          <p className="note-warn">Bildirim izni reddedilmiş. Telefonun ayarlarından bu uygulama için bildirimlere izin ver, sonra sayfayı yenile.</p>
        ) : ps === "unsupported" ? (
          <p className="muted">Bu tarayıcı telefon bildirimlerini desteklemiyor. Chrome veya Safari'den dene.</p>
        ) : (
          <>
            <p className="muted small">Yeni duyuru, aidat borcu, ödeme onayı ve arıza güncellemeleri telefonuna gelsin.</p>
            <button className="btn btn-primary" disabled={busy} onClick={async () => { await run(enablePush, "Bildirimler açıldı."); setPs(await pushState()); }}>Bildirimleri aç</button>
          </>
        )}
      </section>}

      {isManager && b && (
        <section className="card stack">
          <h2>Apartman</h2>
          <form className="stack" onSubmit={async (e) => { e.preventDefault(); if (await run(() => rpc("update_building", { p_building: b.building_id, p_name: bf.name, p_address: bf.address }), "Kaydedildi.")) refresh(); }}>
            <Field label="Apartman adı"><input id="s-bname" required minLength={2} maxLength={80} value={bf.name} onChange={(e) => setBf({ ...bf, name: e.target.value })} /></Field>
            <Field label="Adres"><input id="s-baddr" maxLength={200} value={bf.address} onChange={(e) => setBf({ ...bf, address: e.target.value })} /></Field>
            <button className="btn btn-ghost btn-sm" disabled={busy}>Kaydet</button>
          </form>
          {!STORE && <div className="pricebox"><span>{b.unit_count} daire · aylık abonelik</span><b>{tl(b.monthly_price)} / ay</b><small>Daire başı aylık 15 TL (KDV dahil), en az 99 TL. Yıllık ödemede 12 ay kullan, 10 ay öde. Ücreti apartman öder, sakinler ayrıca ödemez.</small></div>}
          <button className="btn btn-ghost" onClick={() => setTransfer(true)}>Yönetimi devret</button>
        </section>
      )}

      {isManager && b && <ExportSection bid={b.building_id} name={b.name} />}

      <section className="card stack">
        <h2>Profilim</h2>
        <form className="stack" onSubmit={async (e) => { e.preventDefault(); if (await run(() => rpc("save_profile", { p_full_name: name, p_phone: phone }), "Profil kaydedildi.")) refresh(); }}>
          <Field label="Adın soyadın"><input id="s-name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Telefon"><input id="s-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <button className="btn btn-ghost btn-sm" disabled={busy}>Kaydet</button>
        </form>
        <p className="small muted">Giriş e-postası: {email}</p>
      </section>

      <section className="card stack">
        <h2>Apartmanlarım</h2>
        <ul className="list compact">
          {(buildings || []).map((x) => (
            <li key={x.building_id}><div className="row-main"><b>{x.name}</b><span className="small muted">{x.role === "manager" ? "Yönetici" : "Bina sakini"}{x.unit_label ? " · " + x.unit_label : ""}</span></div>
              {x.building_id === b?.building_id ? <span className="chip on">Açık</span> : <button className="btn btn-ghost btn-sm" onClick={() => { select(x.building_id); go("/"); }}>Geç</button>}</li>
          ))}
        </ul>
        <button className="btn btn-ghost btn-sm" onClick={() => setNewB(true)}>Başka bir apartman kur</button>
      </section>

      {!isStandalone() && <p className="note-info">Telefonunda uygulama gibi kullanmak için: iPhone'da Safari <b>Paylaş → Ana Ekrana Ekle</b>, Android'de Chrome <b>⋮ → Uygulamayı yükle</b>.</p>}
      <button className="btn btn-ghost" onClick={() => auth.signOut()}>Çıkış yap</button>
      <nav className="legal-links small">
        <Link to="/guven">Güven Merkezi</Link><Link to="/kvkk">KVKK Aydınlatma Metni</Link><Link to="/gizlilik">Gizlilik</Link><Link to="/cerez-politikasi">Çerezler</Link><Link to="/kullanim-sartlari">Kullanım Şartları</Link><Link to="/iletisim">İletişim</Link>
      </nav>
      <button className="linkbtn danger center-self" onClick={() => setDel(true)}>Hesabımı sil</button>
      <DeleteAccountSheet open={del} onClose={() => setDel(false)} />
      <p className="small muted center">Apartmanca · Apartmanda ne oluyor, herkes bilsin.</p>

      {b && <TransferSheet open={transfer} bid={b.building_id} onClose={() => setTransfer(false)} onDone={async () => { setTransfer(false); await refresh(); go("/"); }} />}
      <Sheet open={newB} onClose={() => setNewB(false)} title="Yeni apartman"><CreateBuilding /></Sheet>
    </div>
  );
}

function TransferSheet({ open, bid, onClose, onDone }: { open: boolean; bid: string; onClose: () => void; onDone: () => void }) {
  const { userId } = useApp();
  const [to, setTo] = useState("");
  const [sure, setSure] = useState(false);
  const { busy, run } = useAction();
  const data = useLoad(async () => {
    if (!open) return [];
    const ms = await from<Member>("memberships").eq("building_id", bid).isNull("ended_at");
    const others = ms.filter((m) => m.user_id !== userId);
    const ps = others.length ? await from("profiles", "id,full_name").in("id", others.map((m) => m.user_id)) : [];
    const units = await from("units", "id,label").eq("building_id", bid);
    const un = Object.fromEntries((units as any[]).map((u) => [u.id, u.label]));
    return (ps as any[]).map((p) => ({ id: p.id, name: p.full_name, unit: un[others.find((m) => m.user_id === p.id)?.unit_id || ""] || "" }));
  }, [open, bid]);
  useEffect(() => { if (open) { setTo(""); setSure(false); } }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title="Yönetimi devret">
      <div className="stack">
        <p>Kasa, borçlar, ödemeler, giderler, belgeler, bakım geçmişi ve açık işler yeni yöneticiye geçer. Sen bina sakini olarak kalırsın.</p>
        {data.loading && !data.data ? <Loading /> : (data.data || []).length === 0 ? <p className="note-warn">Önce yeni yöneticiyi bir daireye davet et; katıldıktan sonra devredebilirsin.</p> : (
          <>
            <Field label="Yeni yönetici"><select id="t-to" value={to} onChange={(e) => setTo(e.target.value)}><option value="">Seç…</option>{data.data!.map((p: any) => <option key={p.id} value={p.id}>{p.name}{p.unit ? " · " + p.unit : ""}</option>)}</select></Field>
            <label className="switch"><input id="t-sure" type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} /><span>Yönetici yetkimin bu kişiye geçeceğini anlıyorum.</span></label>
            <button className="btn btn-danger btn-lg" disabled={busy || !to || !sure} onClick={async () => { if (await run(() => rpc("transfer_management", { p_building: bid, p_new_manager: to }), "Yönetim devredildi.")) onDone(); }}>Yönetimi devret</button>
          </>
        )}
      </div>
    </Sheet>
  );
}

// ===================== Bildirim kutusu =====================
type Notif = { id: string; kind: string; title: string; body: string; url: string; created_at: string; read_at: string | null };
export function Inbox({ onSeen }: { onSeen: () => void }) {
  const { go } = useRoute();
  const data = useLoad(() => from<Notif>("notifications").order("created_at", false).limit(60), []);
  useEffect(() => { if (data.data && data.data.some((n) => !n.read_at)) rpc("mark_notifications_read").then(onSeen, () => {}); }, [data.data]);
  return (
    <div className="page">
      <PageHead title="Bildirimler" />
      {data.loading && !data.data ? <Loading /> : data.error ? <ErrorBox msg={data.error} retry={data.reload} /> : data.data!.length === 0 ? <Empty title="Henüz bildirim yok" /> : (
        <ul className="list">
          {data.data!.map((n) => (
            <li key={n.id} className={n.read_at ? "" : "unread"}><button className="rowbtn" onClick={() => go(n.url || "/")}>
              <div className="row-main"><b>{n.title}</b>{n.body && <span className="small">{n.body}</span>}<span className="small muted">{ago(n.created_at)}</span></div>
            </button></li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ===================== Dışa aktarma =====================
function ExportSection({ bid, name }: { bid: string; name: string }) {
  const { busy, run } = useAction();
  const base = slug(name) + "-" + istanbulToday();
  const namesOf = async (ids: string[]) => {
    const u = [...new Set(ids.filter(Boolean))];
    const ps = u.length ? await from("profiles", "id,full_name").in("id", u) : [];
    return Object.fromEntries((ps as any[]).map((p) => [p.id, p.full_name])) as Record<string, string>;
  };
  const exports: [string, string, () => Promise<void>][] = [
    ["Kasa hareketleri", "Tüm giriş ve çıkışlar, iptaller ve düzeltmeler", async () => {
      const rows = await from("ledger").eq("building_id", bid).order("effective_on").order("created_at").limit(10000);
      const n = await namesOf(rows.map((r: any) => r.actor));
      const SRC: Record<string, string> = { payment: "Aidat", expense: "Gider", cash_opening: "Başlangıç bakiyesi", cash_manual: "Kasa hareketi", cash_reversal: "Düzeltme" };
      downloadCsv(`${base}-kasa.csv`, toCsv(["Tarih", "Tür", "Açıklama", "Giriş", "Çıkış", "Durum", "İşlemi yapan", "Kayıt zamanı"],
        rows.map((r: any) => [r.effective_on, SRC[r.source] || r.source, r.description, r.direction === "in" ? Number(r.amount) : null, r.direction === "out" ? Number(r.amount) : null,
          r.voided_at ? "İptal: " + (r.void_reason || "") : "", n[r.actor] || "", new Date(r.created_at).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })])));
    }],
    ["Aidat durumu", "Her dairenin aylık borcu, ödenen ve kalan tutar", async () => {
      const rows = await from("charge_status").eq("building_id", bid).isNull("cancelled_at").order("period").order("unit_label").limit(20000);
      rows.sort((a: any, b: any) => a.period.localeCompare(b.period) || a.unit_label.localeCompare(b.unit_label, "tr", { numeric: true }));
      downloadCsv(`${base}-aidatlar.csv`, toCsv(["Dönem", "Daire", "Borç", "Ödenen", "Kalan", "Son ödeme", "Durum"],
        rows.map((r: any) => [r.period, r.unit_label, Number(r.amount), Number(r.paid), Number(r.remaining), r.due_date, STATUS_LABEL[r.status] || r.status])));
    }],
    ["Daireler ve sakinler", "Daire listesi, aidat tutarları, sakin adları ve telefonları", async () => {
      const [units, ms] = await Promise.all([from("units").eq("building_id", bid).isNull("archived_at"), from("memberships").eq("building_id", bid).isNull("ended_at")]);
      const ps = await from("profiles", "id,full_name,phone").in("id", (ms as any[]).map((m) => m.user_id).concat(["00000000-0000-0000-0000-000000000000"]));
      const pm = Object.fromEntries((ps as any[]).map((p) => [p.id, p]));
      (units as any[]).sort((a, b) => a.label.localeCompare(b.label, "tr", { numeric: true }));
      const out: any[][] = [];
      for (const u of units as any[]) {
        const people = (ms as any[]).filter((m) => m.unit_id === u.id);
        if (!people.length) out.push([u.label, Number(u.monthly_dues), u.due_day, "", "", ""]);
        for (const m of people) out.push([u.label, Number(u.monthly_dues), u.due_day, pm[m.user_id]?.full_name || "", pm[m.user_id]?.phone || "", m.role === "manager" ? "Yönetici" : "Bina sakini"]);
      }
      downloadCsv(`${base}-daireler.csv`, toCsv(["Daire", "Aylık aidat", "Son ödeme günü", "Ad soyad", "Telefon", "Rol"], out));
    }],
  ];
  return (
    <section className="card stack">
      <h2>Verileri Excel'e aktar</h2>
      <p className="muted small">Dosyalar Excel ve Google E-Tablolar'da doğrudan açılır. Yedek almak ya da genel kurulda sunmak için kullanabilirsin.</p>
      <ul className="list compact">
        {exports.map(([t, sub, fn]) => (
          <li key={t}><div className="row-main"><b>{t}</b><span className="small muted">{sub}</span></div>
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run(fn)}>İndir</button></li>
        ))}
      </ul>
    </section>
  );
}

// ===================== Hesap silme =====================
function DeleteAccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [txt, setTxt] = useState("");
  const { busy, run } = useAction();
  useEffect(() => { if (open) setTxt(""); }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title="Hesabımı sil">
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(async () => { try { await disablePush(); } catch {} return serverPost("/api/delete-account"); });
        if (ok) { try { localStorage.clear(); } catch {} forgetSession(); location.href = "/"; }
      }}>
        <p>Hesabını silersen:</p>
        <ul className="plain">
          <li>Adın, telefonun ve bildirimlerin silinir, giriş hesabın kapatılır.</li>
          <li>Üye olduğun apartmanlardan çıkarılırsın.</li>
          <li>Apartmanın muhasebe kayıtları (ödemeler, giderler, kasa) yasal yükümlülükler nedeniyle "Silinmiş kullanıcı" adıyla kalır.</li>
          <li>Yöneticiysen ve apartmanda başka üye varsa, önce yönetimi devretmen gerekir.</li>
        </ul>
        <p className="note-warn">Bu işlem geri alınamaz.</p>
        <Field label="Onaylamak için SİL yaz"><input id="del-confirm" value={txt} onChange={(e) => setTxt(e.target.value)} autoComplete="off" /></Field>
        <button className="btn btn-danger btn-lg" disabled={busy || txt.trim().toLocaleUpperCase("tr") !== "SİL"}>{busy ? "Siliniyor…" : "Hesabımı kalıcı olarak sil"}</button>
      </form>
    </Sheet>
  );
}
