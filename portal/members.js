import {doc,runTransaction,serverTimestamp,OWNER_EMAILS} from './firebase.js';
import {stamp} from './model.js';

// Member IDs stay stable: only the Google login address changes.
export async function saveMember(db,{id,values,teamIds,expectedAccess,expectedProfile,actor,actorLogin=actor,checkSession}) {
  const address=values.email.trim().toLowerCase(),memberId=id||address;
  if(values.name.length<2||!/^[^/@\s]+@[^/@\s]+\.[^/@\s]+$/.test(address))throw Error('Ad ve e-posta geçerli olmalı.');
  if(teamIds.length>10)throw Error('En fazla 10 takım seç.');
  if(OWNER_EMAILS.includes(memberId)&&(address!==memberId||values.active!=='yes'||values.role!=='admin'))throw Error('Sistem sahibi hesabının adresi, erişimi veya rolü bu ekrandan değiştirilemez.');
  if(memberId===actor&&(address!==actorLogin||values.active!=='yes'||values.role!=='admin'))throw Error('Kendi yönetici hesabını değiştirmek için başka bir yönetici kullan.');
  await runTransaction(db,async tx=>{
    checkSession();
    const ar=doc(db,'portalAccess',memberId),mr=doc(db,'portalMembers',memberId);
    const [old,member,targetAccess,targetMember,alias]=await Promise.all([
      tx.get(ar),tx.get(mr),tx.get(doc(db,'portalAccess',address)),
      tx.get(doc(db,'portalMembers',address)),tx.get(doc(db,'portalLogins',address))
    ]);
    if(!id&&(old.exists()||member.exists()))throw Error('Bu e-posta zaten kayıtlı.');
    if(id&&(!old.exists()||!member.exists()||stamp(old.data().updatedAt)!==expectedAccess||stamp(member.data().updatedAt)!==expectedProfile))throw Error('Üye kaydı değişmiş. Pencereyi yeniden aç.');
    if(old.data()?.deleted)throw Error('Bu üye silinmiş. Önce Silinen üyeler listesinden geri al.');
    if((address!==memberId&&(targetAccess.exists()||targetMember.exists()||OWNER_EMAILS.includes(address)))||(alias.exists()&&alias.data().memberId!==memberId))throw Error('Bu Google e-postası başka bir üyeye ait. Başka bir adres gir.');
    const previous=old.data()?.loginEmail||memberId;
    const previousAlias=previous!==address?await tx.get(doc(db,'portalLogins',previous)):null;
    checkSession();
    tx.set(ar,{...(old.data()||{}),name:values.name,role:values.role,active:values.active==='yes',teamIds,loginEmail:address,updatedAt:serverTimestamp()});
    tx.set(mr,{...(member.data()||{}),name:values.name,email:memberId,loginEmail:address,phone:values.phone,university:values.university,department:values.department,year:values.year,jobTitle:values.jobTitle,notes:values.notes,teamIds,updatedAt:serverTimestamp()});
    if(address!==memberId)tx.set(doc(db,'portalLogins',address),{memberId,updatedAt:serverTimestamp()});
    if(previousAlias?.exists()&&previousAlias.data().memberId===memberId)tx.delete(previousAlias.ref);
  });
}

// Archive both records atomically; stable IDs retain tasks, loans and financial history.
export async function setMemberDeleted(db,{id,deleted,expectedAccess,expectedProfile,actor,checkSession}){
  if(OWNER_EMAILS.includes(id)||id===actor)throw Error('Kendi hesabın ve sistem sahibi hesapları silinemez.');
  await runTransaction(db,async tx=>{
    checkSession();
    const ar=doc(db,'portalAccess',id),mr=doc(db,'portalMembers',id);
    const [access,profile]=await Promise.all([tx.get(ar),tx.get(mr)]);
    if(!access.exists()||!profile.exists()||stamp(access.data().updatedAt)!==expectedAccess||stamp(profile.data().updatedAt)!==expectedProfile)throw Error('Üye kaydı değişmiş. Pencereyi yeniden aç.');
    if(!!access.data().deleted===deleted)throw Error(deleted?'Üye zaten silinmiş.':'Üye zaten geri alınmış.');
    checkSession();
    tx.update(ar,{active:false,deleted,...(deleted?{deletedAt:serverTimestamp(),deletedBy:actor}:{}),updatedAt:serverTimestamp()});
    tx.update(mr,{deleted,updatedAt:serverTimestamp()});
  });
}
