import React, { useEffect, useState } from "react";
import { auth, rpc } from "../lib/sb";
import { price, parseAmount, tl } from "../lib/format";
import { Field, useAction, useToast, Loading, ErrorBox } from "../ui";
import { useApp, useRoute } from "../state";

export function Brand({ small }: { small?: boolean }) {
  return (
    <div className={"brand" + (small ? " brand-sm" : "")}>
      <svg viewBox="0 0 48 48" aria-hidden="true" className="brand-mark">
        <rect x="6" y="10" width="36" height="32" rx="4" fill="var(--brand)" />
        <path d="M4 14 24 3l20 11" fill="none" stroke="var(--brand)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <g fill="var(--on-brand)"><rect x="12" y="17" width="7" height="6" rx="1.5" /><rect x="29" y="17" width="7" height="6" rx="1.5" /><rect x="12" y="28" width="7" height="6" rx="1.5" /><rect x="20.5" y="30" width="7" height="12" rx="1.5" /><rect x="29" y="28" width="7" height="6" rx="1.5" fill="var(--accent)" /></g>
      </svg>
      <span className="brand-word">KOMŞUM</span>
    </div>
  );
}

export function Login() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const { busy, run } = useAction();
  const toast = useToast();

  return (
    <div className="auth">
      <div className="auth-card">
        <Brand />
        <p className="auth-tag">Apartmanda ne oluyor, herkes bilsin.</p>
        {step === "email" ? (
          <form className="stack" onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run(() => auth.sendCode(email.trim().toLowerCase()));
            if (ok) { setStep("code"); toast("Kod e-postana gönderildi."); }
          }}>
            <Field label="E-posta adresin">
              <input id="email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@gmail.com" />
            </Field>
            <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? "Gönderiliyor…" : "Giriş kodu gönder"}</button>
            <p className="muted small">Şifre yok. E-postana gelen kodla giriş yaparsın; hesabın yoksa otomatik açılır.</p>
          </form>
        ) : (
          <form className="stack" onSubmit={async (e) => {
            e.preventDefault();
            await run(() => auth.verifyCode(email.trim().toLowerCase(), code.trim()));
          }}>
            <p><b>{email}</b> adresine gelen kodu yaz.</p>
            <Field label="Giriş kodu" hint="Gelmediyse gereksiz/spam klasörüne bak.">
              <input id="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" className="otp" />
            </Field>
            <button className="btn btn-primary btn-lg" disabled={busy || code.length < 6}>{busy ? "Kontrol ediliyor…" : "Giriş yap"}</button>
            <div className="row-between">
              <button type="button" className="linkbtn" onClick={() => { setStep("email"); setCode(""); }}>E-postayı değiştir</button>
              <button type="button" className="linkbtn" disabled={busy} onClick={() => run(() => auth.sendCode(email), "Yeni kod gönderildi.")}>Kodu tekrar gönder</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function ProfileSetup() {
  const { refresh, email } = useApp();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const { busy, run } = useAction();
  return (
    <div className="auth">
      <div className="auth-card">
        <Brand small />
        <h1 className="auth-h">Hoş geldin</h1>
        <p className="muted">Apartmandaki komşuların seni bu adla görecek.</p>
        <form className="stack" onSubmit={async (e) => {
          e.preventDefault();
          if (await run(() => rpc("save_profile", { p_full_name: name, p_phone: phone }))) await refresh();
        }}>
          <Field label="Adın soyadın"><input id="fullname" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>
          <Field label="Telefon (isteğe bağlı)" hint="Yalnızca apartmanındaki yönetici ve komşuların görür."><input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="05xx xxx xx xx" /></Field>
          <button className="btn btn-primary btn-lg" disabled={busy}>Devam et</button>
        </form>
        <p className="muted small">{email} · <button className="linkbtn" onClick={() => auth.signOut()}>Çıkış yap</button></p>
      </div>
    </div>
  );
}

export function Onboarding() {
  const [mode, setMode] = useState<"pick" | "create" | "join">("pick");
  const { profile } = useApp();
  return (
    <div className="auth">
      <div className="auth-card wide">
        <Brand small />
        {mode === "pick" && (
          <>
            <h1 className="auth-h">Merhaba {profile?.full_name.split(" ")[0]}</h1>
            <p className="muted">Nasıl başlamak istersin?</p>
            <div className="choice">
              <button className="choice-btn" onClick={() => setMode("create")}>
                <b>Apartmanımı kuracağım</b><span>Yöneticiyim. Daireleri ekleyip sakinleri davet edeceğim.</span>
              </button>
              <button className="choice-btn" onClick={() => setMode("join")}>
                <b>Davet bağlantım var</b><span>Yöneticim bana bir bağlantı gönderdi.</span>
              </button>
            </div>
            <p className="muted small"><button className="linkbtn" onClick={() => auth.signOut()}>Çıkış yap</button></p>
          </>
        )}
        {mode === "create" && <CreateBuilding onBack={() => setMode("pick")} />}
        {mode === "join" && <JoinByLink onBack={() => setMode("pick")} />}
      </div>
    </div>
  );
}

export function CreateBuilding({ onBack }: { onBack?: () => void }) {
  const { refresh, select } = useApp();
  const { go } = useRoute();
  const [f, setF] = useState({ name: "", address: "", units: "10", dues: "", day: "10" });
  const { busy, run } = useAction();
  const n = Math.max(1, Math.min(500, parseInt(f.units) || 1));
  return (
    <form className="stack" onSubmit={async (e) => {
      e.preventDefault();
      const id = await run(() => rpc<string>("create_building", {
        p_name: f.name, p_address: f.address, p_unit_count: n, p_monthly_dues: parseAmount(f.dues) || 0, p_due_day: parseInt(f.day) || 10,
      }), "Apartmanın hazır.");
      if (id) { select(id); await refresh(); go("/daireler", true); }
    }}>
      <h1 className="auth-h">Apartmanını kur</h1>
      <Field label="Apartman adı"><input id="bname" required minLength={2} maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Lale Apartmanı" /></Field>
      <Field label="Adres (isteğe bağlı)"><input id="baddr" maxLength={200} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="Mahalle, sokak, ilçe" /></Field>
      <div className="grid2">
        <Field label="Daire sayısı"><input id="bunits" type="number" min={1} max={500} required value={f.units} onChange={(e) => setF({ ...f, units: e.target.value })} /></Field>
        <Field label="Son ödeme günü" hint="Her ayın kaçı"><input id="bday" type="number" min={1} max={28} value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} /></Field>
      </div>
      <Field label="Aylık aidat (TL)" hint="Tüm dairelere uygulanır. Farklı olanları sonra tek tek düzenleyebilirsin.">
        <input id="bdues" inputMode="decimal" value={f.dues} onChange={(e) => setF({ ...f, dues: e.target.value })} placeholder="750" />
      </Field>
      <div className="pricebox">
        <span>{n} daire için abonelik</span>
        <b>{tl(price(n))} / ay</b>
        <small>Sakinler ücretsiz kullanır. 0–10 daire 99 TL, her ilave 10 daire +100 TL.</small>
      </div>
      <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? "Kuruluyor…" : "Apartmanı oluştur"}</button>
      {onBack && <button type="button" className="linkbtn" onClick={onBack}>Geri dön</button>}
    </form>
  );
}

function tokenFrom(s: string) {
  const m = s.trim().match(/davet\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : s.trim();
}

function JoinByLink({ onBack }: { onBack: () => void }) {
  const [v, setV] = useState("");
  const { go } = useRoute();
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); const t = tokenFrom(v); if (t) go("/davet/" + t); }}>
      <h1 className="auth-h">Davete katıl</h1>
      <Field label="Davet bağlantısı" hint="Yöneticinin gönderdiği bağlantıyı yapıştır.">
        <input id="invite" required value={v} onChange={(e) => setV(e.target.value)} placeholder="https://…/davet/…" />
      </Field>
      <button className="btn btn-primary btn-lg">Devam et</button>
      <button type="button" className="linkbtn" onClick={onBack}>Geri dön</button>
    </form>
  );
}

export const PENDING_INVITE = "komsum.invite";

export function Join({ token }: { token: string }) {
  const { userId, profile, refresh, select, buildings } = useApp();
  const { go } = useRoute();
  const { busy, run } = useAction();
  const [info, setInfo] = useState<{ building_name: string; unit_label: string; status: string } | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    try { localStorage.setItem(PENDING_INVITE, token); } catch {}
    rpc<any[]>("invite_info", { p_token: token }).then((r) => setInfo(r[0] || null), (e) => setErr(e.message));
  }, [token]);

  if (!userId) return <Login />;
  if (profile === null) return <ProfileSetup />;
  if (err) return <div className="auth"><div className="auth-card"><ErrorBox msg={err} /></div></div>;
  if (info === undefined || profile === undefined) return <div className="auth"><Loading /></div>;

  const done = () => { try { localStorage.removeItem(PENDING_INVITE); } catch {} };
  const bad = !info || info.status !== "valid";
  return (
    <div className="auth">
      <div className="auth-card">
        <Brand small />
        {bad ? (
          <>
            <h1 className="auth-h">Bu davet kullanılamıyor</h1>
            <p className="muted">{!info ? "Bağlantı hatalı görünüyor." : info.status === "used" ? "Bu davet daha önce kullanılmış." : info.status === "expired" ? "Davetin süresi dolmuş." : "Bu davet iptal edilmiş."} Yöneticinden yeni bir bağlantı iste.</p>
            <button className="btn btn-ghost" onClick={() => { done(); go("/", true); }}>Ana sayfaya dön</button>
          </>
        ) : (
          <>
            <h1 className="auth-h">{info.building_name}</h1>
            <p className="lead"><b>{info.unit_label}</b> için bina sakini olarak davet edildin.</p>
            <button className="btn btn-primary btn-lg" disabled={busy} onClick={async () => {
              const bid = await run(() => rpc<string>("accept_invite", { p_token: token }), "Apartmana katıldın.");
              if (bid) { done(); select(bid); await refresh(); go("/", true); }
            }}>{busy ? "Katılıyor…" : "Apartmana katıl"}</button>
            {buildings && buildings.length > 0 && <button className="linkbtn" onClick={() => { done(); go("/", true); }}>Vazgeç</button>}
          </>
        )}
      </div>
    </div>
  );
}
