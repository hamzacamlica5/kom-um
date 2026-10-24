// Derleme hedefi: web (varsayılan) ya da mağaza paketi (TARGET=store bun scripts/build.ts).
// Mağaza paketinde fiyat, abonelik ve ödeme çağrıları gösterilmez (Apple 3.1.3(f), Google Play ödeme politikası):
// uygulama, web'den satın alınan hizmetin ücretsiz yardımcısıdır.
declare const __STORE__: boolean;
declare const __APP_ORIGIN__: string;
export const STORE: boolean = typeof __STORE__ !== "undefined" ? __STORE__ : false;

// Paket içinde sayfa capacitor://localhost gibi bir adreste çalışır; paylaşılan bağlantılar ve
// sunucu fonksiyonları (/api/...) gerçek web adresine gitmeli.
export const APP_ORIGIN: string = STORE && typeof __APP_ORIGIN__ !== "undefined" ? __APP_ORIGIN__ : location.origin;
export const apiUrl = (path: string) => (STORE ? APP_ORIGIN + path : path);

// Capacitor yerel eklentileri (paket içinde varsa)
export const native = (): any => (window as any).Capacitor?.Plugins || null;

// App Store / Google Play inceleme ekibinin kullandığı hesaplar: e-posta kodu yerine şifreyle girer.
export const REVIEW_EMAILS = ["inceleme@apartmanca.com", "inceleme-sakin@apartmanca.com"];
export const isReviewEmail = (e: string) => REVIEW_EMAILS.includes(e.trim().toLowerCase());
