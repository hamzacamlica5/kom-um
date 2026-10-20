// Duyuru yazım yardımcısı: yöneticinin kısa notlarından OmniRoute (OpenAI uyumlu
// yapay zekâ ağ geçidi) üzerinden başlık + duyuru metni taslağı üretir.
// Anahtar yalnızca sunucuda durur; tarayıcı sadece /api/ai-draft'ı görür.

const MAX_NOTES = 1500;

export function omniEndpoint(baseUrl) {
  let u = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!/\/v1$/.test(u)) u += "/v1";
  return u + "/chat/completions";
}

const SYSTEM = [
  "Sen bir apartman yönetim uygulamasında yöneticiye duyuru yazdıran yardımcısın.",
  "Yöneticinin notlarından sakinlere gidecek kısa, net, nazik ve resmi olmayan ama saygılı bir Türkçe duyuru hazırla.",
  "Notlarda olmayan tarih, saat, tutar, isim veya telefon UYDURMA; eksik bilgi gerekiyorsa metne [köşeli parantez içinde] yer tutucu koy.",
  "Başlık en fazla 60 karakter olsun. Metin en fazla 120 kelime olsun, emoji kullanma.",
  'Yalnızca şu biçimde JSON döndür: {"title": "...", "body": "..."}',
].join(" ");

export function parseDraft(text) {
  let s = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a >= 0 && b > a) {
    try {
      const j = JSON.parse(s.slice(a, b + 1));
      const title = String(j.title || "").trim().slice(0, 120);
      const body = String(j.body || "").trim().slice(0, 4000);
      if (title && body) return { title, body };
    } catch {}
  }
  return null;
}

export async function draftAnnouncement({ supabaseUrl, publishableKey, omniUrl, omniKey, model, userToken, buildingId, notes, fetchImpl = fetch }) {
  if (!userToken) return { status: 401, body: { message: "Oturum bulunamadı." } };
  const n = String(notes || "").trim();
  if (!buildingId || typeof buildingId !== "string") return { status: 400, body: { message: "Apartman bilgisi eksik." } };
  if (n.length < 5) return { status: 400, body: { message: "Biraz daha not yaz, örneğin ne, ne zaman, kimi etkiliyor." } };
  if (n.length > MAX_NOTES) return { status: 400, body: { message: `Notlar en fazla ${MAX_NOTES} karakter olabilir.` } };

  // Yalnızca o apartmanın yöneticisi kullanabilir (kontrol kullanıcının kendi oturumuyla yapılır).
  const chk = await fetchImpl(supabaseUrl + "/rest/v1/rpc/is_manager", {
    method: "POST",
    headers: { apikey: publishableKey, Authorization: "Bearer " + userToken, "Content-Type": "application/json" },
    body: JSON.stringify({ b: buildingId }),
  });
  if (chk.status === 401) return { status: 401, body: { message: "Oturumun geçersiz. Tekrar giriş yapıp dene." } };
  if (!chk.ok || (await chk.json().catch(() => false)) !== true) return { status: 403, body: { message: "Bu özelliği yalnızca yönetici kullanabilir." } };

  let res;
  try {
    res = await fetchImpl(omniEndpoint(omniUrl), {
      method: "POST",
      headers: { Authorization: "Bearer " + omniKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || "auto",
        temperature: 0.4,
        max_tokens: 600,
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: "Notlarım:\n" + n }],
      }),
    });
  } catch {
    return { status: 502, body: { message: "Yapay zekâ servisine ulaşılamadı. Biraz sonra tekrar dene." } };
  }
  if (!res.ok) return { status: 502, body: { message: "Yapay zekâ servisi şu an yanıt vermiyor. Biraz sonra tekrar dene." } };
  const j = await res.json().catch(() => null);
  const draft = parseDraft(j?.choices?.[0]?.message?.content);
  if (!draft) return { status: 502, body: { message: "Taslak oluşturulamadı. Notlarını biraz değiştirip tekrar dene." } };
  return { status: 200, body: draft };
}
