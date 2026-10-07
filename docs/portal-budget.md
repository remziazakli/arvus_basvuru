# Bütçe ve kasa

Yönetim panelinde **Bütçe & kasa** menüsü yalnızca aktif yöneticilere açıktır.
Mentorlar, üyeler ve oturum açmamış kişiler `portalFinance` kayıtlarını doğrudan
veritabanından da okuyamaz veya değiştiremez.

- **Gelir ekle:** tutar, tarih, gönderen, işlem türü, banka/nakit ve takım seçilir.
- **Gider ekle:** gerçekleşen ödeme, alıcısı ve açıklamasıyla kaydedilir.
- Başlangıçtaki para, **Açılış bakiyesi** türünde bir gelir olarak girilir.
- Tutar örneği: `1250,50`. Binlik ayırıcı kullanılmaz; veri tam sayı kuruş olarak saklanır.
- İsteğe bağlı dekont bağlantısı eklenir; dosya yükleme veya banka bağlantısı yoktur.
- Hatalı işlem **İptal et** ile gerekçelendirilir, gerekiyorsa yeni kayıt açılır.
  Eski tutar, kaydeden ve iptal eden yönetici ile tarihler korunur; fiziksel silme yoktur.
- Bakiyeler tüm aktif kayıtları kapsar. Arama/takım filtresi yalnızca listeyi süzer.
- **Kayıtları yenile**, diğer yöneticilerin son işlemlerini alır. Son yenileme saati
  görünür; çevrimdışı veya eksik yüklemede kesin bakiye gösterilmez.
- Sayfalama tüm kayıtları yükler; ilk 100/200 kayıttan kesilmiş bir bakiye hesaplanmaz.
- **Bütçe yedeği indir** ve yönetim sayfasındaki **Tam yedek indir** iptal geçmişi
  dahil bütçe kayıtlarını içerir. Yedekler hassas mali bilgi içerir.

Bu modül TL cinsinden iç gelir/gider takibidir. Para transferi, banka mutabakatı,
resmî muhasebe, fatura kesme, vergi hesabı veya kasa-arası transfer yapmaz.
Yeni kayıtlar varsayılan olarak boş başlar; canlı veriye örnek para hareketi eklenmez.
