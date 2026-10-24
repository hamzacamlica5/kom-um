import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { from } from "./lib/sb";
import { AppState, Router, useApp, useRoute, Link } from "./state";
import { ToastHost, Loading, ErrorBox } from "./ui";
import { Login, ProfileSetup, Onboarding, Join, Brand, PENDING_INVITE } from "./screens/auth";
import { Home } from "./screens/home";
import { Dues, Notices } from "./screens/dues";
import { Cash } from "./screens/cash";
import { Announcements, Requests, Documents } from "./screens/board";
import { Units, Settings, Inbox } from "./screens/manage";
import { Breakdown } from "./screens/breakdown";
import { legalPageFor } from "./screens/legal";
import { Emergency } from "./screens/emergency";
import { STORE } from "./lib/platform";

const I = {
  home: <path d="M3 11.5 12 4l9 7.5M5.5 9.8V20h13V9.8" />,
  dues: <><rect x="3.5" y="5" width="17" height="14" rx="2.5" /><path d="M3.5 10h17M7.5 15h4" /></>,
  cash: <><path d="M4 7.5h16v11H4z" /><path d="M4 7.5 7 4h10l3 3.5" /><circle cx="12" cy="13" r="2.4" /></>,
  req: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L4 16.8V20h3.2l5.3-5.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  bell: <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" />,
};
const Icon = ({ d }: { d: React.ReactNode }) => <svg viewBox="0 0 24 24" className="ico" aria-hidden="true">{d}</svg>;

function Shell() {
  const { b, isManager, buildings } = useApp();
  const { path, go } = useRoute();
  const [unread, setUnread] = useState(0);
  const [notices, setNotices] = useState(0);

  const loadBadges = () => {
    from("notifications", "id").isNull("read_at").limit(50).then((r) => setUnread(r.length), () => {});
    if (isManager && b) from("payment_notices", "id").eq("building_id", b.building_id).eq("status", "pending").limit(50).then((r) => setNotices(r.length), () => {});
  };
  useEffect(() => {
    loadBadges();
    const t = setInterval(loadBadges, 60_000);
    const onVis = () => document.visibilityState === "visible" && loadBadges();
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [b?.building_id, isManager, path]);

  // Bildirime dokununca servis çalışanı buraya yönlendirir
  useEffect(() => {
    const f = (e: MessageEvent) => { if (e.data?.type === "navigate") go(e.data.url); };
    navigator.serviceWorker?.addEventListener("message", f);
    return () => navigator.serviceWorker?.removeEventListener("message", f);
  }, [go]);

  const tabs: [string, string, React.ReactNode, number?][] = [
    ["/", "Özet", I.home],
    ["/aidat", isManager ? "Aidat" : "Aidatım", I.dues],
    ["/kasa", "Kasa", I.cash],
    ["/talepler", "Talepler", I.req],
    ["/menu", "Menü", I.menu, isManager ? notices : 0],
  ];
  const active = (p: string) => (p === "/" ? path === "/" : path.startsWith(p)) || (p === "/menu" && ["/duyurular", "/evrak", "/daireler", "/ayarlar", "/bildirimler", "/nereye"].some((x) => path.startsWith(x)));

  let page: React.ReactNode;
  switch (path) {
    case "/": page = <Home />; break;
    case "/aidat": page = <Dues />; break;
    case "/bildirimler": page = isManager ? <Notices /> : <Dues />; break;
    case "/kasa": page = <Cash />; break;
    case "/talepler": page = <Requests />; break;
    case "/duyurular": page = <Announcements />; break;
    case "/evrak": page = <Documents />; break;
    case "/daireler": page = isManager ? <Units /> : <Home />; break;
    case "/ayarlar": page = <Settings />; break;
    case "/bildirim-kutusu": page = <Inbox onSeen={() => setUnread(0)} />; break;
    case "/menu": page = <Menu notices={notices} />; break;
    case "/nereye": page = <Breakdown />; break;
    case "/acil": page = <Emergency />; break;
    default: page = <Home />;
  }

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="topbar-brand"><Brand small /></Link>
        <span className="topbar-b">{b?.name}</span>
        <Link to="/acil" className="sos" ><span>Acil</span></Link>
        <Link to="/bildirim-kutusu" className="iconbtn bell"><Icon d={I.bell} />{unread > 0 && <i className="dot">{unread > 9 ? "9+" : unread}</i>}<span className="sr">Bildirimler</span></Link>
      </header>
      <main key={b?.building_id + path}>{page}</main>
      <nav className="tabbar">
        {tabs.map(([p, l, ic, n]) => (
          <Link key={p} to={p} className={"tab" + (active(p) ? " on" : "")}><Icon d={ic} /><span>{l}</span>{!!n && <i className="dot">{n}</i>}</Link>
        ))}
      </nav>
    </div>
  );
}

function Menu({ notices }: { notices: number }) {
  const { isManager } = useApp();
  const items: [string, string, string, number?][] = [
    ...(isManager ? [["/bildirimler", "Ödeme bildirimleri", "Sakinlerin dekontlarını onayla", notices] as [string, string, string, number]] : []),
    ["/nereye", "Aidatım nereye gitti?", "Giderlerin dağılımı ve dairenin payı"],
    ["/duyurular", "Duyurular", isManager ? "Duyuru yayınla, sakinlere bildirim gitsin" : "Yönetimden duyurular"],
    ["/evrak", "Evrak", isManager ? "Fatura, tutanak, sözleşme" : "Paylaşılan belgeler"],
    ...(isManager ? [["/daireler", "Daireler ve sakinler", "Aidat tutarları, davet bağlantıları"] as [string, string, string]] : []),
    ["/ayarlar", "Ayarlar", isManager ? "Bildirimler, apartman, yönetici devri" : "Bildirimler, profil"],
  ];
  return (
    <div className="page">
      <h1 className="sr">Menü</h1>
      <ul className="menu">
        {items.map(([to, t, s, n]) => <li key={to}><Link to={to} className="menu-item"><div><b>{t}</b><span>{s}</span></div>{!!n && <i className="dot static">{n}</i>}<span aria-hidden="true">›</span></Link></li>)}
      </ul>
    </div>
  );
}

function Root() {
  const { userId, profile, buildings, loadError, refresh } = useApp();
  const { path, go } = useRoute();
  const invite = path.match(/^\/davet\/([A-Za-z0-9_-]+)/)?.[1];

  // Girişten sonra bekleyen davete dön
  useEffect(() => {
    if (!invite && userId && profile) {
      let t: string | null = null;
      try { t = localStorage.getItem(PENDING_INVITE); } catch {}
      if (t) go("/davet/" + t, true);
    }
  }, [userId, profile, invite]);

  const legal = legalPageFor(path);
  if (legal) return legal;
  if (invite) return <Join token={invite} />;
  if (!userId) return <Login />;
  if (loadError && (profile === undefined || buildings === undefined)) return <div className="auth"><div className="auth-card"><Brand small /><ErrorBox msg={loadError} retry={refresh} /></div></div>;
  if (profile === undefined || buildings === undefined) return <div className="auth"><Loading /></div>;
  if (profile === null) return <ProfileSetup />;
  if (buildings.length === 0) return <Onboarding />;
  return <Shell />;
}

createRoot(document.getElementById("root")!).render(
  <Router><AppState><ToastHost><Root /></ToastHost></AppState></Router>
);

if (STORE) {
  // Paket içinde servis çalışanı yok: dosyalar zaten uygulamanın içinde.
} else if ("serviceWorker" in navigator && location.hostname !== "localhost") {
  addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
} else if ("serviceWorker" in navigator && (window as any).KOMSUM?.devSW) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
