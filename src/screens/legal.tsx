import React from "react";
import { Link } from "../state";
import { Brand } from "./auth";

// Yayından önce doldurulacak bilgiler (veri sorumlusu)
export const LEGAL = {
  owner: "[Veri sorumlusunun adı soyadı / şirket unvanı]",
  address: "[Açık adres]",
  email: "[iletişim e-posta adresi]",
  updated: "15 Ekim 2026",
};

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="legal">
      <header className="legal-top"><Link to="/"><Brand small /></Link><Link to="/" className="small">Uygulamaya dön</Link></header>
      <article className="legal-body">
        <h1>{title}</h1>
        <p className="muted small">Son güncelleme: {LEGAL.updated}</p>
        {children}
        <nav className="legal-nav">
          <Link to="/kvkk">KVKK Aydınlatma Metni</Link>
          <Link to="/gizlilik">Gizlilik Politikası</Link>
          <Link to="/kullanim-sartlari">Kullanım Şartları</Link>
        </nav>
      </article>
    </div>
  );
}

export function Kvkk() {
  return (
    <Shell title="KVKK Aydınlatma Metni">
      <p>Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu'nun ("KVKK") 10. maddesi uyarınca, KOMŞUM uygulamasını kullanan yöneticileri ve bina sakinlerini kişisel verilerinin işlenmesi hakkında bilgilendirmek için hazırlanmıştır.</p>

      <h2>1. Veri sorumlusu</h2>
      <p>{LEGAL.owner}, {LEGAL.address}. İletişim: {LEGAL.email}</p>
      <p>Apartman veya site yönetimi, kendi binasına ait kayıtları (aidat, gider, kasa, belge) KOMŞUM üzerinden tutar. Bu kayıtların içeriğinden ve doğruluğundan ilgili yönetim sorumludur; KOMŞUM bu kayıtları yönetim adına saklar ve sunar.</p>

      <h2>2. İşlenen kişisel veriler</h2>
      <ul>
        <li><b>Kimlik:</b> ad, soyad.</li>
        <li><b>İletişim:</b> e-posta adresi, isteğe bağlı telefon numarası.</li>
        <li><b>Konut bilgisi:</b> üye olunan apartman ve daire.</li>
        <li><b>Finansal kayıtlar:</b> aidat borçları, ödeme kayıtları, ödeme bildirimleri ve yüklenen banka dekontları.</li>
        <li><b>Görsel ve belge kayıtları:</b> arıza talebine eklenen fotoğraflar, yönetimin yüklediği belgeler.</li>
        <li><b>İşlem güvenliği:</b> giriş kayıtları, IP adresi, cihaz ve bildirim aboneliği bilgileri.</li>
      </ul>

      <h2>3. İşleme amaçları ve hukuki sebepler</h2>
      <ul>
        <li>Hesabın oluşturulması, giriş ve apartmana üyelik: sözleşmenin kurulması ve ifası (KVKK m. 5/2-c).</li>
        <li>Aidat, ödeme, gider ve kasa kayıtlarının tutulması ve sakinlere şeffaf şekilde gösterilmesi: sözleşmenin ifası (m. 5/2-c) ve yönetimin kanuni yükümlülükleri (m. 5/2-ç).</li>
        <li>Duyuru, hatırlatma ve telefon bildirimlerinin gönderilmesi: sözleşmenin ifası (m. 5/2-c).</li>
        <li>Hizmetin güvenliği, kötüye kullanımın önlenmesi ve hataların giderilmesi: meşru menfaat (m. 5/2-f).</li>
        <li>Hukuki uyuşmazlıklarda hakların korunması: bir hakkın tesisi, kullanılması veya korunması (m. 5/2-e).</li>
      </ul>

      <h2>4. Aktarım</h2>
      <p>Kişisel veriler yalnızca hizmetin sunulması için gerekli olduğu ölçüde şu hizmet sağlayıcılarla paylaşılır: veritabanı ve dosya barındırma (Supabase, Avrupa Birliği sunucuları), uygulama barındırma (Vercel), e-posta gönderimi ve telefon bildirim servisleri (Google, Apple, Mozilla). Bu sağlayıcıların bir kısmı yurt dışında bulunduğundan aktarım, KVKK m. 9'da öngörülen güvenceler çerçevesinde yapılır.</p>
      <p>Apartman içinde: kasa hareketleri, giderler, duyurular ve paylaşılan belgeler tüm üyelere; bir dairenin borç, ödeme ve dekont bilgileri yalnızca o dairenin sakinlerine ve yönetime görünür. Ad ve telefon bilgisi aynı apartmandaki üyelerce görülebilir.</p>
      <p>Kanunen yetkili kurum ve kuruluşlara, talep halinde ve mevzuatın gerektirdiği ölçüde aktarım yapılabilir.</p>

      <h2>5. Toplama yöntemi</h2>
      <p>Veriler, uygulamaya girdiğin bilgiler, yüklediğin dosyalar ve yönetimin girdiği kayıtlar aracılığıyla elektronik ortamda toplanır.</p>

      <h2>6. Saklama süresi</h2>
      <p>Hesap bilgileri hesabın açık olduğu süre boyunca saklanır. Hesabını sildiğinde adın ve telefonun silinir; apartmanın muhasebe kayıtları (ödeme, gider, kasa hareketleri) yönetimin yasal kayıt yükümlülükleri nedeniyle "Silinmiş kullanıcı" adıyla korunur ve ilgili mevzuattaki süreler sonunda silinir veya anonim hale getirilir.</p>

      <h2>7. Hakların</h2>
      <p>KVKK m. 11 uyarınca; verilerinin işlenip işlenmediğini öğrenme, bilgi talep etme, amacına uygun kullanılıp kullanılmadığını öğrenme, aktarıldığı üçüncü kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini, şartları oluşmuşsa silinmesini isteme, bu işlemlerin aktarılan kişilere bildirilmesini isteme, otomatik analiz sonucu aleyhine bir sonuca itiraz etme ve zarara uğraman halinde tazminat talep etme haklarına sahipsin.</p>
      <p>Başvurularını {LEGAL.email} adresine iletebilirsin. Başvurular en geç 30 gün içinde ücretsiz olarak sonuçlandırılır. Hesabını uygulamadaki <b>Ayarlar → Hesabımı sil</b> bölümünden kendin de silebilirsin.</p>
    </Shell>
  );
}

export function Privacy() {
  return (
    <Shell title="Gizlilik Politikası">
      <p>KOMŞUM, apartman ve site yönetimini şeffaf hale getirmek için tasarlanmış bir uygulamadır. Bu politika hangi bilgileri neden topladığımızı ve nasıl koruduğumuzu sade bir dille anlatır. Ayrıntılı yasal bilgi için <Link to="/kvkk">KVKK Aydınlatma Metni</Link>'ne bakabilirsin.</p>
      <h2>Ne topluyoruz?</h2>
      <p>Giriş için e-posta adresini; komşuların seni tanıması için adını ve isteğe bağlı telefonunu; apartmanın işleyişi için aidat, ödeme, gider, duyuru, arıza ve belge kayıtlarını; bildirim gönderebilmek için cihazının bildirim aboneliğini saklarız.</p>
      <h2>Ne yapmıyoruz?</h2>
      <ul>
        <li>Verilerini satmayız, reklam için kullanmayız ve üçüncü kişilerle pazarlama amacıyla paylaşmayız.</li>
        <li>Uygulama içinde reklam ya da izleme aracı kullanmayız.</li>
        <li>Kart bilgisi saklamayız. KOMŞUM aidat ödemesini kendisi tahsil etmez; yapılan ödemelerin kaydını tutar.</li>
      </ul>
      <h2>Kim neyi görür?</h2>
      <ul>
        <li><b>Tüm apartman üyeleri:</b> kasa bakiyesi, kasa hareketleri, giderler, duyurular, paylaşılan belgeler, üyelerin adları.</li>
        <li><b>Yalnızca kendi dairen ve yönetim:</b> dairenin borçları, ödemeleri, ödeme bildirimlerin ve dekontların.</li>
        <li><b>Yalnızca sen ve yönetim:</b> açtığın arıza talepleri ve fotoğrafları.</li>
      </ul>
      <h2>Nasıl koruyoruz?</h2>
      <p>Bağlantılar şifrelidir (HTTPS). Erişim kuralları veritabanı düzeyinde uygulanır; bir kullanıcı yetkisi olmayan kaydı göremez. Para içeren kayıtlar silinemez; düzeltmeler gerekçeyle kayıt altına alınır. Dosyalar yalnızca yetkili kişilere kısa süreli bağlantılarla açılır.</p>
      <h2>Hesabını silmek</h2>
      <p><b>Ayarlar → Hesabımı sil</b> ile hesabını istediğin zaman silebilirsin. Adın, telefonun ve bildirim kayıtların silinir; giriş hesabın kapatılır. Apartmanın muhasebe kayıtları yasal yükümlülükler nedeniyle "Silinmiş kullanıcı" adıyla kalır.</p>
      <h2>İletişim</h2>
      <p>Sorularını {LEGAL.email} adresine yazabilirsin.</p>
    </Shell>
  );
}

export function Terms() {
  return (
    <Shell title="Kullanım Şartları">
      <p>KOMŞUM'u kullanarak bu şartları kabul etmiş olursun. Lütfen dikkatlice oku.</p>
      <h2>1. Hizmet</h2>
      <p>KOMŞUM; aidat takibi, ödeme kaydı ve bildirimi, kasa ve gider kaydı, duyuru, arıza talebi ve belge saklama araçları sunan bir apartman yönetimi uygulamasıdır. KOMŞUM bir ödeme kuruluşu değildir; aidat tahsil etmez, para transferi yapmaz, yalnızca kullanıcıların girdiği kayıtları tutar.</p>
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
      <h2>5. Ücretlendirme</h2>
      <p>Bina sakinleri KOMŞUM'u ücretsiz kullanır. Apartman için abonelik ücreti, uygulamada ve web sitesinde duyurulan güncel tarifeye göre yönetimden alınır. Pilot dönemde hizmet ücretsiz sunulabilir. Ücretli döneme geçişten önce yöneticiler bilgilendirilir.</p>
      <h2>6. Yasak kullanım</h2>
      <p>Uygulamayı yasa dışı amaçlarla, başkalarını rahatsız edecek, karalayacak veya kişilik haklarını ihlal edecek şekilde kullanamazsın. Bu şartlara aykırı kullanımda hesap askıya alınabilir.</p>
      <h2>7. İçerik</h2>
      <p>Yüklediğin dosya ve metinlerin sahibi sen ya da apartman yönetimidir. KOMŞUM'a bu içerikleri yalnızca hizmeti sunmak amacıyla saklama ve gösterme izni verirsin.</p>
      <h2>8. Hizmetin sürekliliği ve sorumluluk</h2>
      <p>Hizmeti kesintisiz ve hatasız sunmak için özen gösteririz, ancak bunu garanti edemeyiz. Yasal sınırlar içinde, dolaylı zararlardan ve kullanıcıların girdiği kayıtların içeriğinden doğan zararlardan sorumlu değiliz. Önemli kayıtların dışa aktarma özelliğiyle yedeğini almanı öneririz.</p>
      <h2>9. Hesabın kapatılması</h2>
      <p>Hesabını istediğin zaman <b>Ayarlar → Hesabımı sil</b> ile kapatabilirsin. Yönetici, hesabını silmeden önce yönetimi bir sakine devretmelidir.</p>
      <h2>10. Değişiklikler ve uygulanacak hukuk</h2>
      <p>Bu şartlar güncellenebilir; önemli değişiklikler uygulama içinde duyurulur. Bu şartlara Türkiye Cumhuriyeti hukuku uygulanır.</p>
      <h2>İletişim</h2>
      <p>{LEGAL.owner} · {LEGAL.email}</p>
    </Shell>
  );
}
