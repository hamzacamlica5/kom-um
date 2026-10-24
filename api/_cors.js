// Mağaza paketinden (Capacitor) gelen isteklere izin ver. Kimlik doğrulama çerezle değil
// Authorization başlığıyla yapıldığı için bu kaynaklara izin vermek güvenlidir.
const ALLOWED = ["capacitor://localhost", "https://localhost", "http://localhost"];

export function cors(req, res) {
  const o = req.headers.origin;
  if (o && ALLOWED.includes(o)) {
    res.setHeader("Access-Control-Allow-Origin", o);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  if (req.method === "OPTIONS") { res.status(204).end(); return true; }
  return false;
}
