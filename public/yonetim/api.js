import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import {getAuth,setPersistence,browserSessionPersistence,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import {getFirestore,collection,doc,query,where,limit,orderBy,documentId,startAfter,onSnapshot,getDocsFromServer,runTransaction,writeBatch,serverTimestamp,updateDoc} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
import {ROOT_ADMINS,BLOCKED_EMAIL,COLLECTIONS,emailKey,snapshotJSON} from './model.js';
let auth,db;
const coll = name => collection(db,'team_'+name);
const ref = (name,id) => doc(db,'team_'+name,id);
export const stamp = () => serverTimestamp();
export async function initialize() {
  const response=await fetch('/__/firebase/init.json',{cache:'no-store'});
  if (!response.ok) throw new Error('Firebase bağlantısı kurulamadı. Siteyi Firebase Hosting adresinden aç.');
  const config=await response.json();
  if (config.projectId!=='arvus-basvuru'||!config.apiKey) throw new Error('Firebase proje yapılandırması geçersiz.');
  const app=initializeApp(config,'arvus-team-workspace');
  auth=getAuth(app); await setPersistence(auth,browserSessionPersistence);
  db=getFirestore(app); await auth.authStateReady();
}
export function login() {
  const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
  return signInWithPopup(auth,provider);
}
export const logout = () => signOut(auth);
export function observeSession(onMember,onError) {
  let stopProfile,version=0;
  const stopAuth=onAuthStateChanged(auth,async user=>{
    const v=++version;stopProfile?.();onMember(null);
    if (!user) return;
    try {
      const token=await user.getIdTokenResult();
      if(v!==version)return;
      const email=emailKey(user.email);
      if(!user.emailVerified||token.signInProvider!=='google.com'||email===BLOCKED_EMAIL)
        throw new Error('Bu Google hesabının panel erişimi yok.');
      if(ROOT_ADMINS.includes(email)){
        onMember({email,displayName:user.displayName||email,role:'admin',active:true,teamIds:[],root:true});return;
      }
      stopProfile=onSnapshot(ref('members',email),snap=>{
        if(v!==version)return;
        if(!snap.exists()||snap.data().active!==true) {onMember(null,true);return;}
        onMember({...snap.data(),email,root:false});
      },err=>{if(v===version){onMember(null,true);onError(err);}});
    } catch(err) { if(v===version){onMember(null,true);onError(err);} }
  },onError);
  return ()=>{version++;stopAuth();stopProfile?.();};
}
export function watch(name,filters,onData,onError) {
  return onSnapshot(query(coll(name),...filters.map(([key,value])=>where(key,'==',value)),limit(500)),snap=>{
    onData(snap.docs.map(d=>({id:d.id,...d.data()})),snap.size===500);
  },onError);
}
export function newId(name) { return doc(coll(name)).id; }
export async function save(name,id,data,createOnly=false) {
  const target=ref(name,id||newId(name));
  await runTransaction(db,async tx=>{
    const old=await tx.get(target);
    if(createOnly&&old.exists())throw new Error('Bu kayıt zaten var; mevcut bilgiler değiştirilmedi.');
    tx.set(target,data);
  });
  return target.id;
}
export async function patch(name,id,data) { await updateDoc(ref(name,id),data); }
export function notification(recipient,teamId,title,body,actor) {
  return {recipient,teamId,title,body,createdBy:actor,createdAt:stamp(),read:false};
}
export async function saveWithNotice(name,id,data,notice,{createOnly=false,expectedStatus}={}) {
  const target=ref(name,id||newId(name)),noticeRef=ref('notifications',newId('notifications'));
  await runTransaction(db,async tx=>{
    const old=await tx.get(target);
    if(createOnly&&old.exists())throw new Error('Bu kayıt zaten var.');
    if(expectedStatus!==undefined&&(!old.exists()||old.data().status!==expectedStatus))
      throw new Error('Kayıt başka bir kullanıcı tarafından değiştirildi. Güncel bilgiyi kontrol et.');
    tx.set(target,data);
    if(notice)tx.set(noticeRef,notice);
  });
  return target.id;
}
export async function checkout(itemId,borrower,actor) {
  const itemRef=ref('inventory',itemId),loanRef=ref('loans',newId('loans')),noticeRef=ref('notifications',newId('notifications'));
  await runTransaction(db,async tx=>{
    const snap=await tx.get(itemRef);
    if(!snap.exists()||snap.data().currentLoanId||snap.data().archived)throw new Error('Bu ekipman zimmete uygun değil. Güncel durumu kontrol et.');
    const item=snap.data();
    tx.update(itemRef,{currentLoanId:loanRef.id,borrower,updatedAt:stamp()});
    tx.set(loanRef,{teamId:item.teamId,itemId,borrower,status:'out',checkedOutAt:stamp(),returnedAt:null,createdBy:actor,returnNote:''});
    tx.set(noticeRef,notification(borrower,item.teamId,'Ekipman zimmeti',item.name+' sana zimmetlendi.',actor));
  });
}
export async function returnItem(itemId,returnNote,actor) {
  const itemRef=ref('inventory',itemId),noticeRef=ref('notifications',newId('notifications'));
  await runTransaction(db,async tx=>{
    const snap=await tx.get(itemRef);
    if(!snap.exists()||!snap.data().currentLoanId)throw new Error('Ekipman zaten iade edilmiş.');
    const item=snap.data(),loanRef=ref('loans',item.currentLoanId),loan=await tx.get(loanRef);
    if(!loan.exists()||loan.data().status!=='out')throw new Error('Zimmet kaydı doğrulanamadı.');
    // All transaction reads must precede writes.
    const borrower=ROOT_ADMINS.includes(item.borrower)?null:await tx.get(ref('members',item.borrower));
    tx.update(itemRef,{currentLoanId:'',borrower:'',updatedAt:stamp()});
    tx.update(loanRef,{status:'returned',returnedAt:stamp(),returnNote});
    // Former/inactive borrowers may no longer receive new notifications; history remains.
    if(!borrower||(borrower.exists()&&borrower.data().active&&borrower.data().teamIds.includes(item.teamId)))
      tx.set(noticeRef,notification(item.borrower,item.teamId,'Ekipman iade alındı',item.name+' iade edildi.',actor));
  });
}
export async function importMembers(rows,sessionValid,onProgress) {
  let added=0,existing=0;
  for(const member of rows) {
    if(!sessionValid())throw new Error('Oturum değişti. İçe aktarma durduruldu.');
    const addedNow=await runTransaction(db,async tx=>{
      const target=ref('members',member.email),old=await tx.get(target);
      if(old.exists())return false;
      tx.set(target,{...member,active:false,role:'member',updatedAt:stamp()});return true;
    });
    if(addedNow)added++;else existing++;
    onProgress({added,existing});
  }
  return {added,existing};
}
export async function backup(sessionValid,onProgress) {
  const data={};
  for(const name of COLLECTIONS){
    data[name]=[];let cursor;
    for(;;){
      if(!sessionValid())throw new Error('Oturum değişti; yedek indirilmedi.');
      const page=await getDocsFromServer(query(coll(name),orderBy(documentId()),...(cursor?[startAfter(cursor)]:[]),limit(100)));
      if(!sessionValid())throw new Error('Oturum değişti; yedek indirilmedi.');
      data[name].push(...page.docs.map(d=>({id:d.id,...snapshotJSON(d.data())})));
      onProgress(name,data[name].length);
      if(page.size<100)break;cursor=page.docs.at(-1);
    }
  }
  return {app:'ARVUS-TEAM',version:1,source:'arvus-basvuru',exportedAt:new Date().toISOString(),collections:data};
}
export async function seedTeams(actor) {
  const teams={ew:'Elektronik Harp',uav:'Uluslararası İHA',ai:'Havacılıkta Yapay Zekâ'};
  for(const [id,name] of Object.entries(teams)){
    await runTransaction(db,async tx=>{
      const target=ref('teams',id),old=await tx.get(target);
      if(!old.exists())tx.set(target,{name,description:'ARVUS '+name+' takımı',archived:false,updatedAt:stamp()});
    });
  }
}
