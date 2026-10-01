import {initializeApp} from 'firebase/app';
import {getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, setPersistence, browserSessionPersistence, connectAuthEmulator} from 'firebase/auth';
import {getFirestore, doc, collection, query, where, or, limit, onSnapshot, getDocFromServer, getDocsFromServer, runTransaction, serverTimestamp, connectFirestoreEmulator, documentId, orderBy, startAfter} from 'firebase/firestore';
export {doc,collection,query,where,or,limit,onSnapshot,getDocFromServer,getDocsFromServer,runTransaction,serverTimestamp,documentId,orderBy,startAfter};
export const OWNER_EMAILS=['rmzazakli@gmail.com','remziazakli@gmail.com'];
export async function connect(){
  const local=['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).get('emulator')==='1';
  const response=await fetch('/__/firebase/init.json',{cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Firebase yapılandırması okunamadı. Portal Firebase Hosting üzerinde açılmalı.');
  const config=await response.json();
  if(config.projectId!==(local?'demo-arvus':'arvus-basvuru'))throw Error('Beklenmeyen Firebase projesi. Bağlantı durduruldu.');
  const app=initializeApp(config,'arvus-member-portal'),auth=getAuth(app),db=getFirestore(app);
  if(local){connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});connectFirestoreEmulator(db,'127.0.0.1',8088);}
  await setPersistence(auth,browserSessionPersistence);
  const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
  return {db,auth,login:()=>signInWithPopup(auth,provider),redirect:()=>signInWithRedirect(auth,provider),redirectResult:()=>getRedirectResult(auth),logout:()=>signOut(auth),observe:fn=>onAuthStateChanged(auth,fn)};
}
