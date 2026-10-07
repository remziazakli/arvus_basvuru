# Üye silme

Yönetici **Üyeler → Üyeyi sil** ile kişiyi normal üye listesinden kaldırır ve
erişimini kapatır. Onay ekranı açık görev ve devam eden zimmet sayılarını gösterir.
İşlem Google hesabını veya Firebase Authentication kullanıcısını fiziksel olarak
silmez; portal içindeki üyeliği arşivler. Görev, öğrenme, zimmet, başvuru ve mali
kayıtlar korunur. Devam eden işler başka üyeye atanmalı, ekipman iadesi ayrıca alınmalıdır.

**Silinen üyeleri göster → Geri al** üyeyi erişimi kapalı halde geri getirir.
Yönetici daha sonra **Düzenle → Erişim: Açık** seçerek yeniden girişe izin verir.
Silinen üyenin e-posta eşlemesi korunur; başvuru dosyasını tekrar içe almak üyeyi
kendiliğinden etkinleştirmez. Ayrılmış adres yeniden farklı bir üyeye atanmaz.

`portalAccess` ile `portalMembers` aynı transaction içinde güncellenir.
Silme zamanı ve yapan yönetici erişim kaydında tutulur. Kurallar yarım işlemi,
silinmiş hesabı aktif etmeyi, audit bilgisinin sonradan değiştirilmesini ve fiziksel
silme taleplerini reddeder. İşlemi yapan yönetici kendisini veya iki sistem sahibi
hesabı silemez. Üyeler ve mentorlar bu işlemleri yapamaz. Tam JSON yedeği arşivi de içerir.
