import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {before,after,beforeEach,test} from 'node:test';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,query,where,limit,updateDoc,deleteDoc,serverTimestamp,writeBatch,runTransaction} from 'firebase/firestore';
let env;
const root='remziazakli@gmail.com',alice='alice@example.com',bob='bob@example.com',mentor='mentor@example.com',other='other@example.com',blocked='sulbur.korkmaz@gmail.com';
const auth=(email,verified=true,provider='google.com')=>env.authenticatedContext(email,{email,email_verified:verified,firebase:{sign_in_provider:provider}}).firestore();
const ref=(db,name,id)=>doc(db,'team_'+name,id);
const member=(email,role='member',teamIds=['ai'],active=true)=>({email,displayName:'Test User',role,teamIds,active,unitId:'',updatedAt:serverTimestamp()});
const task=(assignee=alice,teamId='ai')=>({title:'Test task',description:'Do the work',teamId,assignee,dueDate:'2026-10-10',priority:'normal',status:'todo',resultURL:'',createdAt:serverTimestamp(),createdBy:root,updatedAt:serverTimestamp()});
const route=()=>({title:'Learn Python',teamId:'ai',instructions:'Study, implement, submit a link.',resourceURL:'https://example.com',archived:false,createdAt:serverTimestamp(),createdBy:root,updatedAt:serverTimestamp()});
const progress=(email=alice)=>({teamId:'ai',routeId:'r1',memberEmail:email,evidenceURL:'https://example.com/evidence',note:'Ready',status:'pending',feedback:'',reviewedBy:'',submittedAt:serverTimestamp(),updatedAt:serverTimestamp()});
const asset=()=>({teamId:'ai',name:'Raspberry Pi',serial:'PI-01',notes:'',archived:false,currentLoanId:'',borrower:'',updatedAt:serverTimestamp()});
const notification=(email=alice)=>({teamId:'ai',recipient:email,title:'Assigned task',body:'Check the board',read:false,createdAt:serverTimestamp(),createdBy:root});
const list=(db,name,filters=[])=>getDocs(query(collection(db,'team_'+name),...filters.map(([k,v])=>where(k,'==',v)),limit(100)));
async function seed(name,id,data){await env.withSecurityRulesDisabled(c=>setDoc(ref(c.firestore(),name,id),data));}
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-arvus',firestore:{rules:readFileSync('firestore.rules','utf8')}});});
after(async()=>env?.cleanup());
beforeEach(async()=>{
 await env.clearFirestore();
 for(const id of ['ai','ew'])await seed('teams',id,{name:id+' team',description:'',archived:false,updatedAt:new Date()});
 for(const [email,role,teams,active] of [[alice,'member',['ai'],true],[bob,'member',['ai'],true],[mentor,'mentor',['ai'],true],[other,'mentor',['ew'],true],['inactive@example.com','member',['ai'],false],['manager@example.com','admin',[],true]])
   await seed('members',email,member(email,role,teams,active));
 await setDoc(ref(auth(root),'tasks','t1'),task());
 await setDoc(ref(auth(root),'routes','r1'),route());
 await setDoc(ref(auth(root),'inventory','i1'),asset());
});
test('all three verified Google roots bootstrap without member documents',async()=>{
 for(const email of ['rmzazakli@gmail.com',root,'sudenzturk@gmail.com']){
   await assertSucceeds(list(auth(email),'tasks'));
   await assertSucceeds(setDoc(ref(auth(email),'members','new@example.com'),member('new@example.com')));
 }
});
test('public, anonymous, unverified, password and non-activated users cannot enter workspace',async()=>{
 for(const db of [env.unauthenticatedContext().firestore(),auth(alice,false),auth(alice,true,'password'),auth(alice,true,'anonymous'),auth('inactive@example.com'),auth('unknown@example.com')]){
   await assertFails(getDoc(ref(db,'tasks','t1')));
   await assertFails(list(db,'teams'));
 }
 await assertSucceeds(getDoc(ref(auth('unknown@example.com'),'members','unknown@example.com')));
});
test('revoked account cannot access even if a legacy admin profile exists',async()=>{
 await seed('members',blocked,member(blocked,'admin'));
 for(const email of [blocked,blocked.toUpperCase()]){
   await assertFails(list(auth(email),'tasks'));
   await assertFails(getDoc(ref(auth(email),'members',blocked)));
 }
 await assertFails(setDoc(ref(auth(root),'members',blocked),member(blocked,'admin')));
});
test('members cannot elevate privileges, activate accounts or change teams',async()=>{
 for(const patch of [{role:'admin'},{active:false},{teamIds:['ew']}])await assertFails(updateDoc(ref(auth(alice),'members',alice),{...patch,updatedAt:serverTimestamp()}));
 await assertFails(setDoc(ref(auth(mentor),'members','new@example.com'),member('new@example.com')));
});
test('admin can disable a member; the same token immediately loses data access',async()=>{
 const db=auth(alice);await assertSucceeds(getDoc(ref(db,'tasks','t1')));
 await updateDoc(ref(auth(root),'members',alice),{active:false,updatedAt:serverTimestamp()});
 await assertFails(getDoc(ref(db,'tasks','t1')));
});
test('custom panel administrators cannot inherit application administrator permissions',async()=>{
 const db=auth('manager@example.com');
 await assertSucceeds(list(db,'tasks'));
 await assertFails(getDocs(query(collection(db,'applications'),limit(1))));
 await assertFails(setDoc(doc(db,'settings/registration'),{enabled:true,updatedAt:serverTimestamp()}));
});
test('members only query active directory entries; all directory queries must be bounded',async()=>{
 await assertSucceeds(list(auth(alice),'members',[['active',true]]));
 await assertFails(list(auth(alice),'members'));
 await assertFails(getDoc(ref(auth(alice),'members','inactive@example.com')));
 await assertFails(getDocs(collection(auth(root),'team_members')));
});
test('member documents reject extra fields, invalid roles and protected root overrides',async()=>{
 for(const patch of [{role:'owner'},{email:'wrong@example.com'},{phone:'secret'},{teamIds:'ai'}])
   await assertFails(setDoc(ref(auth(root),'members',alice),{...member(alice),...patch}));
 await assertFails(setDoc(ref(auth(root),'members',root),member(root,'member')));
 await assertFails(deleteDoc(ref(auth(root),'members',alice)));
});
test('task queries require team scope for non-admins; outsider reads and writes fail',async()=>{
 await assertSucceeds(list(auth(alice),'tasks',[['teamId','ai']]));
 await assertFails(list(auth(alice),'tasks'));
 await assertFails(getDoc(ref(auth(other),'tasks','t1')));
 await assertFails(updateDoc(ref(auth(other),'tasks','t1'),{status:'done',updatedAt:serverTimestamp()}));
});
test('only managers can create tasks; mentors are scoped to their teams',async()=>{
 await assertFails(setDoc(ref(auth(alice),'tasks','new'),{...task(),createdBy:alice}));
 await assertSucceeds(setDoc(ref(auth(mentor),'tasks','new'),{...task(),createdBy:mentor}));
 await assertFails(setDoc(ref(auth(other),'tasks','new2'),{...task(),createdBy:other}));
 await assertFails(setDoc(ref(auth(root),'tasks','bad'),task('inactive@example.com')));
 await assertFails(setDoc(ref(auth(root),'tasks','bad'),task(other)));
});
test('assignee can submit evidence but cannot complete, reassign or move task',async()=>{
 const db=auth(alice),target=ref(db,'tasks','t1');
 await assertSucceeds(updateDoc(target,{status:'review',resultURL:'https://example.com/result',updatedAt:serverTimestamp()}));
 for(const patch of [{status:'done'},{assignee:bob},{teamId:'ew'},{createdBy:alice},{title:'Hijacked task'},{resultURL:'javascript:alert(1)'}])
   await assertFails(updateDoc(target,{...patch,updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(ref(auth(bob),'tasks','t1'),{status:'doing',updatedAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(ref(auth(mentor),'tasks','t1'),{status:'done',updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(target,{status:'doing',updatedAt:serverTimestamp()}));
});
test('comments enforce team and task binding, authorship, timestamp and immutability',async()=>{
 const comment={teamId:'ai',taskId:'t1',body:'Great work',author:alice,createdAt:serverTimestamp()};
 await assertSucceeds(setDoc(ref(auth(alice),'comments','c1'),comment));
 await assertFails(setDoc(ref(auth(other),'comments','c2'),{...comment,author:other}));
 for(const patch of [{author:bob},{teamId:'ew'},{taskId:'missing'},{body:''},{createdAt:new Date(0)}])
   await assertFails(setDoc(ref(auth(alice),'comments','bad'),{...comment,...patch}));
 await assertFails(updateDoc(ref(auth(alice),'comments','c1'),{body:'Edited'}));
 await assertFails(deleteDoc(ref(auth(root),'comments','c1')));
});
test('learning routes are manager-owned and team-scoped',async()=>{
 await assertFails(setDoc(ref(auth(alice),'routes','r2'),{...route(),createdBy:alice}));
 await assertSucceeds(setDoc(ref(auth(mentor),'routes','r2'),{...route(),createdBy:mentor}));
 await assertFails(updateDoc(ref(auth(other),'routes','r1'),{title:'Changed',updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(ref(auth(root),'routes','r1'),{resourceURL:'javascript:alert(1)',updatedAt:serverTimestamp()}));
});
test('members submit only their own route evidence and cannot forge approvals',async()=>{
 await assertSucceeds(setDoc(ref(auth(alice),'progress','r1_'+alice),progress()));
 await assertFails(setDoc(ref(auth(alice),'progress','r1_'+bob),progress(bob)));
 await assertFails(setDoc(ref(auth(alice),'progress','r1_wrong'),progress()));
 await assertFails(updateDoc(ref(auth(alice),'progress','r1_'+alice),{status:'approved',reviewedBy:alice,updatedAt:serverTimestamp()}));
 await assertFails(setDoc(ref(auth(alice),'progress','r1_'+alice),{...progress(),teamId:'ew'}));
});
test('mentor feedback and resubmission work; approval locks member evidence',async()=>{
 const id='r1_'+alice;
 await setDoc(ref(auth(alice),'progress',id),progress());
 await assertSucceeds(updateDoc(ref(auth(mentor),'progress',id),{status:'changes',feedback:'Add tests',reviewedBy:mentor,updatedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(ref(auth(alice),'progress',id),{...progress(),note:'Tests added'}));
 await assertSucceeds(updateDoc(ref(auth(mentor),'progress',id),{status:'approved',feedback:'Good',reviewedBy:mentor,updatedAt:serverTimestamp()}));
 await assertFails(setDoc(ref(auth(alice),'progress',id),progress()));
 await assertFails(updateDoc(ref(auth(mentor),'progress',id),{status:'changes',updatedAt:serverTimestamp()}));
});
test('mentors cannot approve themselves or change evidence; other teams cannot review',async()=>{
 await setDoc(ref(auth(mentor),'progress','r1_'+mentor),progress(mentor));
 await assertFails(updateDoc(ref(auth(mentor),'progress','r1_'+mentor),{status:'approved',reviewedBy:mentor,updatedAt:serverTimestamp()}));
 await setDoc(ref(auth(alice),'progress','r1_'+alice),progress());
 await assertFails(updateDoc(ref(auth(other),'progress','r1_'+alice),{status:'approved',reviewedBy:other,updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(ref(auth(mentor),'progress','r1_'+alice),{status:'approved',reviewedBy:mentor,evidenceURL:'https://example.com/forged',updatedAt:serverTimestamp()}));
});
test('progress privacy: self or team mentor; archived routes reject new evidence',async()=>{
 await setDoc(ref(auth(alice),'progress','r1_'+alice),progress());
 await assertSucceeds(list(auth(alice),'progress',[['teamId','ai'],['memberEmail',alice]]));
 await assertFails(list(auth(alice),'progress',[['teamId','ai']]));
 await assertFails(getDoc(ref(auth(bob),'progress','r1_'+alice)));
 await assertSucceeds(list(auth(mentor),'progress',[['teamId','ai']]));
 await updateDoc(ref(auth(root),'routes','r1'),{archived:true,updatedAt:serverTimestamp()});
 await assertFails(setDoc(ref(auth(bob),'progress','r1_'+bob),progress(bob)));
});
async function checkout(db,loanId,borrower=alice){
 await runTransaction(db,async tx=>{
   const target=ref(db,'inventory','i1'),snap=await tx.get(target);
   if(snap.data().currentLoanId)throw new Error('Already checked out');
   tx.update(target,{currentLoanId:loanId,borrower,updatedAt:serverTimestamp()});
   tx.set(ref(db,'loans',loanId),{teamId:'ai',itemId:'i1',borrower,status:'out',checkedOutAt:serverTimestamp(),returnedAt:null,createdBy:root,returnNote:''});
 });
}
test('inventory administration and checkout are not available to members or mentors',async()=>{
 for(const email of [alice,mentor]){
   await assertFails(setDoc(ref(auth(email),'inventory','new'),asset()));
   await assertFails(updateDoc(ref(auth(email),'inventory','i1'),{notes:'Changed',updatedAt:serverTimestamp()}));
   await assertFails(checkout(auth(email),'bad'));
 }
});
test('checkout and return require atomic matching asset and history records',async()=>{
 const db=auth(root);
 await assertFails(updateDoc(ref(db,'inventory','i1'),{currentLoanId:'missing',borrower:alice,updatedAt:serverTimestamp()}));
 await assertSucceeds(checkout(db,'l1'));
 await assertFails(updateDoc(ref(db,'inventory','i1'),{currentLoanId:'',borrower:'',updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(ref(db,'loans','l1'),{status:'returned',returnedAt:serverTimestamp(),returnNote:''}));
 const batch=writeBatch(db);
 batch.update(ref(db,'inventory','i1'),{currentLoanId:'',borrower:'',updatedAt:serverTimestamp()});
 batch.update(ref(db,'loans','l1'),{status:'returned',returnedAt:serverTimestamp(),returnNote:'Good'});
 await assertSucceeds(batch.commit());
 assert.equal((await getDoc(ref(db,'loans','l1'))).data().status,'returned');
 await assertFails(deleteDoc(ref(db,'loans','l1')));
});
test('concurrent checkout admits one borrower and records one loan',async()=>{
 const results=await Promise.allSettled([checkout(auth(root),'l1',alice),checkout(auth(root),'l2',bob)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const loans=await list(auth(root),'loans');assert.equal(loans.size,1);
 const item=(await getDoc(ref(auth(root),'inventory','i1'))).data();
 assert.equal(item.currentLoanId,loans.docs[0].id);assert.equal(item.borrower,loans.docs[0].data().borrower);
});
test('notification recipients cannot read others or rewrite contents',async()=>{
 const db=auth(root);await setDoc(ref(db,'notifications','n1'),notification());
 await assertSucceeds(list(auth(alice),'notifications',[['recipient',alice]]));
 await assertFails(list(auth(alice),'notifications'));
 await assertFails(getDoc(ref(auth(bob),'notifications','n1')));
 await assertSucceeds(updateDoc(ref(auth(alice),'notifications','n1'),{read:true}));
 await assertFails(updateDoc(ref(auth(alice),'notifications','n1'),{body:'Changed'}));
 await assertFails(setDoc(ref(auth(alice),'notifications','bad'),{...notification(),createdBy:alice}));
});
test('all workspace datasets are available to admins for bounded JSON backup',async()=>{
 for(const name of ['members','teams','units','tasks','comments','routes','progress','inventory','loans','notifications'])
   await assertSucceeds(list(auth(root),name));
});
