// Run under a Google account with Datastore User access to arvus-basvuru.
// Uses your Google authorization: no passwords or service-account keys.
const PROJECT_ID = 'arvus-basvuru';
const NOTIFICATION_EMAIL = 'remziazakli@gmail.com';
const PANEL_URL = 'https://arvus-basvuru.web.app/admin.html';
const DOCUMENTS = 'projects/' + PROJECT_ID + '/databases/(default)/documents';
const API_URL = 'https://firestore.googleapis.com/v1/' + DOCUMENTS;

function firestoreRequest_(suffix, payload) {
  const response = UrlFetchApp.fetch(API_URL + suffix, {
    method:'post', contentType:'application/json', muteHttpExceptions:true,
    headers:{Authorization:'Bearer ' + ScriptApp.getOAuthToken()},
    payload:JSON.stringify(payload)
  });
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    // API errors only; never log tokens or form contents.
    let reason = '';
    try { reason = JSON.parse(response.getContentText()).error.message || ''; } catch (_) {}
    throw new Error('Firestore bağlantısı başarısız (' + status + '). ' + reason);
  }
  return JSON.parse(response.getContentText());
}

function pendingApplications_() {
  // Fetch document names only: applicant information never leaves Firestore here.
  const rows = firestoreRequest_(':runQuery', {structuredQuery:{
    from:[{collectionId:'applications'}],
    select:{fields:[{fieldPath:'__name__'}]},
    where:{fieldFilter:{field:{fieldPath:'emailNotified'},op:'EQUAL',value:{booleanValue:false}}},
    limit:100
  }});
  return rows.filter(row=>row.document).map(row=>row.document.name);
}

function checkApplications() {
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(1000)) return;
  try {
    // Recover a previous successful email whose Firestore acknowledgement failed.
    const props=PropertiesService.getScriptProperties();
    const acknowledged=props.getProperty('ARVUS_PENDING_ACK');
    if(acknowledged){markNotified_(JSON.parse(acknowledged));props.deleteProperty('ARVUS_PENDING_ACK');}
    if(MailApp.getRemainingDailyQuota()<1){console.log('E-posta kotası dolu; başvurular sonraki kontrole bırakıldı.');return;}
    const names=pendingApplications_();
    if(!names.length)return;
    MailApp.sendEmail({
      to:NOTIFICATION_EMAIL,
      subject:names.length===1?'ARVUS — Yeni başvuru geldi':'ARVUS — '+names.length+' yeni başvuru geldi',
      body:'Merhaba Remzi,\n\n'+names.length+' yeni başvuru geldi.\nBaşvuruları görüntüle: '+PANEL_URL+'\n\nYönetici hesabınla giriş yapabilirsin.',
      name:'ARVUS Başvuru Bildirimi'
    });
    // Store short IDs rather than full paths to stay under the 9 KB property limit.
    const ids=names.map(name=>name.slice((DOCUMENTS+'/applications/').length));
    props.setProperty('ARVUS_PENDING_ACK',JSON.stringify(ids));
    markNotified_(ids);props.deleteProperty('ARVUS_PENDING_ACK');
    console.log(names.length+' başvuru için bildirim gönderildi.');
  } finally {lock.releaseLock();}
}

function markNotified_(ids) {
  if(!ids.length)return;
  const names=ids.map(id=>DOCUMENTS+'/applications/'+id);
  const rows=firestoreRequest_(':batchGet',{documents:names,mask:{fieldPaths:['emailNotified']}});
  const existing=rows.filter(row=>row.found).map(row=>row.found.name);
  if(!existing.length)return;
  firestoreRequest_(':commit',{writes:existing.map(name=>({
    update:{name,fields:{emailNotified:{booleanValue:true}}},
    currentDocument:{exists:true},
    updateMask:{fieldPaths:['emailNotified']},
    updateTransforms:[{fieldPath:'emailNotifiedAt',setToServerValue:'REQUEST_TIME'}]
  }))});
}

function setupNotifications() {
  // Verify access first so a bad configuration doesn't create a failing timer.
  pendingApplications_();
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='checkApplications').forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('checkApplications').timeBased().everyMinutes(5).create();
  console.log('Kuruldu: yeni başvurular yaklaşık 5 dakikada bir kontrol edilecek.');
  checkApplications();
}

function stopNotifications() {
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='checkApplications').forEach(t=>ScriptApp.deleteTrigger(t));
}
