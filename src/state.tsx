import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { auth, from, rpc } from "./lib/sb";

// ---------- Yönlendirme ----------
const RouteCtx = createContext<{ path: string; go: (p: string, replace?: boolean) => void }>({ path: "/", go: () => {} });
export const useRoute = () => useContext(RouteCtx);
export function Router({ children }: { children: React.ReactNode }) {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const f = () => setPath(location.pathname);
    addEventListener("popstate", f);
    return () => removeEventListener("popstate", f);
  }, []);
  const go = useCallback((p: string, replace = false) => {
    if (p === location.pathname) return;
    replace ? history.replaceState(null, "", p) : history.pushState(null, "", p);
    setPath(p); scrollTo(0, 0);
  }, []);
  return <RouteCtx.Provider value={{ path, go }}>{children}</RouteCtx.Provider>;
}
export function Link({ to, className, children }: { to: string; className?: string; children: React.ReactNode }) {
  const { go } = useRoute();
  return <a href={to} className={className} onClick={(e) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); go(to); }}>{children}</a>;
}

// ---------- Oturum ve bina bağlamı ----------
export type Building = { building_id: string; name: string; address: string | null; role: "manager" | "resident"; unit_id: string | null; unit_label: string | null; unit_count: number; monthly_price: number };
export type Profile = { id: string; full_name: string; phone: string | null };

type Ctx = {
  userId: string | null; email: string;
  profile: Profile | null | undefined; // undefined = yükleniyor
  buildings: Building[] | undefined;
  b: Building | null; // seçili bina
  isManager: boolean;
  select: (id: string) => void;
  refresh: () => Promise<void>;
  loadError: string | null;
};
const AppCtx = createContext<Ctx>(null as any);
export const useApp = () => useContext(AppCtx);

const BKEY = "komsum.building";
export function AppState({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState(auth.userId);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [buildings, setBuildings] = useState<Building[] | undefined>(undefined);
  const [sel, setSel] = useState<string | null>(() => { try { return localStorage.getItem(BKEY); } catch { return null; } });
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => auth.onChange((s) => setUserId(s?.user.id || null)) as any, []);

  const refresh = useCallback(async () => {
    if (!auth.userId) { setProfile(null); setBuildings([]); return; }
    try {
      const [p, bs] = await Promise.all([from<Profile>("profiles").eq("id", auth.userId).limit(1), rpc<Building[]>("my_buildings")]);
      setProfile(p[0] || null); setBuildings(bs); setLoadError(null);
    } catch (e: any) { setLoadError(e.message); }
  }, []);

  useEffect(() => { setProfile(undefined); setBuildings(undefined); refresh(); }, [userId, refresh]);

  const select = (id: string) => { setSel(id); try { localStorage.setItem(BKEY, id); } catch {} };
  const b = buildings?.find((x) => x.building_id === sel) || buildings?.[0] || null;

  return (
    <AppCtx.Provider value={{ userId, email: auth.email, profile, buildings, b, isManager: b?.role === "manager", select, refresh, loadError }}>
      {children}
    </AppCtx.Provider>
  );
}
