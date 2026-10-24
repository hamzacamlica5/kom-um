// POST /api/delete-account — kullanıcı kendi hesabını siler (Authorization: Bearer <oturum>).
import { deleteAccount } from "./_delete.js";
import { cors } from "./_cors.js";

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ message: "POST bekleniyor" });
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !SUPABASE_SECRET_KEY) return res.status(500).json({ message: "Sunucu ayarları eksik." });
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  try {
    const out = await deleteAccount({ supabaseUrl: SUPABASE_URL.replace(/\/$/, ""), publishableKey: SUPABASE_PUBLISHABLE_KEY, secretKey: SUPABASE_SECRET_KEY, userToken: token });
    res.status(out.status).json(out.body);
  } catch (e) {
    res.status(500).json({ message: "Hesap silinemedi. Biraz sonra tekrar dene." });
  }
}
