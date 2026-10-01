import {readFile} from 'node:fs/promises';
import {before,after,beforeEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,updateDoc,collection,query,where,limit,writeBatch,runTransaction,serverTimestamp,Timestamp} from 'firebase/firestore';

let env;
const owner='rmzazakli@gmail.com',alice='alice@example.com',bob='bob@example.com',mentor='mentor@example.com',other='other@example.com';
const now=Timestamp.fromMillis(1700000000000);
const grant=(name,role='member',teamIds=['ai'],active=true)=>({name,role,teamIds,active,updatedAt:now});
const profile=(email,teamIds=['ai'])=>({name:email,email,phone:'',university:'',department:'',year:'',jobTitle:'Üye',notes:'',teamIds,updatedAt:now});
const task=(assignee=alice,teamId='ai')=>({title:'Test görev',description:'Ölçüm kaydı',teamId,assignee,due:'2026-10-10',status:'todo',blocker:'',evidence:'',evidenceUrl:'',createdAt:now,updatedAt:now,lastCommentId:'',lastCommentBy:'',lastCommentAt:null});
const enrollment=()=>({name:'Başlangıç rotası',routeId:'r1',teamId:'ai',memberEmail:alice,mentorEmail:mentor,due:'2026-10-10',stepCount:1,createdAt:now});
const step=(status='todo')=>({index:0,title:'İlk çıktı',status,evidence:status==='todo'?'':'Test çıktısı hazır',evidenceUrl:'',feedback:'',reviewerEmail:'',reviewedAt:null,updatedAt:now});
const asset=()=>({name:'Geliştirme kartı',code:'ARV-001',location:'Lab',condition:'ready',note:'',activeLoanId:'',updatedAt:now});
function db(email,extra={}){return env.authenticatedContext(email,{email,email_verified:true,firebase:{sign_in_provider:'google.com'},...extra}).firestore();}
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-arvus',firestore:{host:'127.0.0.1',port:8088,rules:await readFile('firestore.rules','utf8')}});});
after(async()=>env?.cleanup());
beforeEach(async()=>{await env.clearFirestore();await env.withSecurityRulesDisabled(async c=>{const d=c.firestore();await Promise.all([
 setDoc(doc(d,'portalAccess',alice),grant('Alice')),setDoc(doc(d,'portalAccess',bob),grant('Bob','member',['ew'])),setDoc(doc(d,'portalAccess',mentor),grant('Mentor','mentor')),setDoc(doc(d,'portalAccess',other),grant('Other','member',['ai'],false)),
 setDoc(doc(d,'portalMembers',alice),profile(alice)),setDoc(doc(d,'portalMembers',bob),profile(bob,['ew'])),
 setDoc(doc(d,'portalTeams','ai'),{name:'AI',kind:'team',color:'blue',description:'',updatedAt:now}),setDoc(doc(d,'portalTeams','ew'),{name:'EW',kind:'team',color:'orange',description:'',updatedAt:now}),
 setDoc(doc(d,'portalTasks','own'),task()),setDoc(doc(d,'portalTasks','other'),task(bob,'ew')),
 setDoc(doc(d,'portalRoutes','r1'),{name:'Rota',description:'',teamId:'ai',steps:['İlk çıktı'],updatedAt:now}),
 setDoc(doc(d,'portalEnrollments','en1'),enrollment()),setDoc(doc(d,'portalEnrollments','en1','steps','0'),step()),setDoc(doc(d,'portalEquipment','ARV-001'),asset())
]);});});
test('anonymous, uninvited, revoked and unverified identities cannot read portal data',async()=>{for(const d of [env.unauthenticatedContext().firestore(),db('stranger@example.com'),db(other),db(alice,{email_verified:false}),db(alice,{firebase:{sign_in_provider:'anonymous'}})])await assertFails(getDoc(doc(d,'portalTasks','own')));});
test('member sees own invitation but cannot list invitations or promote self',async()=>{const d=db(alice);await assertSucceeds(getDoc(doc(d,'portalAccess',alice)));await assertFails(getDocs(query(collection(d,'portalAccess'),limit(100))));await assertFails(updateDoc(doc(d,'portalAccess',alice),{role:'admin',updatedAt:serverTimestamp()}));await assertFails(setDoc(doc(d,'portalAccess','friend@example.com'),{...grant('Friend'),updatedAt:serverTimestamp()}));});
test('Google project owners bootstrap without granting outsiders access',async()=>{const d=db(owner);await assertSucceeds(getDocs(query(collection(d,'portalAccess'),limit(100))));await assertSucceeds(setDoc(doc(d,'portalAccess','new@example.com'),{...grant('New User'),updatedAt:serverTimestamp()}));await assertFails(setDoc(doc(d,'portalAccess',owner),{...grant('Owner','member',[],false),updatedAt:serverTimestamp()}));await assertFails(getDocs(query(collection(db(owner,{email_verified:false}),'portalAccess'),limit(100))));});
test('member private profiles and role-scoped task queries are enforced server-side',async()=>{const d=db(alice);await assertSucceeds(getDoc(doc(d,'portalMembers',alice)));await assertFails(getDoc(doc(d,'portalMembers',bob)));await assertFails(getDocs(query(collection(d,'portalTasks'),limit(100))));assert.equal((await assertSucceeds(getDocs(query(collection(d,'portalTasks'),where('assignee','==',alice),limit(100))))).size,1);await assertFails(getDoc(doc(d,'portalTasks','other')));});
test('mentor reads and manages only their assigned team',async()=>{const d=db(mentor);await assertSucceeds(getDocs(query(collection(d,'portalMembers'),where('teamIds','array-contains-any',['ai']),limit(100))));await assertSucceeds(getDocs(query(collection(d,'portalTasks'),where('teamId','in',['ai']),limit(100))));await assertFails(getDoc(doc(d,'portalTasks','other')));await assertSucceeds(updateDoc(doc(d,'portalTasks','own'),{title:'Yeni takım görevi',updatedAt:serverTimestamp()}));await assertFails(updateDoc(doc(d,'portalTasks','other'),{title:'Yetkisiz görev',updatedAt:serverTimestamp()}));});
test('member can update own work but not title, assignee, timestamps or team',async()=>{const d=db(alice),r=doc(d,'portalTasks','own');await assertSucceeds(updateDoc(r,{status:'doing',evidence:'Ölçüm devam ediyor',updatedAt:serverTimestamp()}));for(const change of [{title:'Başka ad'},{assignee:bob},{teamId:'ew'},{createdAt:serverTimestamp()}])await assertFails(updateDoc(r,{...change,updatedAt:serverTimestamp()}));await assertFails(updateDoc(r,{status:'done',blocker:'Parça yok',updatedAt:serverTimestamp()}));await assertFails(updateDoc(r,{evidenceUrl:'javascript:alert(1)',updatedAt:serverTimestamp()}));});
test('task assignment must use an active member of its team',async()=>{const d=db(mentor),payload={...task(),createdAt:serverTimestamp(),updatedAt:serverTimestamp()};await assertSucceeds(setDoc(doc(d,'portalTasks','new'),payload));await assertFails(setDoc(doc(d,'portalTasks','wrong-team'),{...payload,assignee:bob}));await assertFails(setDoc(doc(d,'portalTasks','revoked'),{...payload,assignee:other}));});
test('comments are authenticated, scoped, immutable, and atomically linked',async()=>{const d=db(alice),batch=writeBatch(d);batch.set(doc(d,'portalTasks','own','comments','c1'),{author:alice,body:'Bir soru var',createdAt:serverTimestamp()});batch.update(doc(d,'portalTasks','own'),{lastCommentId:'c1',lastCommentBy:alice,lastCommentAt:serverTimestamp()});await assertSucceeds(batch.commit());await assertSucceeds(getDocs(query(collection(d,'portalTasks','own','comments'),limit(100))));await assertFails(getDocs(query(collection(db(bob),'portalTasks','own','comments'),limit(100))));await assertFails(updateDoc(doc(d,'portalTasks','own','comments','c1'),{body:'Değiştir'}));const forged=writeBatch(d);forged.set(doc(d,'portalTasks','own','comments','c2'),{author:mentor,body:'Sahte mentor',createdAt:serverTimestamp()});forged.update(doc(d,'portalTasks','own'),{lastCommentId:'c2',lastCommentBy:alice,lastCommentAt:serverTimestamp()});await assertFails(forged.commit());});
test('route creation and atomic enrollment/step initialization work',async()=>{const d=db(mentor);await assertSucceeds(setDoc(doc(d,'portalRoutes','r2'),{name:'İkinci rota',description:'',teamId:'ai',steps:['İlk adım'],updatedAt:serverTimestamp()}));const b=writeBatch(d);b.set(doc(d,'portalEnrollments','en2'),{...enrollment(),createdAt:serverTimestamp()});b.set(doc(d,'portalEnrollments','en2','steps','0'),{...step(),updatedAt:serverTimestamp()});await assertSucceeds(b.commit());await assertFails(setDoc(doc(db(alice),'portalRoutes','hack'),{name:'Yetkisiz rota',description:'',teamId:'ai',steps:['adım'],updatedAt:serverTimestamp()}));});
test('members submit evidence; only assigned mentor/admin reviews; self approval is denied',async()=>{const r=doc(db(alice),'portalEnrollments','en1','steps','0');await assertSucceeds(updateDoc(r,{evidence:'İlk çıktı hazır',status:'pending',updatedAt:serverTimestamp()}));await assertFails(updateDoc(r,{status:'done',reviewerEmail:alice,reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()}));await assertFails(updateDoc(doc(db(bob),'portalEnrollments','en1','steps','0'),{status:'done',reviewerEmail:bob,reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()}));await assertSucceeds(updateDoc(doc(db(mentor),'portalEnrollments','en1','steps','0'),{status:'done',feedback:'İyi çalışma',reviewerEmail:mentor,reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()}));await assertFails(updateDoc(r,{evidence:'Onay sonrasında değiştirme',status:'pending',updatedAt:serverTimestamp()}));});
test('mentor feedback is required for changes; learner cannot edit feedback/title',async()=>{await env.withSecurityRulesDisabled(c=>updateDoc(doc(c.firestore(),'portalEnrollments','en1','steps','0'),{...step('pending')}));const r=doc(db(mentor),'portalEnrollments','en1','steps','0');await assertFails(updateDoc(r,{status:'todo',feedback:'',reviewerEmail:mentor,reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()}));await assertSucceeds(updateDoc(r,{status:'todo',feedback:'Ölçümü tekrar et',reviewerEmail:mentor,reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()}));await assertFails(updateDoc(doc(db(alice),'portalEnrollments','en1','steps','0'),{feedback:'Notu sil',title:'Başka adım',updatedAt:serverTimestamp()}));});
async function issue(id='loan1',email=alice){const d=db(owner),b=writeBatch(d);b.set(doc(d,'portalLoans',id),{equipmentId:'ARV-001',equipmentName:'Geliştirme kartı',memberEmail:email,memberName:'Alice',due:'2026-10-10',purpose:'Örnek test',issuedAt:serverTimestamp(),returnRequested:false,returnedAt:null,returnNote:'',returnCondition:''});b.update(doc(d,'portalEquipment','ARV-001'),{activeLoanId:id,updatedAt:serverTimestamp()});return b.commit();}
test('equipment checkout is atomic; double custody is denied',async()=>{await assertSucceeds(issue());await assertFails(issue('loan2',bob));await assertFails(updateDoc(doc(db(owner),'portalEquipment','ARV-001'),{activeLoanId:'',updatedAt:serverTimestamp()}));await assertFails(updateDoc(doc(db(alice),'portalEquipment','ARV-001'),{note:'Yetkisiz',updatedAt:serverTimestamp()}));});
test('holder can request return but only admin can confirm physical return',async()=>{await assertSucceeds(issue());const r=doc(db(alice),'portalLoans','loan1');await assertSucceeds(updateDoc(r,{returnRequested:true}));await assertFails(updateDoc(r,{returnedAt:serverTimestamp(),returnCondition:'ready',returnNote:''}));await assertFails(getDoc(doc(db(bob),'portalLoans','loan1')));const d=db(owner),b=writeBatch(d);b.update(doc(d,'portalLoans','loan1'),{returnedAt:serverTimestamp(),returnNote:'Kablo kontrol edilecek',returnCondition:'maintenance'});b.update(doc(d,'portalEquipment','ARV-001'),{activeLoanId:'',condition:'maintenance',updatedAt:serverTimestamp()});await assertSucceeds(b.commit());await assertFails(issue('loan2'));});
test('read-state is per user; revoking access blocks subsequent data access',async()=>{const d=db(alice);await assertSucceeds(setDoc(doc(d,'portalSeen',alice,'items','notice1'),{seenAt:serverTimestamp()}));await assertFails(setDoc(doc(d,'portalSeen',bob,'items','notice1'),{seenAt:serverTimestamp()}));await assertSucceeds(updateDoc(doc(db(owner),'portalAccess',alice),{active:false,updatedAt:serverTimestamp()}));await assertFails(getDoc(doc(d,'portalTasks','own')));await assertSucceeds(getDoc(doc(d,'portalAccess',alice)));});
test('new portal members cannot access recruitment applications or settings',async()=>{await assertFails(getDocs(query(collection(db(mentor),'applications'),limit(100))));await assertFails(updateDoc(doc(db(mentor),'settings','registration'),{enabled:true,updatedAt:serverTimestamp()}));});

test('mentor creation transactions may check missing IDs without reading other teams',async()=>{
 const d=db(mentor);
 await assertSucceeds(runTransaction(d,async tx=>{
   const r=doc(d,'portalTasks','new-transaction');
   assert.equal((await tx.get(r)).exists(),false);
   tx.set(r,{...task(),createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
 }));
 await assertSucceeds(runTransaction(d,async tx=>{
   const r=doc(d,'portalEnrollments','new-transaction');
   assert.equal((await tx.get(r)).exists(),false);
   tx.set(r,{...enrollment(),createdAt:serverTimestamp()});
   tx.set(doc(r,'steps','0'),{...step(),updatedAt:serverTimestamp()});
 }));
 await assertFails(getDoc(doc(d,'portalTasks','other')));
 await assertFails(getDoc(doc(db(other),'portalTasks','missing')));
});

test('demoted or reassigned mentor cannot keep reviewing previous team records',async()=>{
 await env.withSecurityRulesDisabled(async c=>{
   await updateDoc(doc(c.firestore(),'portalEnrollments','en1','steps','0'),step('pending'));
   await updateDoc(doc(c.firestore(),'portalAccess',mentor),{role:'member'});
 });
 const d=db(mentor),r=doc(d,'portalEnrollments','en1','steps','0');
 const review={status:'done',feedback:'',reviewerEmail:mentor,reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()};
 await assertFails(getDoc(doc(d,'portalEnrollments','en1')));
 await assertFails(updateDoc(r,review));
 await env.withSecurityRulesDisabled(c=>updateDoc(doc(c.firestore(),'portalAccess',mentor),{role:'mentor',teamIds:['ew']}));
 await assertFails(getDoc(doc(d,'portalEnrollments','en1')));
 await assertFails(updateDoc(r,review));
});
test('delegated portal administrator has no recruitment administration rights',async()=>{
 const d=db(alice);
 await env.withSecurityRulesDisabled(c=>updateDoc(doc(c.firestore(),'portalAccess',alice),{role:'admin'}));
 await assertSucceeds(getDocs(query(collection(d,'portalMembers'),limit(100))));
 await assertFails(getDocs(query(collection(d,'applications'),limit(100))));
 await assertFails(setDoc(doc(d,'settings','registration'),{enabled:true,updatedAt:serverTimestamp()}));
});
