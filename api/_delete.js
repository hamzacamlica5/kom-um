// Hesap silme: kullanıcının kendi oturumuyla veritabanı temizliğini yapar,
// ardından Supabase'deki giriş hesabını siler (yumuşak silme: e-posta ve
// kimlik bilgileri anonimleşir, muhasebe kayıtlarındaki bağlantılar bozulmaz).

export async function deleteAccount({ supabaseUrl, publishableKey, secretKey, userToken, fetchImpl = fetch }) {
  if (!userToken) return { status: 401, body: { message: "Oturum bulunamadı." } };
  const userHeaders = { apikey: publishableKey, Authorization: "Bearer " + userToken, "Content-Type": "application/json" };

  const who = await fetchImpl(supabaseUrl + "/auth/v1/user", { headers: userHeaders });
  if (!who.ok) return { status: 401, body: { message: "Oturumun geçersiz. Tekrar giriş yapıp dene." } };
  const user = await who.json();

  const prep = await fetchImpl(supabaseUrl + "/rest/v1/rpc/prepare_account_deletion", { method: "POST", headers: userHeaders, body: "{}" });
  if (!prep.ok) {
    let msg = "Hesap silinemedi.";
    try { msg = (await prep.json()).message || msg; } catch {}
    return { status: 400, body: { message: msg } };
  }

  const adminHeaders = { apikey: secretKey, "Content-Type": "application/json" };
  if (secretKey.startsWith("eyJ")) adminHeaders.Authorization = "Bearer " + secretKey;
  const del = await fetchImpl(supabaseUrl + "/auth/v1/admin/users/" + user.id, {
    method: "DELETE", headers: adminHeaders, body: JSON.stringify({ should_soft_delete: true }),
  });
  if (!del.ok) return { status: 500, body: { message: "Kişisel bilgilerin silindi ama giriş hesabı kapatılamadı. Lütfen destek ile iletişime geç." } };
  return { status: 200, body: { ok: true } };
}
