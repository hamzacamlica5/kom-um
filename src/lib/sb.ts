// Supabase'e doğrudan HTTP ile bağlanan küçük istemci.
// Yalnızca uygulamanın kullandığı parçalar: e-posta kodu ile giriş,
// tablo okuma (basit filtreler), RPC çağrısı ve dosya yükleme/okuma.

type Session = { access_token: string; refresh_token: string; expires_at: number; user: { id: string; email?: string } };

const cfg = () => (window as any).KOMSUM as { supabaseUrl: string; supabaseKey: string; vapidPublicKey?: string };
const SKEY = "komsum.session";
let session: Session | null = null;
const listeners = new Set<(s: Session | null) => void>();

try { session = JSON.parse(localStorage.getItem(SKEY) || "null"); } catch { session = null; }

function setSession(s: Session | null) {
  session = s;
  try { s ? localStorage.setItem(SKEY, JSON.stringify(s)) : localStorage.removeItem(SKEY); } catch {}
  listeners.forEach((l) => l(s));
}

export class ApiError extends Error {
  status: number; code?: string;
  constructor(message: string, status: number, code?: string) { super(message); this.status = status; this.code = code; }
}

function friendly(status: number, body: any): string {
  const msg: string = body?.message || body?.msg || body?.error_description || body?.error || "";
  if (status === 0) return "İnternet bağlantısı yok. Bağlantını kontrol edip tekrar dene.";
  if (/Token has expired|otp_expired|invalid.*otp|Token.*invalid/i.test(msg)) return "Kod hatalı ya da süresi dolmuş. Yeni kod iste.";
  if (/rate limit|too many|security purposes/i.test(msg)) return "Çok sık denedin. Bir dakika bekleyip tekrar dene.";
  if (/JWT expired/i.test(msg)) return "Oturumun yenilenemedi. Tekrar giriş yap.";
  if (/permission denied|row-level security/i.test(msg)) return "Bu işlem için yetkin yok.";
  if (/Payload too large|exceeded the maximum/i.test(msg)) return "Dosya en fazla 5 MB olabilir.";
  if (/mime type|invalid_mime/i.test(msg)) return "Yalnızca PDF, JPG veya PNG yüklenebilir.";
  return msg || "Bir şeyler ters gitti. Tekrar dene.";
}

async function raw(path: string, init: RequestInit & { auth?: boolean } = {}) {
  const { supabaseUrl, supabaseKey } = cfg();
  const headers = new Headers(init.headers || {});
  headers.set("apikey", supabaseKey);
  if (init.auth !== false && session) headers.set("Authorization", "Bearer " + session.access_token);
  let res: Response;
  try { res = await fetch(supabaseUrl + path, { ...init, headers }); }
  catch { throw new ApiError(friendly(0, null), 0); }
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) throw new ApiError(friendly(res.status, body), res.status, body?.code);
  return body;
}

let refreshing: Promise<void> | null = null;
async function ensureFresh() {
  if (!session) return;
  if (session.expires_at * 1000 - Date.now() > 60_000) return;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const s = await raw("/auth/v1/token?grant_type=refresh_token", {
          method: "POST", auth: false, headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: session!.refresh_token }),
        });
        setSession(normalize(s));
      } catch (e: any) {
        if (e instanceof ApiError && e.status >= 400 && e.status < 500) setSession(null);
        else throw e;
      } finally { refreshing = null; }
    })();
  }
  await refreshing;
}

function normalize(s: any): Session {
  return {
    access_token: s.access_token, refresh_token: s.refresh_token,
    expires_at: s.expires_at || Math.floor(Date.now() / 1000) + (s.expires_in || 3600),
    user: { id: s.user?.id, email: s.user?.email },
  };
}

async function call(path: string, init: RequestInit & { auth?: boolean } = {}) {
  await ensureFresh();
  try { return await raw(path, init); }
  catch (e) {
    if (e instanceof ApiError && e.status === 401 && session) {
      session.expires_at = 0; await ensureFresh();
      return raw(path, init);
    }
    throw e;
  }
}

// ---------- Auth ----------
export const auth = {
  get session() { return session; },
  get userId() { return session?.user.id || null; },
  get email() { return session?.user.email || ""; },
  onChange(cb: (s: Session | null) => void) { listeners.add(cb); return () => listeners.delete(cb); },
  async sendCode(email: string) {
    await raw("/auth/v1/otp", { method: "POST", auth: false, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, create_user: true }) });
  },
  async verifyCode(email: string, token: string) {
    const s = await raw("/auth/v1/verify", { method: "POST", auth: false, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "email", email, token }) });
    setSession(normalize(s));
  },
  async signOut() {
    try { await raw("/auth/v1/logout", { method: "POST" }); } catch {}
    setSession(null);
  },
};

// ---------- Tablo okuma ----------
type Filter = [string, string];
class Query<T = any> implements PromiseLike<T[]> {
  private f: Filter[] = []; private ord: string[] = []; private lim?: number;
  constructor(private table: string, private cols = "*") {}
  eq(c: string, v: any) { this.f.push([c, "eq." + v]); return this; }
  neq(c: string, v: any) { this.f.push([c, "neq." + v]); return this; }
  gte(c: string, v: any) { this.f.push([c, "gte." + v]); return this; }
  lt(c: string, v: any) { this.f.push([c, "lt." + v]); return this; }
  in(c: string, vs: any[]) { this.f.push([c, "in.(" + vs.map((v) => `"${v}"`).join(",") + ")"]); return this; }
  isNull(c: string) { this.f.push([c, "is.null"]); return this; }
  notNull(c: string) { this.f.push([c, "not.is.null"]); return this; }
  order(c: string, asc = true) { this.ord.push(c + (asc ? ".asc" : ".desc")); return this; }
  limit(n: number) { this.lim = n; return this; }
  url() {
    const p = new URLSearchParams();
    p.set("select", this.cols);
    for (const [c, v] of this.f) p.append(c, v);
    if (this.ord.length) p.set("order", this.ord.join(","));
    if (this.lim) p.set("limit", String(this.lim));
    return `/rest/v1/${this.table}?${p.toString()}`;
  }
  then<A, B>(ok?: ((v: T[]) => A | PromiseLike<A>) | null, err?: ((e: any) => B | PromiseLike<B>) | null) {
    return (call(this.url()) as Promise<T[]>).then(ok, err);
  }
}
export const from = <T = any>(table: string, cols = "*") => new Query<T>(table, cols);

export async function update(table: string, match: Record<string, string>, values: Record<string, any>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(match)) p.append(k, "eq." + v);
  return call(`/rest/v1/${table}?${p}`, { method: "PATCH", headers: { "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(values) });
}
export async function insert(table: string, values: Record<string, any>, upsertOn?: string) {
  const prefer = upsertOn ? "return=minimal,resolution=merge-duplicates" : "return=minimal";
  return call(`/rest/v1/${table}${upsertOn ? "?on_conflict=" + upsertOn : ""}`, { method: "POST", headers: { "Content-Type": "application/json", Prefer: prefer }, body: JSON.stringify(values) });
}
export async function remove(table: string, match: Record<string, string>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(match)) p.append(k, "eq." + v);
  return call(`/rest/v1/${table}?${p}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}

// ---------- RPC ----------
export async function rpc<T = any>(fn: string, args: Record<string, any> = {}): Promise<T> {
  return call(`/rest/v1/rpc/${fn}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args) });
}

// ---------- Dosyalar ----------
const BUCKET = "komsum";
export const ALLOWED = ["application/pdf", "image/jpeg", "image/png"];
export const MAX_BYTES = 5 * 1024 * 1024;

export function checkFile(file: File) {
  if (!ALLOWED.includes(file.type)) throw new ApiError("Yalnızca PDF, JPG veya PNG yüklenebilir.", 400);
  if (file.size > MAX_BYTES) throw new ApiError("Dosya en fazla 5 MB olabilir.", 400);
}

export async function upload(buildingId: string, file: File): Promise<string> {
  checkFile(file);
  const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
  const rand = (crypto as any).randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
  const path = `${buildingId}/${auth.userId}/${rand}.${ext}`;
  await call(`/storage/v1/object/${BUCKET}/${path}`, { method: "POST", headers: { "Content-Type": file.type, "x-upsert": "false" }, body: file });
  return path;
}

export async function fileUrl(path: string): Promise<string> {
  const r = await call(`/storage/v1/object/sign/${BUCKET}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: 600 }) });
  const signed: string = r.signedURL || r.signedUrl;
  return cfg().supabaseUrl + (signed.startsWith("/storage/v1") ? signed : "/storage/v1" + signed);
}

export const config = cfg;
