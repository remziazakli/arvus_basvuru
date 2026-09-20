const {test}=require('node:test');const assert=require('node:assert/strict');const {JSDOM}=require('jsdom');const fs=require('node:fs');
const tick=()=>new Promise(r=>setImmediate(r));
function setup(submit){
 const dom=new JSDOM(fs.readFileSync('public/index.html','utf8'),{url:'https://arvus-basvuru.web.app/?alan=ai',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;
 w.HTMLElement.prototype.scrollIntoView=function(){};w.mockService={submitApplication:submit,friendlyError:e=>e.message};
 w.eval(fs.readFileSync('public/app.js','utf8').replaceAll("import('./firebase-client.js')",'Promise.resolve(window.mockService)'));
 const f=w.document.querySelector('#form');const send=()=>f.dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));
 for(const [name,value] of Object.entries({fullName:'Deneme Adayı',email:'test@example.com',university:'SUBÜ',department:'Elektronik',year:'2. sınıf',experience:'Temel bilgim var',time:'6–10 saat',motivation:'Yeni şeyler üretmek için takımınıza katılmak istiyorum.'}))f.elements.namedItem(name).value=value;
 send();send();w.document.querySelector('#confirm').checked=true;
 return {dom,w,f,send};
}
test('confirmation waits for server; repeated clicks do not send twice',async()=>{let resolve,calls=0;const t=setup(()=>{calls++;return new Promise(r=>{resolve=r;});});t.send();await tick();t.send();assert.equal(calls,1);assert.equal(t.w.document.querySelector('#success').hidden,true);assert.equal(t.f.hidden,false);resolve({id:'alice_ai',duplicate:false});await tick();assert.equal(t.f.hidden,true);assert.equal(t.w.document.querySelector('#success').hidden,false);assert.equal(t.w.document.querySelector('#application-reference').textContent,'alice_ai');t.dom.window.close();});
test('server failure leaves values intact and permits retry',async()=>{let fail=true;const t=setup(async()=>{if(fail)throw Error('Bağlantı yok');return {id:'alice_ai',duplicate:true};});t.send();await tick();assert.equal(t.f.hidden,false);assert.equal(t.f.elements.fullName.value,'Deneme Adayı');assert.equal(t.w.document.querySelector('#error').textContent,'Bağlantı yok');assert.equal(t.w.document.querySelector('#next').disabled,false);fail=false;t.send();await tick();assert.equal(t.w.document.querySelector('#success-title').textContent,'Başvurun zaten kayıtlı.');t.dom.window.close();});
test('unchecked consent and honeypot cannot trigger submission',async()=>{let calls=0;const t=setup(async()=>{calls++;return {id:'x'};});t.w.document.querySelector('#confirm').checked=false;t.send();await tick();assert.equal(calls,0);t.w.document.querySelector('#confirm').checked=true;t.f.elements.website.value='spam';t.send();await tick();assert.equal(calls,0);t.dom.window.close();});
