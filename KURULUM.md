# KOMŞUM kurulum rehberi

Uygulama üç ücretsiz hizmet üzerinde çalışır. Hepsi senin hesabında durur; kod ve veriler tamamen sana aittir.

| Hizmet | Ne işe yarar |
|---|---|
| **GitHub** | Kodun saklandığı yer |
| **Supabase** | Veritabanı, giriş ve dosyalar (dekont, fotoğraf, evrak) |
| **Vercel** | Uygulamanın internetteki adresi ve telefon bildirimleri |

Toplam süre yaklaşık 30–40 dakika. Bir adımda takılırsan Claude'a yaz.

---

## 1. GitHub

1. github.com'da ücretsiz hesap aç.
2. Sağ üstteki **+** → **New repository**. Adı `komsum` olsun, **Private** seç, **Create repository** de.
3. Kodu yükle:
   - **Kolay yol:** claude.ai → Ayarlar → Connectors → GitHub'ı bağla. Claude kodu senin yerine yükler.
   - **Elle:** `komsum.zip` dosyasını çıkar, GitHub'daki boş repoda **uploading an existing file** bağlantısına tıklayıp klasörün **içindekileri** sürükle bırak, **Commit changes** de.

## 2. Supabase

1. supabase.com'da GitHub hesabınla giriş yap → **New project**.
   - Ad: `komsum` · Bölge: **Central EU (Frankfurt)** · Veritabanı şifresini bir yere kaydet.
2. Proje açılınca soldan **SQL Editor** → **New query**. `supabase/schema.sql` dosyasının tamamını yapıştır, **Run** de. "Success" görmelisin.
3. **Authentication → Emails → Templates**:
   - **Magic Link** ve **Confirm signup** şablonlarının ikisinin de içeriğini şununla değiştir:
     ```html
     <h2>KOMŞUM giriş kodun</h2>
     <p>Uygulamaya şu kodu yaz:</p>
     <p style="font-size:28px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
     <p>Kod 1 saat geçerlidir. Bu isteği sen yapmadıysan e-postayı yok say.</p>
     ```
   - Konu satırı: `KOMŞUM giriş kodun`
4. **Authentication → Emails → SMTP Settings** → **Enable custom SMTP** (zorunlu, aşağıya bak).
5. **Project Settings → API Keys**: şu iki değeri not al:
   - **Publishable key** (`sb_publishable_...`)
   - **Secret key** (`sb_secret_...`) — bunu kimseyle paylaşma.
   - Proje adresi: **Project Settings → Data API** sayfasındaki URL (`https://xxxx.supabase.co`).

### Neden kendi e-posta sunucun gerekli?
Supabase'in yerleşik e-posta servisi yalnızca proje ekibindeki adreslere ve saatte 2 e-posta gönderir. Sakinlere giriş kodu gidebilmesi için SMTP gerekir. Pilot için en kolayı Gmail:

1. Gmail hesabında iki adımlı doğrulamayı aç.
2. myaccount.google.com → **Uygulama şifreleri** → "KOMŞUM" adıyla 16 haneli şifre oluştur.
3. Supabase SMTP ayarları:
   - Sender email: Gmail adresin · Sender name: `KOMŞUM`
   - Host: `smtp.gmail.com` · Port: `587`
   - Username: Gmail adresin · Password: 16 haneli uygulama şifresi
4. **Authentication → Rate Limits** bölümünde e-posta sınırını saatte 30 civarına çıkar.

Gmail günde yaklaşık 500 e-postaya izin verir; pilot için yeter. Büyüyünce kendi alan adınla Brevo veya Resend'e geçilir.

## 3. Vercel

1. vercel.com'da **GitHub ile** giriş yap → **Add New → Project** → `komsum` reposunu **Import** et.
2. Framework Preset: **Other**. Diğer ayarlara dokunma (repodaki `vercel.json` hepsini ayarlıyor).
3. **Environment Variables** bölümüne şunları ekle:

| Ad | Değer |
|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` |
| `VAPID_PUBLIC_KEY` | Claude'un verdiği genel anahtar |
| `VAPID_PRIVATE_KEY` | Claude'un verdiği özel anahtar |
| `VAPID_SUBJECT` | `mailto:senin@gmail.com` |
| `DISPATCH_SECRET` | Claude'un verdiği uzun rastgele metin |

4. **Deploy** de. Bitince adresin hazır: `https://komsum-xxxx.vercel.app` (Settings → Domains'ten adını değiştirebilirsin).

## 4. Bildirimleri bağla

Supabase → **SQL Editor**'de, adresini ve gizli metni yazarak çalıştır:

```sql
insert into app_config(key, value) values
  ('dispatch_url', 'https://SENIN-ADRESIN.vercel.app/api/dispatch'),
  ('dispatch_secret', 'DISPATCH_SECRET ile aynı metin')
on conflict (key) do update set value = excluded.value;
```

Ardından Supabase → **Authentication → URL Configuration** → **Site URL** alanına Vercel adresini yaz.

## 5. Dene

1. Telefonda Vercel adresini aç, e-postanla giriş yap, apartmanını kur.
2. iPhone: Safari → Paylaş → **Ana Ekrana Ekle**. Android: Chrome → ⋮ → **Uygulamayı yükle**.
3. Ana ekrandaki KOMŞUM simgesinden aç → **Menü → Ayarlar → Bildirimleri aç** → **Test bildirimi gönder**.

---

## Bilgiler

- **Otomatik aidat hatırlatması** Supabase'in saatlik zamanlayıcısıyla (pg_cron) çalışır; `schema.sql` bunu kendisi kurar.
- **Hiçbir kayıt silinmez.** Ödeme, gider, duyuru ve belge iptalleri gerekçeyle kayıt altına alınır; kasa hareketleri ters kayıtla düzeltilir.
- **Güvenlik:** Para ve rol içeren her işlem veritabanındaki kurallardan geçer. Sakin yalnızca kendi dairesinin borcunu ve dekontunu görür; kasa ve giderler tüm sakinlere açıktır.
- **Ücretsiz sınırlar:** Supabase ücretsiz planı 500 MB veritabanı ve 1 GB dosya alanı verir; bir hafta hiç kullanılmayan proje duraklatılır (panelden tek tıkla açılır). Gerçek apartmanlarla kullanmaya başlayınca Supabase Pro'ya (aylık 25 $) geçmek iyi olur.

## Güncellemeler

Veritabanını değiştiren her güncelleme `supabase/guncellemeler/` klasörüne tarihli bir dosya olarak eklenir. Supabase → SQL Editor'de o dosyayı bir kez çalıştırman yeterli. `schema.sql` her zaman en güncel halin tamamıdır; sıfırdan kurulumda yalnızca onu çalıştır.

## Yayından önce

- `src/screens/legal.tsx` başındaki `LEGAL` bilgilerini (veri sorumlusunun adı/unvanı, adres, e-posta) doldur.
- Yasal metinler taslaktır; ücretli kullanıma geçmeden önce bir avukata kontrol ettir.

## Geliştirme (Claude için not)

- `bun scripts/build.ts` → `dist/` klasörünü üretir. Vercel derleme yapmaz, `dist/` olduğu gibi yayınlanır; kod değişince yeniden derleyip `dist/` ile birlikte gönder.
- `bun scripts/dev-server.ts` → yerel Postgres üzerinde Supabase taklidiyle çalışır (giriş kodu `123456`).
- `bash supabase/tests/run.sh` → veritabanı kurallarının testleri. `bun test` → istemci ve bildirim gönderici testleri. `node scripts/e2e.mjs` ve `node scripts/e2e-2.mjs` → tarayıcıda uçtan uca senaryolar.
