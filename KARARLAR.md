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

## Tanıtım sitesi ve mevzuat (21 Ekim 2026)
- apartmanca.com = tanıtım sitesi (`site/`, ayrı Vercel projesi), app.apartmanca.com = uygulama.
- Site ve uygulama **hiçbir dış sunucudan kaynak yüklemez** (Google Fonts kaldırıldı, yazı tipi kendi sunucumuzda). Sitede çerez, analiz, reklam yok → çerez onay penceresi gerekmiyor. Analiz eklenirse önce açık rıza alınacak.
- Yasal metinler tek kaynakta (`src/legal/texts.tsx`): KVKK, gizlilik, çerez, kullanım şartları, ön bilgilendirme, mesafeli satış, iptal-iade, iletişim/künye. Şirket bilgileri ve fiyat `src/legal/info.ts`.
- İade politikası (kullanıcı onayı bekliyor): ilk ödemeden sonra 14 gün koşulsuz tam iade; yıllık yenilemede de 14 gün; aylık yenilemede o ay iade yok. Yıllık yenilemeden 7 gün önce e-posta hatırlatma. Fiyat değişikliği 30 gün önceden bildirilir.
- Hukukçuya sorulacaklar: KVKK m. 9 yurt dışı aktarım (Vercel ABD, Supabase AB, Google e-posta) için standart sözleşme ve Kurum'a bildirim; VERBİS muafiyeti; 5651 trafik kaydı saklama; metinlerin genel kontrolü.

## Mağazalar (24 Ekim 2026)
- Hedef: kısa sürede App Store ve Google Play. Şirket şahıs şirketi → Apple'da **bireysel** hesap (D-U-N-S gerekmez, satıcı adı kişi adı). Google'da D-U-N-S ile şirket hesabı denenecek; olmazsa kişisel hesap + 12 kişi/14 gün kapalı test (pilot apartmanlar).
- Mağaza uygulaması, web'den satın alınan hizmetin **ücretsiz yardımcısı** (Apple 3.1.3(f)): uygulamada fiyat, abonelik düğmesi ve ödeme bağlantısı yok. Abonelik yalnızca web'den (iyzico). `TARGET=store` derlemesi bunu sağlar.
- İnceleme ekibi için şifreli demo hesaplar ve `supabase/inceleme-demo.sql`.
- Paketleme: Capacitor, derleme GitHub Actions'ta (bu ortamda npm kapalı). Yerel bildirim için Firebase gerekecek.

## Aidat güncelleme / zam (24 Ekim 2026)
- Daireler → **Aidatları güncelle (zam)**: yüzde, sabit tutar ya da yeni tutar; tüm aidatlı daireler ya da seçili daireler.
- Yeni tutar, henüz oluşturulmamış ilk aydan geçerli; oluşmuş borçlar (para kayıtları) değişmez.
- İsteğe bağlı kat malikleri kurulu karar tarihi ve açıklama; varsayılan olarak sakinlere otomatik duyuru.
- **Sessiz zam yok:** her tutar değişikliği (tek daire düzenlemesi dahil) kalıcı **aidat geçmişine** yazılır; yönetici tümünü, sakin kendi dairesini etkileyenleri görür; kimse silemez.

## Sıradaki işler
- Alan adı (kullanıcı alacak) → Vercel'e bağlama (.com ana, .com.tr yönlendirme), Supabase site adresi, videodaki adres.
- Yasal metinlerdeki veri sorumlusu bilgileri (kişi/şirket adı, adres, e-posta).
- Acil uyarı ve "İyiyim / Yardım lazım" yoklaması (ayrı ve dikkatli test edilerek).
- Pilot (3–5 apartman), Google Play kapalı test, ardından ödeme sistemi ve App Store.
- Tanıtım videoları için seslendirme (kullanıcı kaydedip gönderecek).
