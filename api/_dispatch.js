// Bildirim kuyruğunu boşaltır: gönderilmemiş bildirimleri ilgili kişilerin
// telefonlarına Web Push ile iletir. Gönderici ve fetch dışarıdan verilir
// (testte sahteleri kullanılır).

export async function dispatchPending({ supabaseUrl, secretKey, send, fetchImpl = fetch, now = () => new Date(), limit = 200 }) {
  const headers = { apikey: secretKey, "Content-Type": "application/json" };
  if (secretKey.startsWith("eyJ")) headers.Authorization = "Bearer " + secretKey;
  const rest = async (path, init = {}) => {
    const r = await fetchImpl(supabaseUrl + "/rest/v1/" + path, { ...init, headers: { ...headers, ...(init.headers || {}) } });
    if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  };

  const since = new Date(now().getTime() - 24 * 3600 * 1000).toISOString();
  const pending = await rest(`notifications?select=id,user_id,title,body,url,kind,push_attempts&push_sent_at=is.null&push_attempts=lt.3&created_at=gte.${encodeURIComponent(since)}&order=created_at.asc&limit=${limit}`);
  if (!pending.length) return { sent: 0, failed: 0, notifications: 0 };

  const users = [...new Set(pending.map((n) => n.user_id))];
  const subs = await rest(`push_subscriptions?select=id,user_id,endpoint,p256dh,auth&user_id=in.(${users.map((u) => `"${u}"`).join(",")})`);
  const byUser = new Map();
  for (const s of subs) { if (!byUser.has(s.user_id)) byUser.set(s.user_id, []); byUser.get(s.user_id).push(s); }

  let sent = 0, failed = 0;
  const dead = new Set();
  for (const n of pending) {
    const targets = byUser.get(n.user_id) || [];
    let ok = targets.length === 0; // aboneliği olmayan kişi: uygulama içinde görür, tekrar denemeye gerek yok
    for (const s of targets) {
      if (dead.has(s.id)) continue;
      try {
        await send({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: n.title, body: n.body, url: n.url || "/", tag: n.kind + ":" + n.id }));
        ok = true; sent++;
      } catch (e) {
        failed++;
        const code = e && (e.statusCode || e.status);
        if (code === 404 || code === 410) dead.add(s.id);
      }
    }
    // tüm abonelikleri ölmüşse de tekrar denemeyiz
    if (!ok && targets.every((s) => dead.has(s.id))) ok = true;
    const patch = ok ? { push_sent_at: now().toISOString() } : { push_attempts: (n.push_attempts || 0) + 1 };
    await rest(`notifications?id=eq.${n.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
  }
  if (dead.size) {
    await rest(`push_subscriptions?id=in.(${[...dead].map((x) => `"${x}"`).join(",")})`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  }
  return { sent, failed, notifications: pending.length, removedSubscriptions: dead.size };
}
