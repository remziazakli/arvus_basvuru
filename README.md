# ARVUS — GitHub + Firebase Hosting

ARVUS başvuru sitesi: üç kategori sayfası, aktif “Diğer” alanı, telefon numarası alanı, konsept videoları, üç boyutlu İHA ve kod editörü görünümlü form. Firestore başvuru kaydı, Google girişli yönetim paneli ve Google Apps Script e-posta bildirimi içerir.

**Etkinleştirmek için [KURULUM.md](KURULUM.md) adımlarını tamamlayın.** Hosting yayını tek başına veritabanını ve e-posta görevini kurmaz. Yönetici ve bildirim hesabı: `remziazakli@gmail.com`.

Yönetim paneli: https://arvus-basvuru.web.app/admin.html

Testler: `npm ci`, `npm test`, `npm run test:rules` (Node.js 22 ve Java 17+). Emulator testleri `demo-arvus` kullanır; gerçek projeye test verisi göndermez.

## Dosyalar
- `public/`: Yayınlanacak site dosyaları.
- `public/media/`: Video ve posterler.
- `public/vendor/`: Three.js dosyaları ve lisansı.
- `firebase.json`: Yalnızca public klasörünü yayınlar.
- `.github/workflows/firebase-hosting-merge.yml`: main değişince otomatik yayınlar.

## Tarayıcı üzerinden Firebase yetkilendirmesi
1. [Google Cloud hizmet hesaplarını aç](https://console.cloud.google.com/iam-admin/serviceaccounts?project=arvus-basvuru). Projenin arvus-basvuru olduğunu kontrol et.
2. `github-arvus-hosting` adında ayrı bir hizmet hesabı oluştur.
3. Bu hesaba **Firebase Hosting Admin** (`roles/firebasehosting.admin`) ve **API Keys Viewer** (`roles/serviceusage.apiKeysViewer`) rollerini ver. Bu statik canlı yayın akışı Auth önizleme alanları veya Cloud Run kullanmaz.
4. Hesabın Keys / Anahtarlar bölümünden Add key → Create new key → JSON seç.
5. İndirilen JSON içeriğini [GitHub Actions secrets](https://github.com/remziazakli/arvus_basvuru/settings/secrets/actions) ekranında **FIREBASE_SERVICE_ACCOUNT_ARVUS_BASVURU** adıyla kaydet.
6. JSON anahtarını normal depo dosyası olarak yükleme veya sohbet mesajına yapıştırma.
7. [Actions](https://github.com/remziazakli/arvus_basvuru/actions) → **Publish ARVUS to Firebase** → **Run workflow** → main.
8. Başarılı çalışmadan sonra [siteyi aç](https://arvus-basvuru.web.app).

Yetki anahtarı tanımlanana kadar workflow yayınlama yapamaz. Dosyaların GitHub'a yüklenmesi tek başına siteyi yayınlamaz.

## Güncellemeler
Site değişikliklerini public/ içinde yap. main dalına gönderilen değişiklikler otomatik yayınlanır.

## Yerel önizleme
`python -m http.server 8000 --directory public` ile başlatıp http://localhost:8000 aç. Modüller nedeniyle HTML dosyasını doğrudan çift tıklayarak açmak yerine HTTP sunucusu kullan.

Kaynaklar: [Firebase GitHub bağlantısı](https://firebase.google.com/docs/hosting/github-integration), [hizmet hesabı kurulumu](https://github.com/FirebaseExtended/action-hosting-deploy/blob/main/docs/service-account.md).
