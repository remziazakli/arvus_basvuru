# Portal Google girişi

Takım panelinin giriş adresi: https://arvus-basvuru.firebaseapp.com/yonetim/

`web.app/yonetim/` bağlantıları, Firebase SDK başlatılmadan bu adrese geçer.
Bu projede `/__/firebase/init.json` içindeki `authDomain` zaten
`arvus-basvuru.firebaseapp.com` olduğundan portal ve giriş yardımcısı aynı
origin üzerinde çalışır. Bu seçim OAuth konsolunda yeni bir yönlendirme
adresi eklenmesini gerektirmez. Başvuru ana sayfası, `/admin.html`, veritabanı
kuralları ve üye yetkileri değiştirilmez.

Firebase açıklaması: https://firebase.google.com/docs/auth/web/redirect-best-practices

WhatsApp/Instagram içindeki tarayıcılar ayrıca Google girişini engelleyebilir.
Site iOS üzerinde Safari uygulamasını zorla açamaz. Kullanıcı giriş ekranındaki
adresi kopyalayıp Safari/Chrome'un normal sekmesinde açmalıdır. Popup engellenirse
mevcut “Google ile bu sekmede devam et” seçeneği kullanılabilir.

Kontrol: eski `web.app/yonetim/#tasks` adresi girişten önce `firebaseapp.com`
alanına geçmeli; hedef alanda yeniden yönlendirme olmamalı. Gerçek iPhone'da
Google hesabı seçimi ve panele dönüş ayrıca denenmelidir; emülatör testleri
gerçek iOS tarayıcı depolama kısıtlamalarını doğrulamaz.
