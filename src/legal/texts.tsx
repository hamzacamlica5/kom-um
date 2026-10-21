// Yasal metinler — tek kaynak. Uygulama (src/screens/legal.tsx) ve tanıtım sitesi (scripts/build-site.ts) bu dosyayı kullanır.
// Not: Bu metinler özenle hazırlanmış taslaklardır; yayından önce bir hukukçunun gözden geçirmesi önerilir.
import React, { createContext, useContext } from "react";
import { COMPANY as C, PRICE as P, LEGAL_UPDATED } from "./info";

type LinkComp = (p: { to: string; children: React.ReactNode }) => React.ReactElement;
export const LinkCtx = createContext<LinkComp>(({ to, children }) => <a href={to}>{children}</a>);
const A = ({ to, children }: { to: string; children: React.ReactNode }) => { const L = useContext(LinkCtx); return <L to={to}>{children}</L>; };
const Mail = () => <a href={"mailto:" + C.eposta}>{C.eposta}</a>;
const tl = (n: number) => n.toLocaleString("tr-TR") + " TL";

export const Seller = () => (
  <ul className="kv">
    <li><b>Unvan:</b> {C.unvan}</li>
    <li><b>MERSİS no:</b> {C.mersis}</li>
    <li><b>Vergi dairesi / no:</b> {C.vergiDairesi} / {C.vergiNo}</li>
    <li><b>Adres:</b> {C.adres}</li>
    <li><b>E-posta:</b> <Mail /></li>
    <li><b>Telefon:</b> {C.telefon}</li>
    {C.kep && <li><b>KEP:</b> {C.kep}</li>}
  </ul>
);

// ---------------------------------------------------------------- KVKK
export function KvkkText() {
  return (<>
    <p>Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu'nun ("KVKK") 10. maddesi ve Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ uyarınca; {C.site} tanıtım sitesini ziyaret edenleri ve {C.brand} uygulamasını kullanan yöneticileri ve bina sakinlerini, kişisel verilerinin işlenmesi hakkında bilgilendirmek için hazırlanmıştır.</p>

    <h2>1. Veri sorumlusu</h2>
    <p>Veri sorumlusu {C.unvan}'dır ({C.adres}). İletişim: <Mail />{C.kep && <> · KEP: {C.kep}</>}.</p>
    <p>Apartman veya site yönetimi, kendi binasına ait kayıtları (aidat, gider, kasa, belge, duyuru) uygulama üzerinden tutar. Bu kayıtların içeriğinden ve doğruluğundan ilgili yönetim sorumludur; {C.brand} bu kayıtları yönetim adına saklar ve yalnızca yetkili kişilere gösterir.</p>

    <h2>2. Tanıtım sitesi ziyaretçileri</h2>
    <p>{C.site} adresindeki tanıtım sitesi <b>çerez kullanmaz</b>, ziyaretçi takibi ve reklam aracı içermez, form aracılığıyla bilgi toplamaz ve yazı tipi, video gibi içerikleri üçüncü taraf sunuculardan yüklemez.</p>
    <ul>
      <li><b>Sunucu kayıtları:</b> Siteyi ziyaret ettiğinde, barındırma hizmeti sağlayıcımızın sunucuları teknik olarak zorunlu olan IP adresi, tarih-saat, istenen sayfa ve tarayıcı bilgisini kısa süreli kayıt altına alır. Bu kayıtlar sitenin güvenliği ve kötüye kullanımın önlenmesi amacıyla, meşru menfaat (KVKK m. 5/2-f) hukuki sebebine dayanılarak işlenir.</li>
      <li><b>Bize yazdığında:</b> E-posta ile ulaşırsan e-posta adresin, adın ve mesajının içeriği yalnızca talebini yanıtlamak için işlenir (KVKK m. 5/2-c ve 5/2-f).</li>
    </ul>

    <h2>3. Uygulamada işlenen kişisel veriler</h2>
    <ul>
      <li><b>Kimlik:</b> ad, soyad.</li>
      <li><b>İletişim:</b> e-posta adresi, isteğe bağlı telefon numarası.</li>
      <li><b>Konut bilgisi:</b> üye olunan apartman ve daire.</li>
      <li><b>Finansal kayıtlar:</b> aidat borçları, ödeme kayıtları, ödeme bildirimleri ve yüklenen banka dekontları.</li>
      <li><b>Görsel ve belge kayıtları:</b> arıza talebine eklenen fotoğraflar, yönetimin yüklediği belgeler.</li>
      <li><b>Abonelik ve fatura bilgileri (yalnızca abonelik ödeyen yönetici için):</b> fatura adı/unvanı, fatura adresi, vergi veya T.C. kimlik numarası, ödeme ve fatura geçmişi. Kart numarası tarafımızca görülmez ve saklanmaz.</li>
      <li><b>İşlem güvenliği:</b> giriş kayıtları, IP adresi, cihaz ve bildirim aboneliği bilgileri.</li>
    </ul>

    <h2>4. İşleme amaçları ve hukuki sebepler</h2>
    <ul>
      <li>Hesabın oluşturulması, giriş ve apartmana üyelik: sözleşmenin kurulması ve ifası (KVKK m. 5/2-c).</li>
      <li>Aidat, ödeme, gider ve kasa kayıtlarının tutulması ve sakinlere şeffaf şekilde gösterilmesi: sözleşmenin ifası (m. 5/2-c) ve yönetimin hukuki yükümlülükleri (m. 5/2-ç).</li>
      <li>Duyuru, hatırlatma ve telefon bildirimlerinin gönderilmesi: sözleşmenin ifası (m. 5/2-c).</li>
      <li>Abonelik ücretinin tahsili ve faturalandırma: sözleşmenin ifası (m. 5/2-c) ve vergi mevzuatından doğan hukuki yükümlülük (m. 5/2-ç).</li>
      <li>Hizmetin güvenliği, kötüye kullanımın önlenmesi ve hataların giderilmesi: meşru menfaat (m. 5/2-f) ve 5651 sayılı Kanun'dan doğan yükümlülükler (m. 5/2-ç).</li>
      <li>Hukuki uyuşmazlıklarda hakların korunması: bir hakkın tesisi, kullanılması veya korunması (m. 5/2-e).</li>
      <li>Kullanıcının talebi üzerine sponsorlu bir hizmet firmasından teklif alınması: açık rıza (m. 5/1).</li>
    </ul>
    <p>Uygulamada gösterilen sponsorlu hizmet önerileri yalnızca apartmanın il ve ilçesine göre belirlenir; bu amaçla kişisel veri işlenmez. Kişisel verilerin pazarlama veya profilleme amacıyla işlenmez ve satılmaz.</p>

    <h2>5. Aktarım</h2>
    <p>Kişisel veriler yalnızca hizmetin sunulması için gerekli olduğu ölçüde şu hizmet sağlayıcılara aktarılır:</p>
    <ul>
      <li>Veritabanı ve dosya barındırma: Supabase (sunucular Avrupa Birliği'nde, Almanya).</li>
      <li>Uygulama ve site barındırma: Vercel (ABD merkezli).</li>
      <li>E-posta gönderimi ve telefon bildirim servisleri (Google, Apple, Mozilla).</li>
      <li>Abonelik ödemesi: lisanslı ödeme kuruluşu iyzico (Türkiye). Kart bilgileri doğrudan iyzico'ya iletilir.</li>
      <li>Fatura düzenleme: e-Arşiv / e-Fatura hizmet sağlayıcıları ve mali müşavir.</li>
      <li>Yöneticinin kendi isteğiyle kullandığı duyuru taslağı özelliği: yöneticinin yazdığı notlar, taslak üretilmesi için yapay zekâ hizmet sağlayıcısına iletilir. Bu notlara kişisel veri yazılmamasını öneririz.</li>
    </ul>
    <p>Bu sağlayıcıların bir kısmı yurt dışında bulunduğundan, yurt dışına aktarım KVKK m. 9'da öngörülen usul ve güvencelere uygun olarak yapılır.</p>
    <p>Apartman içinde: kasa hareketleri, giderler, duyurular ve paylaşılan belgeler tüm üyelere; bir dairenin borç, ödeme ve dekont bilgileri yalnızca o dairenin sakinlerine ve yönetime görünür. Ad ve telefon bilgisi aynı apartmandaki üyelerce görülebilir.</p>
    <p>Sponsorlu hizmet firmaları: Kullanıcı bir firmadan teklif istediğinde ve buna açıkça onay verdiğinde; ad, telefon, apartman adresi ve talep içeriği yalnızca o firmaya, teklif hazırlanması amacıyla aktarılır.</p>
    <p>Kanunen yetkili kamu kurum ve kuruluşlarına, talep halinde ve mevzuatın gerektirdiği ölçüde aktarım yapılabilir.</p>

    <h2>6. Toplama yöntemi</h2>
    <p>Veriler; uygulamaya girdiğin bilgiler, yüklediğin dosyalar, yönetimin girdiği kayıtlar, bize gönderdiğin e-postalar ve sunucu kayıtları aracılığıyla elektronik ortamda, otomatik ya da kısmen otomatik yollarla toplanır.</p>

    <h2>7. Saklama süresi</h2>
    <ul>
      <li>Hesap bilgileri hesabın açık olduğu süre boyunca saklanır.</li>
      <li>Hesabını sildiğinde adın ve telefonun silinir; apartmanın muhasebe kayıtları (ödeme, gider, kasa hareketleri) yönetimin kayıt yükümlülükleri nedeniyle "Silinmiş kullanıcı" adıyla korunur.</li>
      <li>Abonelik, ödeme ve fatura kayıtları Türk Ticaret Kanunu ve Vergi Usul Kanunu'nda öngörülen süreler (10 yıla kadar) boyunca saklanır.</li>
      <li>İşlem güvenliği kayıtları ilgili mevzuatta öngörülen süre boyunca saklanır.</li>
      <li>Süresi dolan veriler silinir, yok edilir veya anonim hale getirilir.</li>
    </ul>

    <h2>8. Hakların</h2>
    <p>KVKK m. 11 uyarınca; kişisel verilerinin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini isteme, şartları oluşmuşsa silinmesini veya yok edilmesini isteme, bu işlemlerin aktarılan üçüncü kişilere bildirilmesini isteme, münhasıran otomatik sistemlerle analiz edilmesi sonucu aleyhine bir sonuç çıkmasına itiraz etme ve kanuna aykırı işleme nedeniyle zarara uğraman halinde zararın giderilmesini talep etme haklarına sahipsin.</p>
    <p>Başvurularını Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ'e uygun olarak yazılı şekilde {C.adres} adresine, kayıtlı elektronik posta (KEP) ile{C.kep && <> ({C.kep})</>}, güvenli elektronik imza veya mobil imza ile ya da sistemimizde kayıtlı e-posta adresinden <Mail /> adresine iletebilirsin. Başvurular en geç 30 gün içinde ücretsiz olarak sonuçlandırılır. Hesabını uygulamadaki <b>Ayarlar → Hesabımı sil</b> bölümünden kendin de silebilirsin.</p>
  </>);
}

// ---------------------------------------------------------------- Gizlilik
export function PrivacyText() {
  return (<>
    <p>{C.brand}, apartman ve site yönetimini şeffaf hale getirmek için tasarlanmış bir uygulamadır. Bu politika hangi bilgileri neden topladığımızı ve nasıl koruduğumuzu sade bir dille anlatır. Ayrıntılı yasal bilgi için <A to="/kvkk">KVKK Aydınlatma Metni</A>'ne, çerezler ve tarayıcı depolaması için <A to="/cerez-politikasi">Çerez Politikası</A>'na bakabilirsin.</p>
    <h2>Ne topluyoruz?</h2>
    <p>Giriş için e-posta adresini; komşuların seni tanıması için adını ve isteğe bağlı telefonunu; apartmanın işleyişi için aidat, ödeme, gider, duyuru, arıza ve belge kayıtlarını; bildirim gönderebilmek için cihazının bildirim aboneliğini saklarız. Abonelik ödeyen yöneticiden faturalandırma için fatura bilgilerini alırız.</p>
    <h2>Ne yapmıyoruz?</h2>
    <ul>
      <li>Kişisel verilerini satmayız ve üçüncü kişilerle pazarlama amacıyla paylaşmayız.</li>
      <li>Kişisel verilerine dayalı hedefli reklam göstermeyiz; üçüncü taraf reklam ağları, analiz veya izleme araçları kullanmayız.</li>
      <li>Kart bilgisi görmeyiz ve saklamayız. Abonelik ödemeleri lisanslı ödeme kuruluşu iyzico üzerinden alınır.</li>
      <li>{C.brand} aidat tahsil etmez; apartmanın parasına dokunmaz, yalnızca yapılan ödemelerin kaydını tutar.</li>
    </ul>
    <h2>Kim neyi görür?</h2>
    <ul>
      <li><b>Tüm apartman üyeleri:</b> kasa bakiyesi, kasa hareketleri, giderler, duyurular, paylaşılan belgeler, üyelerin adları.</li>
      <li><b>Yalnızca kendi dairen ve yönetim:</b> dairenin borçları, ödemeleri, ödeme bildirimlerin ve dekontların.</li>
      <li><b>Yalnızca sen ve yönetim:</b> açtığın arıza talepleri ve fotoğrafları.</li>
    </ul>
    <h2>Sponsorlu hizmet önerileri</h2>
    <p>Bakım, arıza ve temizlik gibi bölümlerde, apartmanların ihtiyaç duyabileceği hizmet firmaları (asansör bakımı, temizlik, tesisat vb.) <b>"Sponsorlu"</b> etiketiyle gösterilebilir. Bu firmalar {C.brand}'ya listeleme ücreti öder.</p>
    <ul>
      <li>Sponsorlu öneriler yalnızca yöneticilere gösterilir. Bina sakinleri uygulamada hiçbir sponsorlu içerik görmez.</li>
      <li>Öneriler yalnızca apartmanın bulunduğu il ve ilçeye göre seçilir; kişisel verilerin bu seçimde kullanılmaz.</li>
      <li>Firmalar kimin uygulamayı kullandığını göremez; hiçbir bilgin firmalarla kendiliğinden paylaşılmaz.</li>
      <li>Bir firmadan teklif istediğinde, yalnızca senin onayınla ve yalnızca teklif için gereken bilgiler (adın, telefonun, apartmanın adresi ve talebin) o firmaya iletilir.</li>
    </ul>
    <h2>Nasıl koruyoruz?</h2>
    <p>Bağlantılar şifrelidir (HTTPS). Erişim kuralları veritabanı düzeyinde uygulanır; bir kullanıcı yetkisi olmayan kaydı göremez. Para içeren kayıtlar silinemez; düzeltmeler gerekçeyle kayıt altına alınır. Dosyalar yalnızca yetkili kişilere kısa süreli bağlantılarla açılır.</p>
    <h2>Hesabını silmek</h2>
    <p><b>Ayarlar → Hesabımı sil</b> ile hesabını istediğin zaman silebilirsin. Adın, telefonun ve bildirim kayıtların silinir; giriş hesabın kapatılır. Apartmanın muhasebe kayıtları "Silinmiş kullanıcı" adıyla kalır.</p>
    <h2>İletişim</h2>
    <p>Sorularını <Mail /> adresine yazabilirsin.</p>
  </>);
}

// ---------------------------------------------------------------- Çerez
export function CookieText() {
  return (<>
    <p>Bu politika, {C.site} tanıtım sitesinde ve {C.brand} uygulamasında çerezlerin ve benzeri tarayıcı depolama teknolojilerinin nasıl kullanıldığını açıklar. Kişisel Verileri Koruma Kurumu'nun Çerez Uygulamaları Hakkında Rehberi dikkate alınarak hazırlanmıştır.</p>

    <h2>Kısaca</h2>
    <ul>
      <li><b>Tanıtım sitesi hiç çerez kullanmaz.</b> Analiz, reklam, sosyal medya veya takip aracı yoktur; yazı tipleri ve görseller kendi sunucumuzdan yüklenir.</li>
      <li><b>Uygulama yalnızca çalışması için zorunlu olan bilgileri</b> tarayıcının yerel depolamasında tutar. Bunlar seni tanımak, izlemek veya reklam göstermek için kullanılmaz.</li>
      <li>Zorunlu olmayan hiçbir çerez kullanmadığımız için çerez onayı penceresi göstermiyoruz. İleride analiz gibi zorunlu olmayan bir araç eklersek, kullanmadan önce açık onayını isteriz ve bu sayfayı güncelleriz.</li>
    </ul>

    <h2>Uygulamanın tarayıcıda sakladığı bilgiler</h2>
    <table className="tbl">
      <thead><tr><th>Ad</th><th>Amacı</th><th>Süresi</th></tr></thead>
      <tbody>
        <tr><td>Oturum bilgisi</td><td>Giriş yaptığını hatırlar; her açılışta yeniden kod istememek için.</td><td>Çıkış yapana kadar</td></tr>
        <tr><td>Seçili apartman</td><td>Birden fazla apartmanın varsa en son hangisine baktığını hatırlar.</td><td>Çıkış yapana kadar</td></tr>
        <tr><td>Bekleyen davet</td><td>Davet bağlantısıyla gelip henüz giriş yapmadıysan, girişten sonra doğru apartmana katılmanı sağlar.</td><td>Davet kabul edilene kadar</td></tr>
        <tr><td>Acil durum bilgileri</td><td>Binanın acil rehberinin internet olmadan da açılabilmesi için bir kopyasını tutar.</td><td>Çıkış yapana kadar</td></tr>
        <tr><td>Uygulama önbelleği</td><td>Uygulama dosyalarını saklar; hızlı ve çevrimdışı açılış için.</td><td>Yeni sürüm gelene kadar</td></tr>
        <tr><td>Bildirim aboneliği</td><td>Yalnızca izin verirsen; telefon bildirimlerinin gelmesi için tarayıcı tarafından tutulur.</td><td>İzni geri alana kadar</td></tr>
      </tbody>
    </table>
    <p>Bu bilgilerin tamamı hizmetin sunulması için kesinlikle gereklidir ve sözleşmenin ifası (KVKK m. 5/2-c) kapsamında işlenir.</p>

    <h2>Nasıl silebilirim?</h2>
    <p>Uygulamadan <b>Çıkış yap</b> dediğinde oturum bilgisi silinir. Ayrıca tarayıcının ayarlarından bu site için saklanan verileri istediğin zaman temizleyebilirsin; bu durumda yeniden giriş yapman gerekir. Bildirim iznini telefonunun veya tarayıcının ayarlarından geri alabilirsin.</p>
    <p>Sorularını <Mail /> adresine yazabilirsin. Kişisel verilerinle ilgili haklar için <A to="/kvkk">KVKK Aydınlatma Metni</A>'ne bakabilirsin.</p>
  </>);
}

// ---------------------------------------------------------------- Kullanım şartları
export function TermsText() {
  return (<>
    <p>{C.brand}'yı kullanarak bu şartları kabul etmiş olursun. Lütfen dikkatlice oku. Hizmeti sunan: {C.unvan} ("{C.brand}").</p>
    <h2>1. Hizmet</h2>
    <p>{C.brand}; aidat takibi, ödeme kaydı ve bildirimi, kasa ve gider kaydı, duyuru, arıza talebi, belge saklama ve acil durum rehberi araçları sunan bir apartman yönetimi uygulamasıdır. {C.brand} bir ödeme kuruluşu değildir; aidat tahsil etmez, para transferi yapmaz, yalnızca kullanıcıların girdiği kayıtları tutar. Acil durum ekranı 112 Acil Çağrı Merkezi'nin veya resmi kurumların yerine geçmez.</p>
    <h2>2. Hesap</h2>
    <p>Hesabını e-posta adresinle oluşturursun ve giriş kodlarının güvenliğinden sen sorumlusun. Gerçek bilgilerini kullanmalı, başkası adına hesap açmamalısın.</p>
    <h2>3. Yöneticinin sorumlulukları</h2>
    <ul>
      <li>Girdiği aidat, ödeme, gider ve kasa kayıtlarının doğruluğundan yönetici sorumludur.</li>
      <li>Uygulamadaki kayıtlar ve görüş toplama araçları; 634 sayılı Kat Mülkiyeti Kanunu'nun öngördüğü kat malikleri kurulu, karar defteri ve denetim yükümlülüklerinin yerine geçmez.</li>
      <li>Yönetici, sakinlerin kişisel verilerini yalnızca apartman yönetimi amacıyla kullanır.</li>
    </ul>
    <h2>4. Kayıtların değiştirilemezliği</h2>
    <p>Şeffaflık için para içeren kayıtlar silinemez. Yanlış kayıtlar gerekçesiyle iptal edilir ya da ters kayıtla düzeltilir; bu işlemler tüm geçmişiyle görünür kalır.</p>
    <h2>5. Ücretlendirme ve abonelik</h2>
    <ul>
      <li>Abonelik ücretini apartman yönetimi öder; bina sakinlerinden {C.brand} için ayrıca ücret alınmaz. Yönetim bu ücreti apartmanın ortak giderlerinden karşılayabilir; bu durumda gider, kasa hareketlerinde herkes tarafından görülür.</li>
      <li>Güncel tarife: daire başına aylık {P.perUnit} TL, aylık en az {P.min} TL. Yıllık ödemede {P.yearlyPaidMonths} aylık ücret ödenir, 12 ay kullanılır. Fiyatlara KDV dahildir.</li>
      <li>Her yeni apartman {P.trialDays} gün ücretsiz deneme ile başlar; deneme için kart bilgisi istenmez ve deneme bitince kendiliğinden ücret alınmaz.</li>
      <li>Abonelik ve iade koşullarının ayrıntısı <A to="/mesafeli-satis-sozlesmesi">Mesafeli Satış Sözleşmesi</A> ve <A to="/iptal-ve-iade">İptal ve İade Koşulları</A>'nda yer alır.</li>
      <li>Abonelik sona erse bile kayıtlar silinmez ve kilitlenmez: görüntülenebilir ve dışa aktarılabilir; yalnızca yeni kayıt ekleme durur.</li>
    </ul>
    <h2>6. Sponsorlu içerik ve hizmet firmaları</h2>
    <p>Uygulamada bazı hizmet firmaları ücret karşılığında, belirli süreler için ve <b>"Sponsorlu"</b> etiketiyle gösterilebilir. Sponsorlu içerik şu kurallara tabidir:</p>
    <ul>
      <li>Yalnızca yöneticilere gösterilir; bina sakinleri sponsorlu içerik görmez.</li>
      <li>Bir ekranda en fazla iki sponsorlu firma yer alır ve her birinde "Bu firmayı neden görüyorum?" açıklaması bulunur.</li>
      <li>Firmalar listelenmeden önce vergi kaydı ve ilgili mesleki yetki belgeleri yönünden kontrol edilir.</li>
      <li>Yöneticiler hizmet aldıkları firmayı puanlayabilir. Düşük puan alan ya da şikâyet üzerine uygunsuz bulunan firma, ödeme yapmış olsa bile listeden kaldırılır.</li>
      <li>Sponsorlu içerik; kayıtları, hesaplamaları ya da uygulamanın diğer işlevlerini hiçbir şekilde etkilemez.</li>
    </ul>
    <p>{C.brand}, apartman ile hizmet firmaları arasındaki anlaşmaların tarafı değildir. Firmaların hizmet kalitesini, fiyatını ve yasal yükümlülüklerini garanti etmez. Hizmet almadan önce firmanın yetki belgelerini ve tekliflerini kontrol etmek yönetimin sorumluluğundadır.</p>
    <h2>7. Yasak kullanım</h2>
    <p>Uygulamayı yasa dışı amaçlarla, başkalarını rahatsız edecek, karalayacak veya kişilik haklarını ihlal edecek şekilde kullanamazsın. Bu şartlara aykırı kullanımda hesap askıya alınabilir. Hukuka aykırı olduğunu düşündüğün bir içeriği <Mail /> adresine bildirebilirsin.</p>
    <h2>8. İçerik</h2>
    <p>Yüklediğin dosya ve metinlerin sahibi sen ya da apartman yönetimidir. {C.brand}'ya bu içerikleri yalnızca hizmeti sunmak amacıyla saklama ve gösterme izni verirsin.</p>
    <h2>9. Hizmetin sürekliliği ve sorumluluk</h2>
    <p>Hizmeti kesintisiz ve hatasız sunmak için özen gösteririz, ancak bunu garanti edemeyiz. Kanunun izin verdiği ölçüde, dolaylı zararlardan ve kullanıcıların girdiği kayıtların içeriğinden doğan zararlardan sorumlu değiliz. Bu hüküm, tüketicilerin kanundan doğan haklarını sınırlamaz. Önemli kayıtların dışa aktarma özelliğiyle yedeğini almanı öneririz.</p>
    <h2>10. Hesabın kapatılması</h2>
    <p>Hesabını istediğin zaman <b>Ayarlar → Hesabımı sil</b> ile kapatabilirsin. Yönetici, hesabını silmeden önce yönetimi bir sakine devretmelidir.</p>
    <h2>11. Değişiklikler ve uygulanacak hukuk</h2>
    <p>Bu şartlar güncellenebilir; önemli değişiklikler yürürlüğe girmeden önce uygulama içinde duyurulur. Bu şartlara Türkiye Cumhuriyeti hukuku uygulanır. Tüketiciler, uyuşmazlıklarda yerleşim yerlerindeki tüketici hakem heyetlerine veya tüketici mahkemelerine başvurabilir.</p>
    <h2>İletişim</h2>
    <p>{C.unvan} · <Mail /> · {C.telefon}</p>
  </>);
}

// ---------------------------------------------------------------- Ön bilgilendirme
export function PreInfoText() {
  return (<>
    <p>Bu form, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, {C.brand} aboneliği satın alınmadan önce alıcıyı bilgilendirmek için hazırlanmıştır. Ödeme adımında bu formu okuduğunu ayrıca onaylaman istenir.</p>
    <h2>1. Satıcı / hizmet sağlayıcı</h2>
    <Seller />
    <h2>2. Hizmetin temel nitelikleri</h2>
    <p>{C.brand}, apartman ve site yönetimi için çevrim içi bir yazılım hizmetidir (aidat takibi, kasa ve gider kaydı, duyuru, arıza talebi, belge saklama, acil durum rehberi). Hizmet internet üzerinden, {C.app} adresinden ve telefona eklenen uygulamadan sunulur. Abonelik, bir apartman/site için ve o apartmandaki tüm yönetici ve sakinlerin kullanımı için geçerlidir.</p>
    <h2>3. Fiyat ve ödeme</h2>
    <ul>
      <li>Aylık abonelik: daire başına {P.perUnit} TL, aylık en az {P.min} TL. Örnek: 10 daire için aylık {tl(150)}, 40 daire için aylık {tl(600)}.</li>
      <li>Yıllık abonelik: aylık tutarın {P.yearlyPaidMonths} katı peşin ödenir, 12 ay kullanılır.</li>
      <li>Tüm fiyatlara KDV dahildir. Bunun dışında hiçbir ek ücret, kurulum bedeli veya taahhüt yoktur.</li>
      <li>Ödeme, banka veya kredi kartıyla lisanslı ödeme kuruluşu iyzico üzerinden alınır. Kart bilgileri satıcı tarafından görülmez ve saklanmaz.</li>
      <li>Abonelik, iptal edilmedikçe seçilen dönem sonunda aynı süre için yenilenir ve ücret aynı karttan alınır. Yıllık aboneliklerde yenileme tarihinden en az 7 gün önce e-posta ile hatırlatma gönderilir.</li>
      <li>Fiyat değişiklikleri yalnızca bir sonraki dönemden itibaren geçerli olur ve en az 30 gün önceden bildirilir.</li>
    </ul>
    <h2>4. Ücretsiz deneme</h2>
    <p>Her yeni apartman {P.trialDays} gün ücretsiz deneme ile başlar. Deneme için kart bilgisi istenmez; deneme sonunda kendiliğinden ücret alınmaz. Deneme bitmeden 7 gün ve 1 gün önce yöneticiye hatırlatma gönderilir.</p>
    <h2>5. Hizmetin ifası</h2>
    <p>Ödeme onaylandığı anda abonelik etkinleşir ve hizmet kesintisiz olarak sunulmaya devam eder. Fiziksel bir teslimat yoktur.</p>
    <h2>6. Cayma hakkı ve iade</h2>
    <p>Hizmetin ifasına cayma süresi içinde, alıcının onayıyla başlanmış olsa da {C.brand}, alıcının lehine olarak şu iade güvencesini sunar: <b>İlk ücretli ödemeden itibaren {P.refundDays} gün içinde</b> aboneliğini iptal edersen, ödediğin tutarın tamamı gerekçe sorulmadan iade edilir. Yıllık abonelik yenilemelerinde de yenileme ödemesinden itibaren {P.refundDays} gün içinde iptal edersen tam iade yapılır. Ayrıntılar <A to="/iptal-ve-iade">İptal ve İade Koşulları</A>'ndadır.</p>
    <p>Cayma veya iptal bildirimini uygulamadaki <b>Abonelik</b> ekranından ya da <Mail /> adresine yazarak yapabilirsin.</p>
    <h2>7. Sözleşmenin süresi ve sona ermesi</h2>
    <p>Asgari bir sözleşme süresi yoktur. Aboneliğini istediğin zaman iptal edebilirsin; iptal ettiğinde ödenmiş dönemin sonuna kadar kullanmaya devam edersin ve yeni ücret alınmaz. Abonelik sona erse de kayıtlar silinmez ve kilitlenmez; görüntülenebilir ve dışa aktarılabilir.</p>
    <h2>8. Şikâyet ve itiraz</h2>
    <p>Şikâyetlerini <Mail /> adresine iletebilirsin. Uyuşmazlık halinde, Ticaret Bakanlığınca her yıl belirlenen parasal sınırlar dahilinde yerleşim yerindeki veya hizmeti satın aldığın yerdeki tüketici hakem heyetine ya da tüketici mahkemesine başvurabilirsin.</p>
  </>);
}

// ---------------------------------------------------------------- Mesafeli satış
export function DistanceSalesText() {
  return (<>
    <p>Bu sözleşme, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, aşağıda bilgileri yer alan satıcı ile {C.brand} aboneliğini elektronik ortamda satın alan alıcı arasında kurulur.</p>
    <h2>Madde 1 – Taraflar</h2>
    <p><b>Satıcı:</b></p>
    <Seller />
    <p><b>Alıcı:</b> Ödeme adımında adı/unvanı, fatura adresi ve e-posta adresi beyan edilen, apartman veya site yönetimi adına aboneliği satın alan kişi.</p>
    <h2>Madde 2 – Konu</h2>
    <p>Sözleşmenin konusu, alıcının seçtiği apartman/site için {C.brand} çevrim içi apartman yönetimi yazılım hizmetine aylık veya yıllık abonelik satışı ile tarafların hak ve yükümlülükleridir.</p>
    <h2>Madde 3 – Hizmet, fiyat ve ödeme</h2>
    <ul>
      <li>Hizmetin temel nitelikleri, fiyatı ve ödeme koşulları <A to="/on-bilgilendirme-formu">Ön Bilgilendirme Formu</A>'nda yer alır ve bu sözleşmenin ayrılmaz parçasıdır.</li>
      <li>Fiyat: daire başına aylık {P.perUnit} TL, aylık en az {P.min} TL; yıllık abonelikte {P.yearlyPaidMonths} aylık ücret. KDV dahildir. Ödeme anındaki tutar ödeme ekranında ayrıca gösterilir.</li>
      <li>Ödeme, lisanslı ödeme kuruluşu iyzico üzerinden banka veya kredi kartıyla yapılır. Abonelik iptal edilmedikçe dönem sonunda yenilenir ve ücret kayıtlı karttan alınır.</li>
      <li>Her ödeme için e-Arşiv fatura düzenlenir ve alıcının e-posta adresine gönderilir.</li>
    </ul>
    <h2>Madde 4 – İfa</h2>
    <p>Satıcı, ödemenin onaylanmasıyla birlikte aboneliği etkinleştirir ve hizmeti abonelik süresince sunar. Planlı bakım çalışmaları mümkün olduğunca önceden duyurulur.</p>
    <h2>Madde 5 – Cayma hakkı ve iade</h2>
    <p>Alıcı, ilk ücretli ödemeden itibaren {P.refundDays} gün içinde hiçbir gerekçe göstermeden ve cezai şart ödemeden aboneliğinden cayabilir; bu durumda ödenen tutarın tamamı iade edilir. Yıllık abonelik yenilemelerinde de yenileme ödemesinden itibaren {P.refundDays} gün içinde iptal halinde tam iade yapılır. İade, cayma bildiriminin satıcıya ulaşmasından itibaren en geç 14 gün içinde, ödemenin yapıldığı karta yapılır. Ayrıntılar <A to="/iptal-ve-iade">İptal ve İade Koşulları</A>'ndadır.</p>
    <h2>Madde 6 – İptal</h2>
    <p>Alıcı aboneliğini istediği zaman uygulamadaki Abonelik ekranından iptal edebilir. İptal, ödenmiş dönemin sonunda geçerli olur ve sonraki dönem için ücret alınmaz. Abonelik sona erdiğinde kayıtlar silinmez ve kilitlenmez.</p>
    <h2>Madde 7 – Tarafların yükümlülükleri</h2>
    <ul>
      <li>Satıcı, hizmeti özenle sunmakla, kişisel verileri <A to="/kvkk">KVKK Aydınlatma Metni</A>'ne uygun şekilde işlemekle ve korumakla yükümlüdür.</li>
      <li>Alıcı, beyan ettiği bilgilerin doğru olduğunu ve hizmeti <A to="/kullanim-sartlari">Kullanım Şartları</A>'na uygun kullanacağını kabul eder.</li>
    </ul>
    <h2>Madde 8 – Uyuşmazlıkların çözümü</h2>
    <p>Bu sözleşmeden doğan uyuşmazlıklarda, Ticaret Bakanlığınca ilan edilen parasal sınırlar dahilinde alıcının yerleşim yerindeki veya hizmeti satın aldığı yerdeki tüketici hakem heyetleri ve tüketici mahkemeleri yetkilidir.</p>
    <h2>Madde 9 – Yürürlük</h2>
    <p>Alıcı, ödeme adımında bu sözleşmeyi ve ön bilgilendirme formunu okuyup onayladığında sözleşme kurulmuş olur. Sözleşmenin bir örneği alıcının e-posta adresine gönderilir ve satıcı tarafından saklanır.</p>
  </>);
}

// ---------------------------------------------------------------- İptal ve iade
export function RefundText() {
  return (<>
    <p>Bu sayfa {C.brand} aboneliğinin nasıl iptal edildiğini ve hangi durumlarda ücret iadesi yapıldığını sade bir dille anlatır.</p>
    <h2>Ücretsiz deneme</h2>
    <p>Her yeni apartman {P.trialDays} gün ücretsiz deneme ile başlar. Deneme için kart bilgisi istenmez; deneme bitince kendiliğinden ücret alınmaz. İptal etmen gereken bir şey yoktur.</p>
    <h2>{P.refundDays} gün koşulsuz iade</h2>
    <ul>
      <li><b>İlk ödeme:</b> İlk ücretli ödemenden itibaren {P.refundDays} gün içinde aboneliğini iptal edersen ödediğin tutarın tamamını iade ederiz. Gerekçe sormayız.</li>
      <li><b>Yıllık yenileme:</b> Yıllık aboneliğin yenilendiğinde, yenileme ödemesinden itibaren {P.refundDays} gün içinde iptal edersen tutarın tamamını iade ederiz. Yenilemeden en az 7 gün önce sana e-posta ile hatırlatırız.</li>
      <li><b>Aylık yenileme:</b> Aylık abonelikte yenilenen ay için iade yapılmaz; iptal ettiğinde o ayın sonuna kadar kullanırsın ve bir daha ücret alınmaz.</li>
    </ul>
    <h2>Nasıl iptal ederim?</h2>
    <p>Uygulamada <b>Daireler → Abonelik → Aboneliği iptal et</b> adımlarını izleyebilir ya da <Mail /> adresine yazabilirsin. İptal ettiğinde ödenmiş dönemin sonuna kadar her şey çalışmaya devam eder.</p>
    <h2>İade nasıl yapılır?</h2>
    <p>İade, ödemenin yapıldığı karta, iptal bildiriminden itibaren en geç 14 gün içinde yapılır. Tutarın kart hesabına yansıma süresi bankana göre değişebilir.</p>
    <h2>Abonelik bitince kayıtlarım ne olur?</h2>
    <p>Hiçbir kayıt silinmez ve kilitlenmez. Herkes kayıtları görmeye ve yönetici Excel'e aktarmaya devam eder; yalnızca yeni kayıt ekleme durur. Aboneliği yeniden başlattığında kaldığın yerden devam edersin.</p>
    <p>Ayrıntılı yasal koşullar için <A to="/mesafeli-satis-sozlesmesi">Mesafeli Satış Sözleşmesi</A> ve <A to="/on-bilgilendirme-formu">Ön Bilgilendirme Formu</A>'na bakabilirsin.</p>
  </>);
}

// ---------------------------------------------------------------- Güven
export const PROMISES: [string, string][] = [
  ["Verilerin satılmaz", "Kişisel verilerini kimseye satmayız, reklam ağlarıyla paylaşmayız, seni takip etmeyiz."],
  ["Para kayıtları silinemez", "Aidat, ödeme, gider ve kasa hareketleri silinmez. Yanlış kayıt, gerekçesi yazılarak iptal edilir ya da ters kayıtla düzeltilir; bu geçmiş herkese açıktır."],
  ["Kasa herkese açık", "Apartmanın kasası, giderleri ve faturaları tüm sakinler tarafından görülebilir. Aidatın nereye harcandığını kendin görürsün."],
  ["Borcun sadece seni ilgilendirir", "Bir dairenin borcu, ödemeleri ve dekontları yalnızca o dairenin sakinlerine ve yönetime görünür. Bu kural veritabanı düzeyinde uygulanır, ekran arkasından aşılamaz."],
  ["Sakinler reklam görmez", "Sakinlerin ekranında hiçbir reklam ya da sponsorlu içerik yoktur. Yöneticilere gösterilen sponsorlu hizmet önerileri açıkça etiketlenir, kontrol edilmiş firmalardan oluşur ve kişisel verine dayanmaz."],
  ["Verilerin senin", "Yönetici tüm kayıtları istediği an Excel'e aktarabilir. Abonelik bitse bile kayıtlar kilitlenmez. Herkes hesabını tek dokunuşla silebilir."],
  ["Yönetici değişir, kayıtlar kaybolmaz", "Yönetici değiştiğinde kasa, borçlar, belgeler ve bakım geçmişi tek tuşla yeni yöneticiye geçer."],
  ["Acil durumda yanında", "112 ve arıza hatları, binanın vana ve pano yerleri, asansör firmasının acil hattı tek ekranda; internet olmasa bile açılır."],
];

export function TrustText() {
  return (<>
    <p className="lead">{C.brand}'ya apartmanının parasını ve komşularının bilgilerini emanet ediyorsun. Bu emanete nasıl baktığımızı açıkça yazıyoruz.</p>
    <div className="promises">
      {PROMISES.map(([t, d]) => <section key={t} className="promise"><h2>{t}</h2><p>{d}</p></section>)}
    </div>
    <h2>Teknik olarak</h2>
    <ul>
      <li>Tüm bağlantılar şifrelidir (HTTPS). Veriler Avrupa Birliği'ndeki (Almanya) sunucularda saklanır.</li>
      <li>Erişim kuralları uygulamada değil, doğrudan veritabanında uygulanır ve her güncellemede otomatik testlerle denetlenir.</li>
      <li>Dosyalar (dekont, fatura, fotoğraf) herkese açık bir adreste durmaz; yalnızca yetkili kişiye kısa süreli bağlantıyla açılır.</li>
      <li>Giriş şifresizdir: her girişte e-postana tek kullanımlık kod gelir. Çalınacak bir şifre yoktur.</li>
      <li>Ne sitede ne uygulamada reklam, analiz veya takip aracı vardır.</li>
    </ul>
    <p>Bir sorun ya da önerin varsa <Mail /> adresine yaz.</p>
  </>);
}

// ---------------------------------------------------------------- İletişim / künye
export function ContactText() {
  return (<>
    <p>Soruların, önerilerin ya da bir sorun için bize yazabilirsin. Genellikle bir iş günü içinde dönüyoruz.</p>
    <p className="lead"><Mail /> · {C.telefon}</p>
    <h2>Hizmet sağlayıcı bilgileri</h2>
    <p>6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun uyarınca:</p>
    <Seller />
    <p>Kişisel verilerinle ilgili başvurular için <A to="/kvkk">KVKK Aydınlatma Metni</A>'nin 8. bölümüne bakabilirsin.</p>
  </>);
}

export type LegalPage = { path: string; title: string; desc: string; Body: () => React.ReactElement };
export const LEGAL_PAGES: LegalPage[] = [
  { path: "/guven", title: "Güven Merkezi", desc: "Verilerine ve apartmanının parasına nasıl baktığımız.", Body: TrustText },
  { path: "/kvkk", title: "KVKK Aydınlatma Metni", desc: "Kişisel verilerinin hangi amaçla ve nasıl işlendiği.", Body: KvkkText },
  { path: "/gizlilik", title: "Gizlilik Politikası", desc: "Neyi topluyoruz, neyi asla yapmıyoruz.", Body: PrivacyText },
  { path: "/cerez-politikasi", title: "Çerez Politikası", desc: "Sitede çerez yok; uygulamada yalnızca zorunlu bilgiler.", Body: CookieText },
  { path: "/kullanim-sartlari", title: "Kullanım Şartları", desc: "Apartmanca'yı kullanma koşulları.", Body: TermsText },
  { path: "/on-bilgilendirme-formu", title: "Ön Bilgilendirme Formu", desc: "Abonelik satın almadan önce bilmen gerekenler.", Body: PreInfoText },
  { path: "/mesafeli-satis-sozlesmesi", title: "Mesafeli Satış Sözleşmesi", desc: "Abonelik sözleşmesinin koşulları.", Body: DistanceSalesText },
  { path: "/iptal-ve-iade", title: "İptal ve İade Koşulları", desc: "14 gün koşulsuz iade ve iptal.", Body: RefundText },
  { path: "/iletisim", title: "İletişim", desc: "Bize ulaş; şirket bilgileri.", Body: ContactText },
];
export { LEGAL_UPDATED };
