# Apartmanca ürün kararları (eski adı KOMŞUM)

Bu dosya, ürünle ilgili verilen kararların kaydıdır. Yeni bir özellik geliştirirken önce buraya bakılır.

## İlkeler
- **Güven her şeyden önce gelir.** Standartların üzerinde bir ürün hedefleniyor; kullanıcı kadar şirketin kendisi de korunur.
- **Para kayıtları silinmez.** İptaller gerekçeyle yapılır, kasa düzeltmeleri ters kayıtla yapılır.
- **Kişisel veri satılmaz, kişisel veriye dayalı reklam gösterilmez.**
- **Uygulama 112'nin yerine geçmez.** Her acil ekranında "önce 112'yi ara" yazar.

## Fiyatlandırma
- Ücreti apartman (yönetim) öder; sakinlerden ayrıca ücret alınmaz.
- **Fiyat (17 Ekim 2026, kesin):** daire başı aylık **15 TL, KDV dahil**, en az **99 TL**/ay. Örnek: 10 daire 150 TL, 40 daire 600 TL.
- **Yıllık ödeme:** 12 ay kullan, 10 ay öde (yaklaşık %17 indirim; para peşin, tek komisyon, uzun bağlılık).
- Açık konu: büyük sitelerde kademe (ör. ilk 100 daire 15 TL, sonrası 10 TL) pilotta değerlendirilecek.
- Ödeme sağlayıcı: **iyzico Abonelik** (şirket, iyzico ve PayTR hesapları mevcut). PayTR yedekte.
- **Ödeme sistemi eklendiğinde: 30 gün ücretsiz deneme.** (15 Ekim 2026)
  - Kart bilgisi istenmeden başlar.
  - Bitişten 7 gün ve 1 gün önce yöneticiye hatırlatma gider.
  - Süre dolup ödeme yapılmazsa veriler silinmez ve kilitlenmez: kayıtlar görüntülenebilir ve Excel'e aktarılabilir, yalnızca yeni kayıt ekleme durur.
- Abonelik uygulama içinden değil web üzerinden (iyzico/PayTR) alınır; mağaza komisyonundan kaçınılır.

## Sponsorlu hizmet firmaları
- Asansör bakımı, temizlik vb. firmalar ücret karşılığı, belirli süreyle listelenir.
- Yalnızca yöneticilere gösterilir; sakinler hiçbir sponsorlu içerik görmez.
- Ekran başına en fazla 2 firma, "Sponsorlu" etiketi ve "Bu firmayı neden görüyorum?" açıklaması.
- Firmalar listelenmeden önce vergi kaydı ve yetki belgeleri kontrol edilir; düşük puanlı firma ödeme yapmış olsa da kaldırılır.
- Seçim yalnızca apartmanın il/ilçesine göre yapılır; kullanıcı bilgisi firmaya yalnızca "Teklif iste" ile ve açık onayla gider.
- Zamanlama: altyapı pilottan sonra kurulacak.

## Marka ve alan adı (17 Ekim 2026)
- **21 Ekim 2026: Uygulama Apartmanca adına geçirildi.** (Ekran, yasal metinler, bildirimler, kurulum notları.) İç teknik adlar (`komsum` depolama alanı, tarayıcı anahtarları, cron işi) oturumlar bozulmasın diye aynen bırakıldı; kullanıcı bunları görmez.
- Bekleyen: alan adı + marka vekili görüşü + marka başvurusu; Supabase e-posta şablonu ve SMTP gönderici adı; tanıtım videoları (alan adı alınınca yeni adresle yeniden üretilecek).
- **KOMŞUM adı bırakılıyor.** Apsiyon'un "Komşum Var" tescili (2022/008391, sınıf 35/42) ve alandaki benzer "komşu" markaları yüzünden risk yüksek. "Komşu" içeren isimlerden (Komşu Komşu dahil; komsukomsu .com/.com.tr/.tr/.biz başkasında) tümden vazgeçildi.
- **Ana aday: Apartmanca.**
  - TÜRKPATENT: "apartmanca" adına kayıt yok (yalnızca ilgisiz "akapartmancaddebostan", Akiş GYO, 36/42/43).
  - Risk: **Apartmanya** (2018/29692, Bildaş Teknoloji, 35/42, tescilli) itiraz edebilir.
  - Lehimize emsal: Apartmanya varken sonradan **apartmanım** (2025/040941, 09/42), **apartman724** (2026/017836, 09/35/36/42) ve **apartman+** (2025/113027, 35) tescil edilmiş; kurum "apartman" kökünü genel sayıyor.
  - Alan adı: apartmanca.com boş.
- Yedek adaylar (marka araması ve .com temiz): **Camkasa**, **Kapıdaş**, **Binadaş**.
- Elenenler: Apartmanya (tescilli), Apartmania/Apartmanım (.com alınmış), Binyön (binyon.com 2003'ten beri alınmış, "bin yön" diye okunuyor), Açık Kasa, Çatıaltı, Avlu, Binam, Zilim, Apartik, Apto, Blokk, Dairem.
- **Yapılacaklar (kullanıcı):**
  1. apartmanca.com **ve** apartmanca.com.tr alınacak (yalnızca alan adı, ek paket yok). Ana adres .com, .com.tr ona yönlenecek.
  2. Marka vekiline sorulacak: "Apartmanca'yı 9/35/36/42. sınıflarda başvursak Apartmanya, Apartmanım, Apartman724 karşısında risk var mı?" (TÜRKPATENT "apartman ile başlayan" sonuç PDF'i gösterilecek.)
  3. Olumlu görüş gelince marka başvurusu hemen yapılacak (9, 35, 36, 42).
  4. İsim 5–10 kişiyle test edilecek (ne işe yarar? yazabilir mi? ertesi gün hatırlıyor mu?).
- **Ardından (Claude):** uygulamadaki KOMŞUM adı, logo, yasal metinler, e-posta şablonları ve tanıtım videoları yeni isme göre güncellenecek.

## Sıradaki işler
- Alan adı (kullanıcı alacak) → Vercel'e bağlama (.com ana, .com.tr yönlendirme), Supabase site adresi, videodaki adres.
- Yasal metinlerdeki veri sorumlusu bilgileri (kişi/şirket adı, adres, e-posta).
- Acil uyarı ve "İyiyim / Yardım lazım" yoklaması (ayrı ve dikkatli test edilerek).
- Pilot (3–5 apartman), Google Play kapalı test, ardından ödeme sistemi ve App Store.
- Tanıtım videoları için seslendirme (kullanıcı kaydedip gönderecek).
