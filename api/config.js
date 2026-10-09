// GET /api/config — tarayıcının ihtiyaç duyduğu herkese açık ayarlar (gizli anahtar içermez).
export default function handler(req, res) {
  const cfg = {
    supabaseUrl: (process.env.SUPABASE_URL || "").replace(/\/$/, ""),
    supabaseKey: process.env.SUPABASE_PUBLISHABLE_KEY || "",
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || "",
  };
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).send("window.KOMSUM=" + JSON.stringify(cfg) + ";");
}
