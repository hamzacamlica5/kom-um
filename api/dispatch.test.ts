import { expect, test } from "bun:test";
// @ts-ignore
import { dispatchPending } from "./_dispatch.js";

function fakeSupabase(state: { notifications: any[]; subs: any[] }) {
  const calls: string[] = [];
  const fetchImpl = async (url: string, init: any = {}) => {
    const u = new URL(url); const path = u.pathname.replace("/rest/v1/", ""); const m = init.method || "GET";
    calls.push(m + " " + path);
    const ok = (body: any) => new Response(body === null ? "" : JSON.stringify(body), { status: 200 });
    if (m === "GET" && path === "notifications") return ok(state.notifications.filter((n) => !n.push_sent_at && (n.push_attempts || 0) < 3));
    if (m === "GET" && path === "push_subscriptions") return ok(state.subs);
    if (m === "PATCH" && path === "notifications") {
      const id = u.searchParams.get("id")!.replace("eq.", "");
      Object.assign(state.notifications.find((n) => n.id === id), JSON.parse(init.body)); return ok(null);
    }
    if (m === "DELETE" && path === "push_subscriptions") {
      const ids = u.searchParams.get("id")!.replace(/^in\.\(|\)$/g, "").split(",").map((s) => s.replace(/"/g, ""));
      state.subs = state.subs.filter((s) => !ids.includes(s.id)); return ok(null);
    }
    return new Response("?", { status: 404 });
  };
  return { fetchImpl, calls };
}

test("bildirimleri abonelere gönderir, ölü abonelikleri siler, başarısızları tekrar denemeye bırakır", async () => {
  const state = {
    notifications: [
      { id: "n1", user_id: "u1", title: "Duyuru", body: "Su kesintisi", url: "/duyurular", kind: "announcement", push_attempts: 0 },
      { id: "n2", user_id: "u2", title: "Ödemen onaylandı", body: "", url: "/aidat", kind: "notice_approved", push_attempts: 0 },
      { id: "n3", user_id: "u3", title: "Aboneliksiz", body: "", url: "/", kind: "x", push_attempts: 0 },
      { id: "n4", user_id: "u4", title: "Geçici hata", body: "", url: "/", kind: "x", push_attempts: 1 },
    ],
    subs: [
      { id: "s1", user_id: "u1", endpoint: "https://push/1", p256dh: "a", auth: "b" },
      { id: "s2", user_id: "u1", endpoint: "https://push/gone", p256dh: "a", auth: "b" },
      { id: "s3", user_id: "u2", endpoint: "https://push/3", p256dh: "a", auth: "b" },
      { id: "s4", user_id: "u4", endpoint: "https://push/down", p256dh: "a", auth: "b" },
    ],
  };
  const { fetchImpl } = fakeSupabase(state);
  const sent: any[] = [];
  const send = async (sub: any, payload: string) => {
    if (sub.endpoint.endsWith("gone")) throw Object.assign(new Error("gone"), { statusCode: 410 });
    if (sub.endpoint.endsWith("down")) throw Object.assign(new Error("down"), { statusCode: 503 });
    sent.push({ to: sub.endpoint, ...JSON.parse(payload) });
  };
  const out = await dispatchPending({ supabaseUrl: "https://x.supabase.co", secretKey: "sb_secret_test", send, fetchImpl });
  expect(out.sent).toBe(2);
  expect(sent.map((s) => s.to).sort()).toEqual(["https://push/1", "https://push/3"]);
  expect(sent.find((s) => s.to === "https://push/1").url).toBe("/duyurular");
  expect(state.notifications.find((n) => n.id === "n1").push_sent_at).toBeTruthy();
  expect(state.notifications.find((n) => n.id === "n3").push_sent_at).toBeTruthy(); // aboneliği yok, tekrar denenmez
  expect(state.notifications.find((n) => n.id === "n4").push_sent_at).toBeUndefined();
  expect(state.notifications.find((n) => n.id === "n4").push_attempts).toBe(2);
  expect(state.subs.map((s) => s.id)).not.toContain("s2");
});

test("kuyruk boşsa hiçbir şey göndermez", async () => {
  const { fetchImpl, calls } = fakeSupabase({ notifications: [], subs: [] });
  const out = await dispatchPending({ supabaseUrl: "https://x.supabase.co", secretKey: "eyJlegacy", send: async () => { throw new Error("çağrılmamalı"); }, fetchImpl });
  expect(out.sent).toBe(0);
  expect(calls.length).toBe(1);
});
