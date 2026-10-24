# Apartmanca mağaza paketi

- Web kodu `TARGET=store bun scripts/build.ts` ile `dist-store/`'a derlenir ve buraya `www/` olarak kopyalanır.
- Uygulama kimliği: `com.apartmanca.app` (Play Store'a yüklendikten sonra değiştirilemez).
- `android/` ve `ios/` klasörleri depoda tutulmaz; `.github/workflows/mobil.yml` her derlemede üretir.
- Simgeler ve açılış ekranları `assets/` klasöründen `@capacitor/assets` ile üretilir.
- Derleme sonuçları ve kayıtları `ci/android` ve `ci/ios` dallarına yazılır; Android test APK'sı `android-test` sürümüne eklenir.
