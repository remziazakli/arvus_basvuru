const {test}=require('node:test');const assert=require('node:assert/strict');const {JSDOM}=require('jsdom');const fs=require('node:fs');
async function setup(user, denied=false){
 const dom=new JSDOM(fs.readFileSync('public/admin.html','utf8'),{url:'https://arvus-basvuru.web.app/admin.html',runScripts:'outside-only'}),w=dom.window;let authCallback,snapshots=0,signedOut=false;
 w.HTMLDialogElement.prototype.close=function(){this.open=false;};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 const data={fullName:'<img src=x onerror=alert(1)>',university:'SUBÜ',department:'Elektronik',category:'ai',status:'new',email:'test@example.com',year:'2. sınıf',skills:['Python'],createdAt:{toMillis:()=>100,toDate:()=>new Date(100)}};
 w.mocks={getClient:async()=>({auth:{},db:{}}),ADMIN_EMAILS:["remziazakli@gmail.com","rmzazakli@gmail.com","sudenzturk@gmail.com"],CATEGORY_NAMES:{ai:'Yapay Zekâ'},friendlyError:e=>e.message,
 GoogleAuthProvider:function(){},signInWithPopup:async()=>{},signOut:async()=>{signedOut=true;authCallback(null);},onAuthStateChanged:(_,fn)=>{authCallback=fn;fn(user);},collection:(_,path)=>path,query:path=>path,orderBy:()=>{},limit:()=>{},doc:(_,collection,id)=>collection+'/'+id,setDoc:async()=>{},updateDoc:async()=>{},serverTimestamp:()=>{},getDocs:async()=>{},getDocsFromServer:async()=>{if(denied)throw {code:'permission-denied'};},startAfter:()=>{},
 onSnapshot:(ref,callback)=>{snapshots++;if(ref==='settings/registration')callback({exists:()=>true,data:()=>({enabled:true})});else callback({docChanges:()=>[{type:'added',doc:{id:'alice_ai',data:()=>data}}],docs:[{id:'alice_ai'}],size:1});return ()=>{};}};
 const code=fs.readFileSync('public/admin.js','utf8').replace(/^import .*;\n/gm,'');await w.eval('(async()=>{const {'+Object.keys(w.mocks).join(',')+'}=window.mocks;'+code+'})()');await new Promise(r=>setImmediate(r));
 return {dom,w,snapshots:()=>snapshots,signedOut:()=>signedOut,logout:()=>authCallback(null)};
}
const verified={email:'remziazakli@gmail.com',emailVerified:true,providerData:[{providerId:'google.com'}]};
test('wrong account never subscribes to application data',async()=>{const t=await setup({...verified,email:'other@gmail.com'});assert.equal(t.snapshots(),0);assert.equal(t.signedOut(),true);assert.equal(t.w.document.querySelector('#dashboard').hidden,true);t.dom.window.close();});
test('candidate text cannot create HTML; signout clears rendered details',async()=>{const t=await setup(verified);const doc=t.w.document;assert.equal(t.snapshots(),2);assert.match(doc.querySelector('#rows').textContent,/<img/);assert.equal(doc.querySelectorAll('#rows img').length,0);doc.querySelector('#rows button').click();assert.match(doc.querySelector('#detail-title').textContent,/<img/);t.logout();assert.equal(doc.querySelector('#detail-fields').textContent,'');assert.equal(doc.querySelector('#rows').textContent,'');assert.equal(doc.querySelector('#detail-title').textContent,'Başvuru');assert.equal(doc.querySelector('#dashboard').hidden,true);t.dom.window.close();});

for(const email of ["remziazakli@gmail.com","rmzazakli@gmail.com","sudenzturk@gmail.com"]) {
 test('allowed Google admin opens dashboard: '+email,async()=>{const t=await setup({...verified,email});assert.equal(t.snapshots(),2);assert.equal(t.w.document.querySelector('#dashboard').hidden,false);t.dom.window.close();});
 test('unverified account denied: '+email,async()=>{const t=await setup({...verified,email,emailVerified:false});assert.equal(t.snapshots(),0);assert.equal(t.signedOut(),true);t.dom.window.close();});
}
test('server denial keeps dashboard closed and signs out',async()=>{const t=await setup(verified,true);assert.equal(t.snapshots(),0);assert.equal(t.signedOut(),true);assert.equal(t.w.document.querySelector('#dashboard').hidden,true);t.dom.window.close();});
test('frontend and database admin lists stay identical',()=>{const source=fs.readFileSync('public/firebase-client.js','utf8');const frontend=JSON.parse(source.match(/ADMIN_EMAILS = Object.freeze\((\[[^;]+\])\)/)[1]);const rules=JSON.parse(fs.readFileSync('firestore.rules','utf8').match(/token.email in (\[[^\n]+\])/)[1]);assert.deepEqual(frontend,rules);assert.deepEqual(frontend,["remziazakli@gmail.com","rmzazakli@gmail.com","sudenzturk@gmail.com"]);});

test('revoked administrator cannot open dashboard or subscribe',async()=>{const t=await setup({...verified,email:'sulbur.korkmaz@gmail.com'});assert.equal(t.snapshots(),0);assert.equal(t.signedOut(),true);assert.equal(t.w.document.querySelector('#dashboard').hidden,true);t.dom.window.close();});
