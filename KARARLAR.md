# KOMŞUM ürün kararları

Bu dosya, ürünle ilgili verilen kararların kaydıdır. Yeni bir özellik geliştirirken önce buraya bakılır.

## İlkeler
- **Güven her şeyden önce gelir.** Standartların üzerinde bir ürün hedefleniyor; kullanıcı kadar şirketin kendisi de korunur.
- **Para kayıtları silinmez.** İptaller gerekçeyle yapılır, kasa düzeltmeleri ters kayıtla yapılır.
- **Kişisel veri satılmaz, kişisel veriye dayalı reklam gösterilmez.**
- **Uygulama 112'nin yerine geçmez.** Her acil ekranında "önce 112'yi ara" yazar.

## Fiyatlandırma
- Ücreti apartman (yönetim) öder; sakinlerden ayrıca ücret alınmaz.
- Değerlendirilen model: daire başı aylık 15 TL, taban fiyat (örn. 99 TL), yıllık ödemede indirim. Kesinleşmedi; şu an uygulamada 0–10 daire 99 TL, her ilave 10 daire +100 TL gösteriliyor.
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

## Sıradaki işler
- Alan adı (kullanıcı alacak) → Vercel'e bağlama, Supabase site adresi, videodaki adres.
- Yasal metinlerdeki veri sorumlusu bilgileri (kişi/şirket adı, adres, e-posta).
- Acil uyarı ve "İyiyim / Yardım lazım" yoklaması (ayrı ve dikkatli test edilerek).
- Pilot (3–5 apartman), Google Play kapalı test, ardından ödeme sistemi ve App Store.
- Tanıtım videoları için seslendirme (kullanıcı kaydedip gönderecek).
