// Firebase's public web configuration is supplied by this Hosting project.
// No service-account key or email password belongs in browser code.
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import {getAuth, signInAnonymously, browserLocalPersistence, browserSessionPersistence, setPersistence} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import {getFirestore, doc, getDocFromServer, setDoc, serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

export const ADMIN_EMAILS = Object.freeze(["remziazakli@gmail.com","rmzazakli@gmail.com","sudenzturk@gmail.com"]);
export const CATEGORY_NAMES = {ai:'Havacılıkta Yapay Zekâ', ew:'Elektronik Harp', uav:'Uluslararası İHA', other:'Diğer'};
const clients = new Map();

export function getClient(role = 'applicant') {
  if (!clients.has(role)) {
    const promise = (async () => {
      const response = await fetch('/__/firebase/init.json', {cache:'no-store'});
      if (!response.ok) throw new Error('Başvuru bağlantısı henüz hazır değil. Lütfen daha sonra tekrar dene.');
      const config = await response.json();
      if (config.projectId !== 'arvus-basvuru' || !config.apiKey) throw new Error('Başvuru bağlantısı henüz hazır değil.');
      const app = initializeApp(config, 'arvus-' + role);
      const auth = getAuth(app);
      await setPersistence(auth, role === 'admin' ? browserSessionPersistence : browserLocalPersistence);
      await auth.authStateReady();
      return {auth, db:getFirestore(app)};
    })();
    clients.set(role, promise);
    promise.catch(() => clients.delete(role));
  }
  return clients.get(role);
}

export async function submitApplication(data) {
  const {auth, db} = await getClient();
  const settings = await getDocFromServer(doc(db, 'settings', 'registration'));
  if (!settings.exists() || settings.data().enabled !== true) throw new Error('Başvurular şu anda açık değil. Lütfen daha sonra tekrar dene.');
  if (!auth.currentUser) await signInAnonymously(auth);
  const uid = auth.currentUser.uid;
  if (!Object.hasOwn(CATEGORY_NAMES, data.category)) throw new Error('Lütfen bir başvuru alanı seç.');
  if (data.category === 'other' && (!data.customArea || data.customArea.length < 2)) throw new Error('Lütfen başvurmak istediğin alanı yaz.');
  const reference = doc(db, 'applications', uid + '_' + data.category);
  // Stable per-browser/category ID makes a retry safe after an uncertain network response.
  const previous = await getDocFromServer(reference);
  if (previous.exists()) return {id:reference.id, duplicate:true};
  const record = {...data, uid, status:'new', emailNotified:false, createdAt:serverTimestamp(), consentVersion:'2026-09-20'};
  try {
    await setDoc(reference, record);
  } catch (error) {
    // Another tab may have completed this exact submission while this tab was waiting.
    try { if ((await getDocFromServer(reference)).exists()) return {id:reference.id, duplicate:true}; } catch (_) { /* Preserve original error. */ }
    throw error;
  }
  return {id:reference.id, duplicate:false};
}

export function friendlyError(error) {
  const messages = {
    'permission-denied':'İşlem için yetki alınamadı. Başvurular kapalı olabilir; lütfen daha sonra tekrar dene.',
    'unavailable':'Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.',
    'resource-exhausted':'Başvuru hizmeti şu anda yoğun. Lütfen daha sonra tekrar dene.',
    'auth/operation-not-allowed':'Başvuru bağlantısının kurulumu henüz tamamlanmamış.',
    'auth/unauthorized-domain':'Bu site adresi giriş için henüz etkinleştirilmemiş.',
    'auth/popup-closed-by-user':'Google giriş penceresi kapatıldı. Yeniden deneyebilirsin.',
    'auth/popup-blocked':'Tarayıcının açılır pencereye izin verdiğinden emin ol.',
    'auth/network-request-failed':'İnternet bağlantısını kontrol edip tekrar dene.',
    'auth/too-many-requests':'Çok fazla deneme yapıldı. Biraz bekleyip yeniden dene.'
  };
  return messages[error.code] || (error.code ? 'İşlem tamamlanamadı. Lütfen daha sonra tekrar dene.' : error.message) || 'İşlem tamamlanamadı.';
}
