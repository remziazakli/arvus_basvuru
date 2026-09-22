import {getClient, ADMIN_EMAILS, CATEGORY_NAMES, friendlyError} from './firebase-client.js?v=admin-access-3';
import {GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import {collection, query, orderBy, limit, onSnapshot, getDocs, getDocsFromServer, startAfter, doc, setDoc, updateDoc, serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
const $ = id => document.getElementById(id);
const STATUSES = {new:'Yeni', reviewing:'İnceleniyor', accepted:'Kabul edildi', rejected:'Uygun bulunmadı'};
const records = new Map();
let auth, db, unsubscribe, settingsUnsubscribe, cursor, enabled=false, selectedId, initial=true, generation=0;
const sessionStarted = Date.now();
function report(err) { $('error').textContent = friendlyError(err); $('error').hidden=false; }
function date(value) { return value?.toDate ? value.toDate().toLocaleString('tr-TR') : '—'; }
function render() {
  const entries=[...records.values()].sort((a,b)=>(b.createdAt?.toMillis()||0)-(a.createdAt?.toMillis()||0));
  const filtered=entries.filter(x=>(!$('category-filter').value||x.category===$('category-filter').value)&&(!$('status-filter').value||x.status===$('status-filter').value));
  $('rows').replaceChildren();$('count').textContent=records.size+' kayıt yüklendi · '+filtered.length+' gösteriliyor';$('empty').hidden=filtered.length>0;
  for(const data of filtered) {
    const tr=document.createElement('tr');
    const name=document.createElement('td');name.textContent=data.fullName;const sub=document.createElement('small');sub.textContent=data.university+' · '+data.department;name.append(sub);tr.append(name);
    for(const text of [CATEGORY_NAMES[data.category]||data.category,date(data.createdAt),STATUSES[data.status]||data.status]){const td=document.createElement('td');td.textContent=text;tr.append(td);}
    const action=document.createElement('td');const button=document.createElement('button');button.className='secondary';button.textContent='İncele ↗';button.addEventListener('click',()=>openDetail(data.id));action.append(button);tr.append(action);$('rows').append(tr);
  }
}
function openDetail(id) {
  const d=records.get(id);if(!d)return;selectedId=id;$('detail-title').textContent=d.fullName;$('detail-error').hidden=true;
  const fields=[['Başvuru kodu',id],['Alan',CATEGORY_NAMES[d.category]],...(d.category==='other'?[['Yazdığı alan',d.customArea]]:[]),['Ad soyad',d.fullName],['Telefon',d.phone],['E-posta',d.email],['Üniversite',d.university],['Bölüm / sınıf',d.department+' / '+d.year],['Portfolyo',d.portfolio||'Belirtilmedi'],['İlgi alanları',(d.skills||[]).join(', ')||'Belirtilmedi'],['Deneyim',d.experience],['Haftalık süre',d.time],['Motivasyon',d.motivation],['Proje / fikir',d.project||'Belirtilmedi'],['Başvuru tarihi',date(d.createdAt)]];
  $('detail-fields').replaceChildren();for(const [label,value] of fields){const row=document.createElement('div');const dt=document.createElement('dt');const dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;row.append(dt,dd);$('detail-fields').append(row);}
  $('detail-status').value=d.status;$('detail').showModal();
}
function reset() {
  generation++;unsubscribe?.();settingsUnsubscribe?.();unsubscribe=null;settingsUnsubscribe=null;records.clear();cursor=null;initial=true;selectedId=null;$('detail').close();$('detail-title').textContent='Başvuru';$('detail-fields').replaceChildren();$('identity').textContent='';$('rows').replaceChildren();$('notice').textContent='';$('more').hidden=true;$('dashboard').hidden=true;$('login-panel').hidden=false;
}
function startDashboard(user) {
  $('login-panel').hidden=true;$('dashboard').hidden=false;$('identity').textContent=user.email;
  const seen=new Set();
  settingsUnsubscribe=onSnapshot(doc(db,'settings','registration'),snapshot=>{
    enabled=snapshot.exists()&&snapshot.data().enabled===true;
    $('registration-state').textContent=enabled?'Başvurular açık':'Başvurular kapalı';$('toggle-registration').textContent=enabled?'Başvuruları kapat':'Başvuruları aç';$('toggle-registration').disabled=false;
  },report);
  unsubscribe=onSnapshot(query(collection(db,'applications'),orderBy('createdAt','desc'),limit(50)),snapshot=>{
    let added=0;
    for(const change of snapshot.docChanges()) {
      const d={...change.doc.data(),id:change.doc.id};
      if(change.type!=='removed') {
        if(!initial&&!seen.has(d.id)&&(d.createdAt?.toMillis()||0)>sessionStarted)added++;
        records.set(d.id,d);seen.add(d.id);
      }
    }
    if(!cursor){cursor=snapshot.docs.at(-1);$('more').hidden=snapshot.size<50;}
    initial=false;render();
    if(added){$('notice').textContent=added+' yeni başvuru geldi.';if('Notification' in window&&Notification.permission==='granted'){try{new Notification('ARVUS — Yeni başvuru',{body:added+' yeni başvuru geldi. Detayları yönetim panelinde görebilirsin.',icon:'favicon.svg',tag:'arvus-application'});}catch(_){/* In-panel notice remains available on unsupported browsers. */}}}
  },report);
}
$('login').addEventListener('click',async()=>{
  $('error').hidden=true;$('login').disabled=true;
  try{const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});await signInWithPopup(auth,provider);}catch(err){report(err);}finally{$('login').disabled=false;}
});
$('logout').addEventListener('click',()=>signOut(auth).catch(report));
$('category-filter').addEventListener('change',render);$('status-filter').addEventListener('change',render);
$('close-detail').addEventListener('click',()=>$('detail').close());
$('toggle-registration').addEventListener('click',async()=>{
  $('toggle-registration').disabled=true;
  try{await setDoc(doc(db,'settings','registration'),{enabled:!enabled,updatedAt:serverTimestamp()});}catch(err){report(err);}finally{$('toggle-registration').disabled=false;}
});
$('save-status').addEventListener('click',async()=>{
  if(!selectedId)return;const id=selectedId;const status=$('detail-status').value;const currentGeneration=generation;$('save-status').disabled=true;$('detail-error').hidden=true;
  try{await updateDoc(doc(db,'applications',id),{status,updatedAt:serverTimestamp()});if(currentGeneration===generation){if(records.has(id))records.get(id).status=status;render();$('detail').close();}}
  catch(err){$('detail-error').textContent=friendlyError(err);$('detail-error').hidden=false;}finally{$('save-status').disabled=false;}
});
$('more').addEventListener('click',async()=>{
  if(!cursor)return;const currentGeneration=generation;$('more').disabled=true;
  try{const result=await getDocs(query(collection(db,'applications'),orderBy('createdAt','desc'),startAfter(cursor),limit(50)));if(currentGeneration!==generation)return;result.forEach(d=>records.set(d.id,{...d.data(),id:d.id}));cursor=result.docs.at(-1)||cursor;$('more').hidden=result.size<50;render();}catch(err){report(err);}finally{$('more').disabled=false;}
});
$('notifications').addEventListener('click',async()=>{
  if(!('Notification' in window)){ $('notice').textContent='Bu tarayıcı masaüstü bildirimlerini desteklemiyor. Yeni başvurular panelde gösterilecek.';return; }
  try{const permission=await Notification.requestPermission();$('notice').textContent=permission==='granted'?'Bu panel açıkken yeni başvurular için bildirim gösterilecek.':'Bildirim izni verilmedi. Yeni başvurular panelde gösterilecek.';}catch(_){$('notice').textContent='Bildirimler bu tarayıcıda açılamadı. Panel bildirimleri kullanılabilir.';}
});
try {
  ({auth,db}=await getClient('admin'));$('loading').hidden=true;$('login').disabled=false;
  onAuthStateChanged(auth,async user=>{
    reset();if(!user)return;
    if(!ADMIN_EMAILS.includes(user.email)||!user.emailVerified||!user.providerData.some(x=>x.providerId==='google.com')){await signOut(auth);report(new Error('Bu Google hesabının yönetim yetkisi yok. Yetkili hesapla giriş yap.'));return;}
    const currentGeneration=generation;
    try {
      // Confirm the deployed database rules allow access before displaying the panel.
      await getDocsFromServer(query(collection(db,'applications'),limit(1)));
      if(currentGeneration!==generation)return;
      $('error').hidden=true;startDashboard(user);
    } catch(err) {
      if(currentGeneration!==generation)return;
      reset();
      await signOut(auth).catch(()=>{});
      report(err.code==='permission-denied'
        ? new Error('Bu hesabın yönetim yetkisi doğrulanamadı. Yönetici erişim kurallarının yayımlandığını kontrol et.')
        : err);
    }
  });
}catch(err){$('loading').textContent='Bağlantı henüz hazır değil. Firebase kurulum adımlarını tamamladıktan sonra sayfayı yenile.';report(err);}
