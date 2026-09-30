# ARVUS takım yönetimi

Panel: /yonetim/ — mevcut / ve /admin.html başvuru sistemi korunur.
Yeni veriler sadece team_ önekli koleksiyonlara yazılır. Başvurular içe alma sırasında
okunmaz, değiştirilmez veya silinmez; yönetici kendi indirdiği JSON dosyasını seçer.

## Giriş ve roller

Google Authentication ve mevcut Firebase Hosting projesinin /__/firebase/init.json
yapılandırması kullanılır. Panelin Firebase uygulaması ayrı isim ve session
persistence kullanır; adayın anonim başvuru oturumunu değiştirmez. Firestore disk
önbelleği açılmaz. Çıkış/üyelik değişikliğinde abonelikler ve görünür veriler temizlenir.

Kalıcı yöneticiler:
- rmzazakli@gmail.com
- remziazakli@gmail.com
- sudenzturk@gmail.com

Bu üç hesap doğrulanmış Google girişiyle ilk kurulumu yapar; profil oluşturmak gerekmez.
sulbur.korkmaz@gmail.com engellidir. İçe aktarma, üye düzenleme ve Firestore kuralları
bu hesaba yeniden erişim verilmesini reddeder. Kalıcı yönetici profilleri panelden
değiştirilemez.

| İşlem | Yönetici | Mentor | Üye |
|---|---|---|---|
| Takım/birim ve üyelik yönetimi | Evet | Hayır | Hayır |
| Görev/rota oluşturma ve düzenleme | Tüm takımlar | Kendi takımları | Hayır |
| Görev durumu/kanıtı | Evet | Kendi takımları | Atandığı, kapanmamış görev |
| Görevi tamamlandı yapma | Evet | Kendi takımları | Hayır |
| Yorum | Eriştiği takım | Kendi takımları | Kendi takımları |
| Kanıt gönderme | Kendisi | Kendisi | Kendisi |
| Mentor değerlendirmesi | Başkasının çalışması | Kendi takımında başkasının çalışması | Hayır |
| Envanter ve zimmet yönetimi | Evet | Salt okuma | Salt okuma |
| Bildirim gönderme | Evet | Kendi takımları | Hayır |
| Bildirim okuma | Kendisine gelen; yedekte tümü | Kendisine gelen | Kendisine gelen |
| JSON yedek / üye içe alma | Evet | Hayır | Hayır |

Panelden verilen admin rolü takım panelini yönetir; applications koleksiyonuna ve
başvuru açma/kapatma ayarına erişim KAZANDIRMAZ. Başvuru admin() fonksiyonu ve
applications/settings kuralları değişmemiştir.

## İlk kullanım

1. Kalıcı yönetici hesabıyla /yonetim/ adresine gir.
2. Genel bakıştan başlangıç takımlarını oluştur. Elektronik Harp (ew),
   Uluslararası İHA (uav), Havacılıkta Yapay Zekâ (ai) eklenir. Mevcut kayıtlar korunur.
3. Üyeler bölümünden kişinin Google e-postasını, rolünü, takımlarını ve birimini seç.
   Panel erişimi etkin kutusunu işaretle. Aynı kişi birden çok takımda olabilir.
4. Bir üyeyi çıkarmak için etkin kutusunu kaldır. Kayıt ve zimmet geçmişi silinmez.
5. Görev/rota oluştur. Üye kanıt gönderince mentor değerlendirir; onaylanmış kanıt
   üye tarafından değiştirilemez. Düzeltme istenen çalışma yeniden gönderilebilir.
6. Envanterde her fiziksel ekipmanı ayrı kayıt olarak tut. Zimmet ve iade Firestore
   transaction ile ekipman ve geçmiş kaydını birlikte günceller. Çift zimmet reddedilir.

Üyeler etkin üye dizininde ad/e-posta/rol/takım/birim görür. Başvuru formunun telefon,
motivasyon ve diğer cevapları üye profiline kopyalanmaz. Takım görevleri, yorumları,
envanteri ve zimmet geçmişi o takımın etkin üyelerince okunur. Kanıt değerlendirmeleri
yalnız sahibine, takım mentorlarına ve yöneticilere görünür.

## İçe alma ve yedek

/admin.html → Tüm başvuruları indir → /yonetim/ Veri aktarımı → Başvuru JSON seç.
ARVUS-APPLICATIONS sürüm 1, source arvus-basvuru formatı doğrulanır. E-postalar
normalleştirilir; tekrarlanan adayların takım başvuruları birleştirilir. Önizlemede
kişiler açıkça seçilir. Yeni üyeler her zaman member / active:false olarak eklenir.
Mevcut üyeler transaction içinde atlanır; roller ve etkinlik durumu korunur.
Bilinmeyen/Diğer kategorisinde takım ataması yöneticiye bırakılır. Dosya en fazla
10 MB / 5000 başvuru olabilir. Kesintide tekrar içe alma güvenlidir.

JSON yedeği bütün team_ koleksiyonlarını 100 kayıtlık sayfalarla indirir. Bu, dosya
dışa aktarımıdır; otomatik geri yükleme veya Firebase sunucu yedeği değildir.
Timestamp alanları ISO tarihe çevrilir. Uzun aktarım tutarlı bir anlık görüntü
garanti etmez; yoğun değişiklik olmayan bir zamanda alın. Dosyada kişisel bilgi
bulunur. Başvuru kayıtları ayrı başvuru dışa aktarımıyla yedeklenir.

Canlı ekranlar koleksiyon başına 500 kayıt ile sınırlıdır. Bu sınıra ulaşıldığında
uyarı görünür; takım seçimiyle sorguyu daralt. Tam arşiv JSON yedeğinde sayfalanır.
Panel açıkken snapshot dinleyicileri çalışır; bildirimler panel içidir.
E-posta veya işletim sistemi push bildirimleri eklenmemiştir.

## Test / derleme / yayın

Node.js 22, Java 21 önerilir:

    npm ci
    npm run build
    npm test
    npm run test:rules

build, JavaScript sözdizimini ve göreli modül yollarını doğrular, public/ ağacını
dist/ klasörüne kopyalar. Firebase Hosting mevcut public/ kökünü kullanmayı sürdürür;
SPA rewrite eklenmez. /yonetim/ kendi index.html dosyasından sunulur.

Yetki testleri sadece demo-arvus Firestore emulatorünü kullanır. Mevcut başvuru
kuralları ve e-posta testleriyle birlikte çalışır. CI üretim anahtarı kullanmaz,
gerçek kayıtlara erişmez ve yayın yapmaz. Statik derleme Actions artifact olur.
Güvenlik testi fixture'ı mevcut başvuru kurallarının değiştirilmediğini doğrular.

İnceleme/merge öncesi ARVUS panel checks başarılı olmalıdır. main'e merge mevcut
Publish ARVUS to Firebase iş akışını tetikler; önce Firestore kuralları, sonra
Hosting yayımlanır. PR açılması canlı siteyi değiştirmez. Mevcut deploy hizmet
hesabının Firestore kural yayını yetkisi korunmalıdır. Google giriş yöntemi ve
yetkili alan adları mevcut Firebase projesinde etkin olmalıdır.

Elle son kabul kontrolü: gerçek Google hesaplarıyla yönetici/mentor/üye girişi,
telefon ekranında gezinme, pasifleştirilen hesabın erişiminin kesilmesi ve gerçek
başvuru JSON'unun önizlemesi. Test için gerçek aday verilerini repoya eklemeyin.
