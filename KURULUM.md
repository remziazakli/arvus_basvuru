# ARVUS — ücretsiz kayıt ve e-posta bildirimini açma

Site: https://arvus-basvuru.web.app  
Yönetim paneli: https://arvus-basvuru.web.app/admin.html  
Yönetici Google hesabı ve bildirim alıcısı: **remziazakli@gmail.com**

Kod GitHub'da hazırdır. Aşağıdaki hesap ayarları tamamlanmadan kayıt ve e-posta çalışmaz. Hosting yayını yalnızca site dosyalarını yayınlar; Firestore kurallarını ve Google görevini ayrıca aşağıdaki şekilde etkinleştir. Kart bağlamak, Blaze'e geçmek veya Cloud Functions kurmak gerekmez. Site dosyalarında Google şifresi veya hizmet hesabı anahtarı yoktur.

## 1. Firebase web uygulaması

[Firebase projesini aç](https://console.firebase.google.com/project/arvus-basvuru/overview). Project settings → General → Your apps bölümünde bir web uygulaması yoksa **Add app → Web (</>)** ile `ARVUS Web` oluştur. Analytics gerekli değil. SDK kodunu kopyalaman gerekmez: site, kendi Firebase Hosting adresindeki `/__/firebase/init.json` üzerinden açık web yapılandırmasını alır.

## 2. Giriş yöntemleri

[Authentication'ı aç](https://console.firebase.google.com/project/arvus-basvuru/authentication/providers). Get started → Sign-in method / Sign-in providers:

- **Anonymous**: Enable → Save. Adaylar hesap açmadan başvurur.
- **Google**: Enable; destek e-postası için hesabını seç → Save. Yönetici Google ile giriş yapar.

Authentication → Settings → Authorized domains listesinde `arvus-basvuru.web.app` ve `arvus-basvuru.firebaseapp.com` bulunduğunu kontrol et, eksikse Add domain ile ekle.

## 3. Veritabanı ve erişim kuralları

[Firestore Database'i aç](https://console.firebase.google.com/project/arvus-basvuru/firestore). Create database → **Standard edition**, database ID **(default)** → uygun Avrupa konumu (ör. `eur3`) → **Production mode** → Create. Mevcut veritabanı varsa yeniden oluşturma.

Firestore → **Rules** bölümüne gir. Bu depodaki [firestore.rules](firestore.rules) dosyasını aç → **Raw** → tüm içeriği kopyala. Rules editöründeki metni bununla değiştir → **Publish**. Test mode veya `allow read, write: if true` kullanma: form kişisel bilgi toplar.

Kurallar: yalnızca doğrulanmış `remziazakli@gmail.com` Google hesabı tüm başvuruları görebilir. Aday sadece kendi anonim oturumunun başvurusunu tekil olarak okuyabilir; diğer başvuruları listeleyemez, değiştiremez. Her anonim oturumdan her alana bir kayıt yapılabilir. Telefon numarası, başvuru metinleri ve uzunlukları kurallarla doğrulanır. Dördüncü kart olan **Diğer**, adayın kendi alanını yazmasına izin verir. Başvurular yönetici açana kadar kapalıdır.

## 4. Yönetim paneli

[Yönetim panelini aç](https://arvus-basvuru.web.app/admin.html). **Google ile giriş yap** → `remziazakli@gmail.com` hesabını seç. Liste boş olması normaldir. E-posta kurulumunu tamamlayana kadar başvurular kapalı kalabilir.

## 5. Ücretsiz e-posta görevini oluştur

[Google Apps Script'i aç](https://script.google.com/home). **Firebase projesinde yetkisi olan Google hesabıyla** giriş yap → **New project**. Adını `ARVUS Başvuru Bildirimleri` koy.

Panel hesabı ile projenin sahibi farklı olabilir. Görevi mevcut Firebase proje sahibi hesabıyla çalıştırabilirsin; alıcı yine `remziazakli@gmail.com` olur. Görevi alıcı hesabında çalıştırmak istersen Firebase projesinin sahibi [Google Cloud IAM](https://console.cloud.google.com/iam-admin/iam?project=arvus-basvuru) üzerinden bu hesaba **Cloud Datastore User** rolünü vermeli. Yönetici paneline giriş için bu ek IAM rolü gerekmez.

1. Bu depodaki [notifications/Code.gs](notifications/Code.gs) → **Raw** → tamamını kopyala; Apps Script'teki **Code.gs** içeriğini bununla değiştir.
2. Apps Script sol menü **Project Settings** (dişli) → **Show appsscript.json manifest file in editor** seçeneğini işaretle.
3. Editöre geri dön; soldaki **appsscript.json** dosyasını aç. İçeriğini bu depodaki [notifications/appsscript.json](notifications/appsscript.json) dosyasının **Raw** içeriğiyle değiştir.
4. Kaydet. Üstte fonksiyon listesinden **setupNotifications** seç → **Run**.
5. Google'ın izin ekranında kendi oluşturduğun bu projeye, Firestore erişimi, e-posta gönderme ve zamanlayıcı oluşturma izinlerini ver. Kod gelen kutunu okumaz. Proje doğrulanmamış uyarısı çıkarsa proje adının kendi oluşturduğun `ARVUS Başvuru Bildirimleri` olduğundan emin ol; bu kişisel kod için izin akışını tamamla.
6. Execution log'da **Kuruldu: yeni başvurular yaklaşık 5 dakikada bir kontrol edilecek** satırını gör. Sol menü **Triggers** bölümünde `checkApplications` görevi görünmeli. **Deploy / Web app yayını yapma**; buna gerek yok.

Görev, yeni başvuru varsa tek e-postada başvuru sayısını ve panel bağlantısını gönderir. İsimler, yanıtlar ve diğer aday bilgileri e-postaya konmaz. Başvuru yoksa mesaj gönderilmez. Aynı beş dakikadaki başvurular birleştirilir. Günlük gönderim kotası dolarsa başvurular kaybolmaz; bildirim sonraki uygun çalışmaya kalır. Zamanlayıcı yaklaşık çalışır, kesin anlık teslim garantisi yoktur.

## 6. Başvuruları aç ve uçtan uca dene

1. Yönetim panelindeki **Başvuruları aç** düğmesine bas.
2. Sitede bir alan seç, örnek bilgilerle bir deneme başvurusu gönder. Gerçek bir adayın bilgilerini test için kullanma.
3. **Başvurun alındı** mesajını ve başvuru kodunu gör. Panelde kaydın göründüğünü kontrol et.
4. Yaklaşık beş dakika içinde **remziazakli@gmail.com** gelen kutusunu / spam klasörünü kontrol et. Hemen denemek için Apps Script'te **checkApplications → Run** seçebilirsin.
5. Panelden başvuruyu incele ve durumunu değiştir. Deneme kaydını silmek istersen Firestore → Data → applications içindeki doğru deneme belgesini seçip silebilirsin.

## Bir şey çalışmazsa

- **Panelde bağlantı hazır değil:** Web uygulamasını oluşturduğunu ve Hosting yayınının tamamlandığını kontrol et. Sayfayı yenile.
- **auth/operation-not-allowed:** Google ve Anonymous giriş yöntemlerini etkinleştir.
- **Yetki alınamadı / permission-denied:** Firestore kurallarını Publish yaptığını, doğru Google hesabını seçtiğini ve başvuruların panelden açıldığını kontrol et.
- **Google açılır penceresi engellendi:** Tarayıcıda bu site için açılır pencereye izin verip yeniden giriş yap.
- **Apps Script 403:** Görevi çalıştıran Google hesabına Firebase projesinde `Cloud Datastore User` yetkisi gerekir. Hata `SERVICE_DISABLED` diyorsa hata mesajının gösterdiği Google Cloud projesinde Cloud Firestore API'yi etkinleştir. Proje numarasını hata mesajından doğrula; farklı bir projenin ayarını değiştirme.
- **Bildirim gelmiyor:** Apps Script → Executions bölümünde son `checkApplications` çalışmasına bak. Triggers listesi boşsa `setupNotifications` çalıştır. Veritabanındaki `emailNotified: false` kayıtlar bekleyen bildirimlerdir.
- **Tekrar başvuru zaten kayıtlı:** Aynı tarayıcı/anonim oturum ve aynı alanda var olan kayıt korunur. Bu, kişi başına kesin tek kayıt doğrulaması değildir.

## İşletim notları

- Firebase Spark ve Google Apps Script ücretsiz kotaları geçerlidir. Bu kurulum ücretli plana geçmez. Apps Script kişisel hesaplarında günlük toplam alıcı kotası 100'dür; aynı hesaptaki başka scriptler de bu kotayı paylaşır. Firestore ücretsiz kotası günlük 50.000 okuma, 20.000 yazma ve 1 GiB depolamadır.
- Bildirim görevi dakikada sürekli sorgu çalıştırmaz; yaklaşık 5 dakikada bir en fazla 100 bekleyen kaydı alır. Panel ilk açılışta son 50 kaydı dinler, eski kayıtlar düğmeyle yüklenir.
- Mail gönderimi ile veritabanı güncellemesi tek işlem değildir. Gönderimden sonra kesinti olursa kaydedilmiş bildirim onayı bir sonraki çalışmada tamamlanır; e-posta gönderimi ile onay bilgisinin kaydı arasındaki çok kısa kesintide aynı bildirim tekrar gelebilir. Başvuru kaydı tekrarlanmaz.
- Anonim oturum sınırı ve görünmez tuzak alanı tam bot koruması değildir. Anonim oturumunu sıfırlayan biri yeniden başvurabilir; yoğun kötüye kullanımda ücretsiz kota dolabilir. İhtiyaç halinde Firebase App Check eklenebilir. `Başvuruları kapat` düğmesi yeni kayıtları durdurur.
- Başvuru verileri yönetim sayfasının kaynağında veya GitHub'da bulunmaz. Yönetici oturumu sekme oturumu boyunca saklanır; Firestore disk önbelleği açılmaz. Oturum kapatıldığında panelin verileri temizlenir.
- Formdaki veri kullanım açıklaması uygulamanın yaptığı işlemleri açıklar. Saklama süresi ve takımın veri sorumluluğu gibi kurumsal kararlar takım tarafından ayrıca belirlenmelidir. Silme taleplerini projenin sahibi Firestore konsolundan işleyebilir.
- Bildirimleri durdurmak için Apps Script'te `stopNotifications` çalıştır.

Kaynaklar: [Firestore ücretsiz kota](https://firebase.google.com/docs/firestore/quotas), [Apps Script kotaları](https://developers.google.com/apps-script/guides/services/quotas), [Google zamanlayıcıları](https://developers.google.com/apps-script/guides/triggers/installable), [Firestore REST yetkilendirmesi](https://firebase.google.com/docs/firestore/use-rest-api).
