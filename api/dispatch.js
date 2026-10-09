// POST /api/dispatch — veritabanı yeni bildirim eklediğinde (ve saatlik zamanlayıcı) çağırır.
import webpush from "web-push";
import { dispatchPending } from "./_dispatch.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST bekleniyor" });
  const secret = process.env.DISPATCH_SECRET;
  if (!secret || req.headers["x-dispatch-secret"] !== secret) return res.status(401).json({ error: "yetkisiz" });
  const { SUPABASE_URL, SUPABASE_SECRET_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return res.status(500).json({ error: "ortam değişkenleri eksik" });
  webpush.setVapidDetails(VAPID_SUBJECT || "mailto:destek@komsum.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  try {
    const out = await dispatchPending({
      supabaseUrl: SUPABASE_URL.replace(/\/$/, ""),
      secretKey: SUPABASE_SECRET_KEY,
      send: (sub, payload) => webpush.sendNotification(sub, payload, { TTL: 60 * 60 * 24, urgency: "high" }),
    });
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
}
