// Derleme hedefi: web (varsayılan) ya da mağaza paketi (TARGET=store bun scripts/build.ts).
// Mağaza paketinde fiyat, abonelik ve ödeme çağrıları gösterilmez (Apple 3.1.3(f), Google Play ödeme politikası):
// uygulama, web'den satın alınan hizmetin ücretsiz yardımcısıdır.
declare const __STORE__: boolean;
export const STORE: boolean = typeof __STORE__ !== "undefined" ? __STORE__ : false;

// App Store / Google Play inceleme ekibinin kullandığı hesaplar: e-posta kodu yerine şifreyle girer.
export const REVIEW_EMAILS = ["inceleme@apartmanca.com", "inceleme-sakin@apartmanca.com"];
export const isReviewEmail = (e: string) => REVIEW_EMAILS.includes(e.trim().toLowerCase());
