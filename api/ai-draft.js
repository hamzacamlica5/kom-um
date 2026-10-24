// POST /api/ai-draft — yönetici için duyuru taslağı (Authorization: Bearer <oturum>).
// Gövde: { building: "<apartman id>", notes: "kısa notlar" } → { title, body }
import { draftAnnouncement } from "./_ai.js";
import { cors } from "./_cors.js";

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ message: "POST bekleniyor" });
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, OMNIROUTE_URL, OMNIROUTE_API_KEY, OMNIROUTE_MODEL } = process.env;
  if (!OMNIROUTE_URL || !OMNIROUTE_API_KEY) return res.status(503).json({ message: "Yapay zekâ yardımcısı bu kurulumda açık değil." });
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return res.status(500).json({ message: "Sunucu ayarları eksik." });
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const out = await draftAnnouncement({
      supabaseUrl: SUPABASE_URL.replace(/\/$/, ""), publishableKey: SUPABASE_PUBLISHABLE_KEY,
      omniUrl: OMNIROUTE_URL, omniKey: OMNIROUTE_API_KEY, model: OMNIROUTE_MODEL,
      userToken: token, buildingId: body.building, notes: body.notes,
    });
    res.status(out.status).json(out.body);
  } catch (e) {
    res.status(500).json({ message: "Taslak oluşturulamadı. Biraz sonra tekrar dene." });
  }
}
