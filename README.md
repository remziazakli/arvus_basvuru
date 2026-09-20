# ARVUS Başvuru Demosu

HTML, CSS ve JavaScript ile hazırlanmış, kaydırmaya bağlı 3D İHA tanıtımı ve dört adımlı başvuru demosu.

## Animasyonlu giriş

- Three.js ile gerçek zamanlı, temsili 3D sabit kanat İHA modeli.
- Sayfa kaydırıldıkça açılan kanatlar, kamera, kapak ve elektronik bileşenler; sonda tekrar birleşme.
- Bölüm düğmeleriyle doğrudan sahne seçimi ve ilgili kategoriyle başvuruya geçiş.
- Hareketi durdurma kontrolü, azaltılmış hareket tercihi, görünmeyen sekmede/sahnede çizimi durdurma.
- WebGL açılamazsa açıklayıcı mesaj; kategori tanıtımı ve başvuru formu çalışmaya devam eder.
- Bu model kullanıcının paylaştığı bordo İHA ekran görüntülerinden görsel olarak yorumlanmıştır. Geniş süpürülmüş kanatlar, öndeki küçük yatay yüzeyler, çift dikey kuyruk, üç tekerlekli iniş takımı ve arkadaki itici pervane referans alınmıştır. Ölçek, ölçüler ve iç donanım temsilidir; bir CAD rekonstrüksiyonu veya üretim modeli değildir.

## Alan animasyonları

Havacılıkta Yapay Zekâ sahnesinde kameradan alana uzanan görüş çizgileri, tarama çizgisi ve hareketli hedef çerçeveleri; Elektronik Harp sahnesinde anten kaynaklı sinyal halkaları ve taranan temsili spektrum bulunur. Bunlar gerçek ölçüm veya nesne algılama sonuçları değildir. Hareketi durdur kontrolü ve azaltılmış hareket tercihi bu efektlere de uygulanır. Geometri `discipline-effects.js` içinde tanımlıdır.

## İçerik

- Havacılıkta Yapay Zekâ, Elektronik Harp, Uluslararası İHA
- Dördüncü kategori için seçilemeyen geçici kart
- Alan seçimi → kişisel bilgiler → yetkinlikler → son kontrol
- Kategoriye göre değişen sorular ve ilgi alanları
- Alan doğrulama, geri dönüşte bilgilerin korunması, tamamlanma ve yeniden başlama

Bu sürüm gerçek başvuru göndermez. Form verileri yalnızca açık sayfanın belleğinde tutulur; yenilemede silinir. Tamamlama ekranı demo olduğunu belirtir. Harici Google Fonts yüklenemezse sistem yazı tipleri kullanılır.

## Yerelde açma

3D modülleri için dosyaları bir HTTP sunucusu üzerinden açın. Kaynak projede `npm ci` ve `npm run dev` komutlarını kullanın. Hazır indirme paketinde `python -m http.server 8000` çalıştırıp `http://localhost:8000` adresini açabilirsiniz. `index.html` dosyasına çift tıklamak ES modüllerini tarayıcı güvenlik kuralları nedeniyle yüklemeyebilir.

## GitHub Pages

1. GitHub hesabınızda yeni bir repository oluşturun.
2. `dist` içindeki tüm dosyaları ve `vendor` klasörünü repository köküne yükleyin. İndirme paketinde yayın dosyaları zaten köktedir.
3. Repository Settings → Pages bölümünde Deploy from a branch seçin.
4. `main` dalını ve `/ (root)` klasörünü seçip kaydedin.
5. GitHub'ın gösterdiği yayın bağlantısını açın.

Kaynak: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages

GitHub Pages statik sayfayı yayınlar; bu demodaki formu kendiliğinden bir başvuru veritabanına dönüştürmez. Gerçek kullanım öncesi güvenilir bir form servisi veya sunucu uç noktası, sunucu tarafında doğrulama, erişimi sınırlı başvuru kayıtları ve ilgili aydınlatma metni eklenmelidir. Form yanıtlarını public repository içine kaydetmeyin; servis sırlarını istemci koduna koymayın.

## Düzenleme

- Görünüm: `style.css`
- Animasyonlu girişin görünümü: `experience.css`
- 3D model: `aircraft.js`
- Kaydırma sahneleri, hareket kontrolü: `flight.js`
- Kartlar ve form metinleri: `index.html`
- Kategoriye özel sorular ve seçenekler: `app.js` içindeki `categories`
- Takım adı ve üniversite bilgisi: `index.html`

Takım logosu yerine bu demoda geçici bir ARVUS harf işareti kullanılmıştır. Dördüncü kategori, başvuru koşulları ve soru metinleri takım tarafından kesinleştirilmelidir.

Three.js 0.186.0 yerel olarak `vendor` altında tutulur; çalışma anında CDN gerekmez. MIT lisansı `vendor/THREE-LICENSE.txt` içindedir. Geliştirme bağımlılıkları `package-lock.json` ile sabitlenmiştir.

## Ayrı kategori sayfaları

Ana sayfadaki kartlar ayrı HTML sayfalarına gider:
- `havacilikta-yapay-zeka.html`: kullanıcının sağladığı havacılık videosu.
- `elektronik-harp.html`: kullanıcının sağladığı elektronik harp videosu.
- `uluslararasi-iha.html`: mevcut modelin ayrı 3D sahnesi, parçaları ayırma/birleştirme kontrolü.

Videolar `media/` klasöründe optimize edilmiş ve sessizdir. Oynatma/durdurma, sekme görünürlüğü ve azaltılmış hareket tercihi desteklenir. Bunlar konsept videolardır; gerçek takım operasyonu veya yarışma başarısı gösterimi değildir.

Her sayfadaki başvuru bağlantısı `index.html?alan=ai#application` gibi doğrulanan bir kategori parametresiyle formun kişisel bilgiler adımını açar. Bağlantılar göreli olduğu için GitHub Pages proje alt dizinleriyle uyumludur.
