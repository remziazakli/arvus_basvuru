# ARVUS Takım Portalı

Yayın sonrası adres: `https://arvus-basvuru.web.app/yonetim/`

Portal aynı Firebase projesini kullanır; `/` başvuru sitesi ve `/admin.html`
başvuru yönetimi yerinde kalır. Yeni koleksiyonların tamamı `portal` öneki taşır.

## İlk kullanım

1. `rmzazakli@gmail.com` veya `remziazakli@gmail.com` Google hesabıyla giriş yap.
2. İlk ekrandaki **Çalışma alanını başlat** düğmesine bas.
3. Dört çalışma alanı, üç başlangıç öğrenme rotası ve mevcut üç yönetici
   (`rmzazakli@gmail.com`, `remziazakli@gmail.com`, `sudenzturk@gmail.com`)
   oluşturulur. Var olan kayıtlar değiştirilmez. Sulbur için erişim oluşturulmaz.
4. **Üyeler → Üye ekle**: kişinin Google hesabındaki e-postayı, rolünü ve
   takımlarını seç. **Erişim: Açık** olarak kaydet.
5. Üyeye portal adresini ilet. Sistem kendiliğinden davet e-postası göndermez.

İlk iki Remzi hesabı sistem sahibi olarak Firestore kurallarında tanımlıdır.
Bu hesaplar panelden pasife alınamaz. Diğer yöneticiler dahil tüm davetli
hesapların erişimi Üyeler ekranından kapatılabilir. Bu paneldeki roller,
başvuru sitesinin mevcut yönetici izinlerini değiştirmez.

## Yetkiler

### Yanlış Google e-postasını düzeltme

**Üyeler → Düzenle → Google e-posta adresi → Kaydet** adımlarını kullan.
Değişikliği onayladığında eski adresin erişimi kapanır. Yeni adres aynı üyeliği,
rolü, takımını, görevlerini, yorumlarını, öğrenme adımlarını ve zimmetlerini kullanır.
Erişimi kapalı bir üyeyi düzeltmek hesabı kendiliğinden etkinleştirmez.
Başka bir üyeye kayıtlı adres kabul edilmez. Sistem sahibi adresleri ve kendi
giriş adresin bu ekrandan değiştirilemez. İşlem Google hesabının kendisini veya
başvuru panelindeki orijinal yanıtı değiştirmez; portalın giriş eşleşmesini düzeltir.

Üyelerin kalıcı kimliği ilk kayıt adresidir; düzeltilmiş Google adresi
`loginEmail` alanında, eşleşmesi `portalLogins` koleksiyonunda tutulur.
Yedekler bu eşleşmeleri de içerir. Eski başvuru dosyasını tekrar içe almak
düzeltilmiş üyeyi çoğaltmaz veya düzeltmeyi geri almaz.

| İşlem | Üye | Mentor | Yönetici |
|---|---|---|---|
| Kendi görevini ve çıktısını güncelleme | Evet | Evet | Evet |
| Göreve yorum yazma | Kendi görevi | Kendi takımları | Tümü |
| Görev oluşturma / atama | Hayır | Kendi takımları | Tümü |
| Öğrenme çıktısı gönderme | Kendi ataması | Kendi ataması | Kendi ataması |
| Öğrenme çıktısı onaylama | Hayır | Atandığı mentorluğu | Kendisi dışındaki üyeler |
| Kişisel üye bilgileri | Kendisi | Kendi takımları | Tümü |
| Hesap, rol ve erişim yönetimi | Hayır | Hayır | Evet |
| Ekipman bilgileri | Okuma | Okuma | Yönetme |
| Zimmet geçmişi | Kendisi | Kendisi | Tümü |
| Fiziksel iade onayı | Hayır; talep oluşturur | Hayır; talep oluşturur | Evet |

Yetkiler yalnızca arayüzde değil Firestore Security Rules içinde uygulanır.
Google e-posta doğrulaması ve Google sağlayıcısı zorunludur. Kullanıcı kendi
rolünü veya takımını değiştiremez. Bir üyenin hesabını pasife almak kayıtlarını
silmez. Mentor/zimmet gibi geçmiş ilişkiler korunur.

## İş akışları

- Görevler: yapılacak → devam ediyor → tamamlandı. Engel açıklaması bulunan
  görev tamamlanamaz. Çıktı notu ve yalnızca HTTP(S) bağlantısı desteklenir.
- Yorumlar: kimliği doğrulanmış yazar ve sunucu zamanı ile kaydedilir.
  Yorumlar ve görevdeki son yorum bilgisi tek işlemde yazılır.
- Öğrenme: 1–15 adımlı rota, farklı üye ve mentor, hedef tarih. Çıktı sunulunca
  incelemeye girer; mentor onaylar veya gerekçeli düzeltme ister. Onaylı çıktıyı
  üye değiştiremez. Atama şablonun kopyasını tutar.
- Ekipman: her envanter kodu tek cihazdır. Teslim ve iade Firestore transaction
  ile yapılır; iki yönetici aynı cihazı aynı anda teslim edemez. Üye iade talebi
  verir; yönetici fiziksel teslimi doğrular.
- Bildirim kutusu: görünür görevlerin son güncellemesi, son yorum, öğrenme
  değerlendirmesi ve zimmet durumundan türetilir. Okundu bilgisi kullanıcıya
  özel kaydedilir. Bu bir e-posta, anlık push veya kalıcı olay arşivi değildir.
- Başvuru aktarımı: `ARVUS-APPLICATIONS` JSON dosyasındaki benzersiz e-postalar
  erişimi kapalı olarak eklenir. Mevcut üyeler değiştirilmez. Orijinal başvuru
  yanıtları başvuru panelinde kalır. Aktarım kişi başına atomiktir; kesilirse
  dosya yeniden seçilerek mevcut kayıtlar atlanabilir.
- Yedek: yönetici tüm portal koleksiyonlarını, görev yorumlarını ve öğrenme
  adımlarını sunucudan sayfalayarak indirir. Hata/oturum değişiminde kısmi dosya
  oluşturulmaz. Bildirimlerin okundu bilgisi dahil değildir. Bu sürümde buluta
  otomatik yedek geri yükleme yoktur; JSON denetimli geri yükleme içindir.

## Oturum ve veri davranışı

Firebase Auth oturumu sekme oturumu boyunca tutulur. Firestore verileri kalıcı
çevrimdışı önbelleğe yazılmaz. Yetki değişimi/çıkışta kayıtlar ve açık ayrıntı
pencereleri temizlenir. Çevrimdışı yazma kuyruğu kullanılmaz; sunucu onayı
gelmeden başarı gösterilmez. Çakışan form düzenlemelerinde kullanıcıdan kaydı
yeniden açması istenir.

Listeler 200 kayıtla başlar, Daha fazla yükle ile 2000'e kadar açılır; daha büyük
veri için yönetici tam yedeği kullanılabilir. Görev ayrıntısında en son 100 yorum
gösterilir. Bunlar açıkça arayüzde belirtilir.

## Geliştirme / yayın

```sh
npm ci
npm run build:portal
npm test
npm run test:portal-rules
npx playwright install chromium --only-shell
npm run test:portal-browser
```

Kaynak: `portal/*.js`. Çıktı: `public/yonetim/app.js`. Arayüz CSS/HTML dosyaları
`public/yonetim/` içindedir. Firebase web yapılandırması Hosting'in
`/__/firebase/init.json` yolundan okunur. Tarayıcıya servis hesabı anahtarı konmaz.
`arvus-basvuru` dışında projeye bağlanma reddedilir.

Firestore kuralları `firestore.rules` içindedir. `portal/portal.rules.fragment`
yalnızca yeni bölümün kaynak kopyasıdır; yayımlanan dosya tam kurallardır.
Başvuru kurallarının üzerine yalnızca fragment yapıştırılmamalıdır.

Tarayıcı testi yalnızca yerel Auth/Firestore emülatörüne gider. Google hesap
seçim penceresi yerine bellek içinde hazırlanan test paketinde emülatörün
sentetik kimlikleri kullanılır; bu kod yayınlanan pakete girmez. Gerçek Google
hesap seçimi ve Firebase alan adı ayarı yayın sonrasında hesap sahibi tarafından
doğrulanmalıdır.

Pull request üzerinde testler çalışır; otomatik canlı yayın yapılmaz.
Main dalına gönderimde GitHub Actions akışı önce testleri, ardından
Firestore kurallarını ve Hosting'i yayımlar. Ayrı ödeme gerektiren Functions,
Storage veya e-posta servisi eklenmemiştir; Firebase projesinin kotaları geçerlidir.
