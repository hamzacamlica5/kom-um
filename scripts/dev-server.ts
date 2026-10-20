// Yerel geliştirme sunucusu: dist klasörünü sunar ve Supabase'in uygulamanın
// kullandığı kısmını (giriş, REST, RPC, dosya) yerel Postgres üzerinde taklit eder.
// Giriş kodu her zaman 123456. Yalnızca geliştirme içindir.
import { SQL } from "bun";
import { mkdirSync, existsSync } from "fs";
// @ts-ignore
import { draftAnnouncement } from "../api/_ai.js";

const PORT = Number(process.env.PORT || 5173);
const DB = process.env.DEV_DB || "postgres://postgres@localhost:5433/komsum_dev";
const root = new URL("..", import.meta.url).pathname;
const FILES = "/tmp/komsum-files/";
mkdirSync(FILES, { recursive: true });
const sql = new SQL(DB);

const lit = (v: any): string => {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "object") return "'" + JSON.stringify(v).replace(/'/g, "''") + "'";
  return "'" + String(v).replace(/'/g, "''") + "'";
};
const ident = (s: string) => { if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw new Error("geçersiz ad " + s); return '"' + s + '"'; };

function userFrom(req: Request): { sub: string; email: string } | null {
  const a = req.headers.get("authorization");
  if (!a?.startsWith("Bearer dev.")) return null;
  try { return JSON.parse(atob(a.slice(11))); } catch { return null; }
}

async function asUser<T>(u: { sub: string } | null, q: string): Promise<T> {
  return sql.begin(async (tx) => {
    await tx.unsafe(`select set_config('request.jwt.claims', ${lit(JSON.stringify(u ? { sub: u.sub, role: "authenticated" } : {}))}, true)`);
    await tx.unsafe(`set local role ${u ? "authenticated" : "anon"}`);
    return tx.unsafe(q);
  }) as any;
}

function where(params: URLSearchParams) {
  const conds: string[] = [];
  for (const [k, v] of params) {
    if (["select", "order", "limit", "on_conflict"].includes(k)) continue;
    const col = ident(k);
    let m;
    if (v === "is.null") conds.push(`${col} is null`);
    else if (v === "not.is.null") conds.push(`${col} is not null`);
    else if ((m = v.match(/^(eq|neq|gte|lt|gt|lte)\.(.*)$/s))) conds.push(`${col} ${{ eq: "=", neq: "<>", gte: ">=", lt: "<", gt: ">", lte: "<=" }[m[1]]} ${lit(m[2])}`);
    else if ((m = v.match(/^in\.\((.*)\)$/s))) conds.push(`${col} in (${m[1].split(",").map((x) => lit(x.replace(/^"|"$/g, ""))).join(",")})`);
    else throw new Error("desteklenmeyen filtre " + k + "=" + v);
  }
  return conds.length ? " where " + conds.join(" and ") : "";
}

const json = (b: any, status = 200) => new Response(b === undefined ? "" : JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

async function supabase(req: Request, path: string): Promise<Response> {
  const url = new URL(req.url);
  const u = userFrom(req);
  try {
    // ---------- auth ----------
    if (path === "/auth/v1/otp") return json({});
    if (path === "/auth/v1/verify") {
      const { email, token } = await req.json();
      if (token !== "123456") return json({ msg: "Token has expired or is invalid" }, 403);
      const r = await sql.unsafe(`insert into auth.users(id, email) values (md5(${lit(email)})::uuid, ${lit(email)}) on conflict (id) do update set email = excluded.email returning id`);
      const user = { id: r[0].id, email };
      return json({ access_token: "dev." + btoa(JSON.stringify({ sub: user.id, email })), refresh_token: "r-" + user.id, expires_in: 3600, user });
    }
    if (path === "/auth/v1/token") {
      const { refresh_token } = await req.json();
      const id = refresh_token.slice(2);
      const r = await sql.unsafe(`select email from auth.users where id = ${lit(id)}`);
      return json({ access_token: "dev." + btoa(JSON.stringify({ sub: id, email: r[0]?.email })), refresh_token, expires_in: 3600, user: { id, email: r[0]?.email } });
    }
    if (path === "/auth/v1/logout") return new Response(null, { status: 204 });

    // ---------- rpc ----------
    let m = path.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/);
    if (m) {
      const fn = m[1];
      const args = req.method === "POST" ? await req.json().catch(() => ({})) : {};
      const info = await sql.unsafe(`select proretset, prorettype::regtype::text as rt from pg_proc where proname = ${lit(fn)} and pronamespace = 'public'::regnamespace limit 1`);
      if (!info.length) return json({ message: "fonksiyon yok: " + fn, code: "PGRST202" }, 404);
      const call = `public.${ident(fn)}(${Object.entries(args).map(([k, v]) => `${ident(k)} => ${lit(v)}`).join(", ")})`;
      const q = info[0].proretset ? `select coalesce(json_agg(t), '[]'::json) as j from ${call} t` : `select to_json(${call}) as j`;
      const r: any = await asUser(u, q);
      return info[0].rt === "void" ? new Response(null, { status: 204 }) : json(r[0].j);
    }

    // ---------- tablolar ----------
    m = path.match(/^\/rest\/v1\/([a-z_]+)$/);
    if (m) {
      const table = "public." + ident(m[1]);
      const p = url.searchParams;
      if (req.method === "GET") {
        const cols = (p.get("select") || "*").split(",").map((c) => (c === "*" ? "*" : ident(c))).join(",");
        const order = p.get("order") ? " order by " + p.get("order")!.split(",").map((o) => { const [c, d] = o.split("."); return ident(c) + (d === "desc" ? " desc" : " asc"); }).join(",") : "";
        const limit = p.get("limit") ? " limit " + Number(p.get("limit")) : "";
        const r: any = await asUser(u, `select coalesce(json_agg(t), '[]'::json) as j from (select ${cols} from ${table}${where(p)}${order}${limit}) t`);
        return json(r[0].j);
      }
      if (req.method === "PATCH") {
        const body = await req.json();
        await asUser(u, `update ${table} set ${Object.entries(body).map(([k, v]) => `${ident(k)} = ${lit(v)}`).join(", ")}${where(p)}`);
        return new Response(null, { status: 204 });
      }
      if (req.method === "DELETE") { await asUser(u, `delete from ${table}${where(p)}`); return new Response(null, { status: 204 }); }
      if (req.method === "POST") {
        const body = await req.json();
        const ks = Object.keys(body);
        await asUser(u, `insert into ${table}(${ks.map(ident).join(",")}) values (${ks.map((k) => lit(body[k])).join(",")})`);
        return new Response(null, { status: 201 });
      }
    }

    // ---------- dosyalar ----------
    m = path.match(/^\/storage\/v1\/object\/sign\/komsum\/(.+)$/);
    if (m && req.method === "POST") {
      const name = decodeURIComponent(m[1]);
      const r: any = await asUser(u, `select count(*)::int as n from storage.objects where bucket_id = 'komsum' and name = ${lit(name)}`);
      if (!r[0].n) return json({ message: "Object not found", statusCode: "404" }, 400);
      return json({ signedURL: `/object/sign/komsum/${name}?token=dev` });
    }
    if (m && req.method === "GET") {
      const f = Bun.file(FILES + m[1].replace(/\//g, "__"));
      return (await f.exists()) ? new Response(f) : new Response("yok", { status: 404 });
    }
    m = path.match(/^\/storage\/v1\/object\/komsum\/(.+)$/);
    if (m && req.method === "POST") {
      const name = decodeURIComponent(m[1]);
      const type = req.headers.get("content-type") || "";
      const buf = await req.arrayBuffer();
      if (buf.byteLength > 5242880) return json({ message: "The object exceeded the maximum allowed size", statusCode: "413" }, 413);
      if (!["application/pdf", "image/jpeg", "image/png"].includes(type)) return json({ message: "mime type " + type + " is not supported", statusCode: "415" }, 400);
      await asUser(u, `insert into storage.objects(bucket_id, name, owner) values ('komsum', ${lit(name)}, auth.uid())`);
      await Bun.write(FILES + name.replace(/\//g, "__"), buf);
      return json({ Key: "komsum/" + name });
    }
    return json({ message: "dev: bilinmeyen yol " + path }, 404);
  } catch (e: any) {
    const msg = String(e?.message || e);
    const status = /permission denied|row-level security/.test(msg) ? 403 : 400;
    return json({ message: msg, code: e?.errno || e?.code }, status);
  }
}

Bun.serve({
  port: PORT,
  idleTimeout: 30,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/sb/")) return supabase(req, url.pathname.slice(3));
    if (url.pathname === "/api/delete-account" && req.method === "POST") {
      const u = userFrom(req);
      if (!u) return json({ message: "Oturum bulunamadı." }, 401);
      try { await asUser(u, "select public.prepare_account_deletion()"); } catch (e: any) { return json({ message: String(e.message) }, 400); }
      await sql.unsafe(`update auth.users set email = 'silindi-' || id where id = ${lit(u.sub)}`);
      return json({ ok: true });
    }
    if (url.pathname === "/api/ai-draft" && req.method === "POST") {
      // Yerelde denemek için: OMNIROUTE_URL ve OMNIROUTE_API_KEY ortam değişkenleriyle başlat.
      if (!process.env.OMNIROUTE_URL || !process.env.OMNIROUTE_API_KEY) return json({ message: "Yapay zekâ yardımcısı bu kurulumda açık değil." }, 503);
      const body = await req.json().catch(() => ({}));
      const out = await draftAnnouncement({
        supabaseUrl: url.origin + "/sb", publishableKey: "dev",
        omniUrl: process.env.OMNIROUTE_URL, omniKey: process.env.OMNIROUTE_API_KEY, model: process.env.OMNIROUTE_MODEL,
        userToken: (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""), buildingId: body.building, notes: body.notes,
      });
      return json(out.body, out.status);
    }
    if (url.pathname === "/api/config") {
      const aiEnabled = !!(process.env.OMNIROUTE_URL && process.env.OMNIROUTE_API_KEY);
      return new Response(`window.KOMSUM=${JSON.stringify({ supabaseUrl: url.origin + "/sb", supabaseKey: "dev", vapidPublicKey: "", aiEnabled })};`, { headers: { "Content-Type": "application/javascript" } });
    }
    const file = Bun.file(root + "dist" + (url.pathname === "/" ? "/index.html" : url.pathname));
    if (url.pathname !== "/" && existsSync(root + "dist" + url.pathname)) return new Response(file);
    return new Response(Bun.file(root + "dist/index.html"), { headers: { "Content-Type": "text/html; charset=utf-8" } });
  },
});
console.log("KOMŞUM geliştirme sunucusu: http://localhost:" + PORT);
