import { expect, test } from "bun:test";
// @ts-ignore
import { deleteAccount } from "./_delete.js";

const base = { supabaseUrl: "https://x.supabase.co", publishableKey: "sb_publishable_x", secretKey: "sb_secret_y" };

function fake(routes: Record<string, (init: any) => Response>) {
  const calls: { url: string; init: any }[] = [];
  const fetchImpl = async (url: string, init: any = {}) => {
    calls.push({ url, init });
    const key = (init.method || "GET") + " " + url.replace(base.supabaseUrl, "");
    const h = routes[key];
    return h ? h(init) : new Response("{}", { status: 404 });
  };
  return { fetchImpl, calls };
}

test("hesabı siler: önce veritabanı temizliği, sonra yumuşak silme", async () => {
  const { fetchImpl, calls } = fake({
    "GET /auth/v1/user": () => new Response(JSON.stringify({ id: "u1" })),
    "POST /rest/v1/rpc/prepare_account_deletion": () => new Response("", { status: 204 }),
    "DELETE /auth/v1/admin/users/u1": () => new Response("{}"),
  });
  const out = await deleteAccount({ ...base, userToken: "tok", fetchImpl });
  expect(out.status).toBe(200);
  expect(calls.map((c) => c.init.method || "GET")).toEqual(["GET", "POST", "DELETE"]);
  expect(calls[1].init.headers.Authorization).toBe("Bearer tok");
  expect(calls[2].init.headers.apikey).toBe("sb_secret_y");
  expect(JSON.parse(calls[2].init.body).should_soft_delete).toBe(true);
});

test("yönetici devretmeden silemez: veritabanı hatası kullanıcıya iletilir, hesap silinmez", async () => {
  const { fetchImpl, calls } = fake({
    "GET /auth/v1/user": () => new Response(JSON.stringify({ id: "u1" })),
    "POST /rest/v1/rpc/prepare_account_deletion": () => new Response(JSON.stringify({ message: "Lale apartmanının yöneticisisin. Hesabını silmeden önce yönetimi bir sakine devret." }), { status: 400 }),
  });
  const out = await deleteAccount({ ...base, userToken: "tok", fetchImpl });
  expect(out.status).toBe(400);
  expect(out.body.message).toContain("devret");
  expect(calls.some((c) => c.init.method === "DELETE")).toBe(false);
});

test("geçersiz oturum reddedilir", async () => {
  const { fetchImpl } = fake({ "GET /auth/v1/user": () => new Response("{}", { status: 401 }) });
  expect((await deleteAccount({ ...base, userToken: "x", fetchImpl })).status).toBe(401);
  expect((await deleteAccount({ ...base, userToken: "", fetchImpl })).status).toBe(401);
});
