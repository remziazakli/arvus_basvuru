const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const modulePromise=import('data:text/javascript;base64,'+fs.readFileSync(path.join(__dirname,'../public/application-export.js')).toString('base64'));
function record(i){return {id:'id-'+i,data:()=>({fullName:'Test Candidate',email:'test@example.invalid',category:'ew',uid:'private-auth-id',consent:true,skills:['RF / anten'],createdAt:{toDate:()=>new Date('2026-09-25T00:00:00Z')}})}}
test('exports every page and only selected fields',async()=>{
 const {collectApplications}=await modulePromise;let calls=0;
 const result=await collectApplications(async cursor=>{calls++;if(!cursor)return {docs:Array.from({length:100},(_,i)=>record(i))};assert.equal(cursor.id,'id-99');return {docs:[record(100)]}},()=>true);
 assert.equal(calls,2);assert.equal(result.applications.length,101);assert.equal(result.applications[0].createdAt,'2026-09-25T00:00:00.000Z');assert.equal('uid' in result.applications[0],false);assert.equal('consent' in result.applications[0],false);
});
test('session change and server denial abort export',async()=>{
 const {collectApplications}=await modulePromise;let valid=true;
 await assert.rejects(collectApplications(async()=>{valid=false;return {docs:[record(1)]}},()=>valid),/Oturum/);
 await assert.rejects(collectApplications(async()=>{throw new Error('permission-denied')},()=>true),/permission-denied/);
});
test('empty collection and exact page boundary terminate correctly',async()=>{
 const {collectApplications}=await modulePromise;
 assert.equal((await collectApplications(async()=>({docs:[]}),()=>true)).applications.length,0);
 let calls=0;const result=await collectApplications(async()=>({docs:calls++===0?Array.from({length:100},(_,i)=>record(i)):[]}),()=>true);
 assert.equal(calls,2);assert.equal(result.applications.length,100);
});
test('authenticated admin button downloads JSON without writes',async()=>{
 const {JSDOM}=require('jsdom');const {collectApplications}=await modulePromise;
 const dom=new JSDOM(fs.readFileSync(path.join(__dirname,'../public/admin.html'),'utf8'),{url:'https://arvus-basvuru.web.app/admin.html',runScripts:'outside-only'});const w=dom.window;
 const user={uid:'admin-id',email:'remziazakli@gmail.com',emailVerified:true,providerData:[{providerId:'google.com'}]};let clicks=0,queries=0;
 w.HTMLDialogElement.prototype.close=function(){};w.URL.createObjectURL=()=> 'blob:local-test';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){clicks++;assert.match(this.download,/ARVUS-Basvurular/)};w.setTimeout=()=>0;
 w.mocks={collectApplications,getClient:async()=>({auth:{currentUser:user},db:{}}),ADMIN_EMAILS:[user.email],CATEGORY_NAMES:{},friendlyError:e=>e.message,onAuthStateChanged:(_,fn)=>fn(user),signOut:async()=>{},collection:()=> 'applications',query:(...args)=>args,orderBy:x=>x,documentId:()=> '__name__',limit:x=>x,startAfter:x=>x,doc:()=>'',onSnapshot:()=>()=>{},getDocsFromServer:async args=>{queries++;if(queries===1)return {};assert.ok(args.includes('__name__'));assert.ok(args.includes(100));return {docs:[record(1)]}}};
 const code=fs.readFileSync(path.join(__dirname,'../public/admin.js'),'utf8').replace(/^import .*;\n/gm,'');await w.eval('(async()=>{const {'+Object.keys(w.mocks).join(',')+'}=window.mocks;'+code+'})()');await new Promise(r=>setImmediate(r));
 w.document.querySelector('#export-applications').click();await new Promise(r=>setImmediate(r));assert.equal(clicks,1);assert.match(w.document.querySelector('#notice').textContent,/1 başvuru indirildi/);dom.window.close();
});
