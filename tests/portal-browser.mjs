// Integration test: the app, real Firebase SDK and local Auth/Firestore emulators.
// Only this in-memory test bundle replaces the Google popup with emulator credentials.
// No test identity or sign-in hook is shipped in public/yonetim/app.js.
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {doc,getDoc,getDocs,collection,query,where,updateDoc,serverTimestamp} from 'firebase/firestore';

const projectId='demo-arvus';
if(!process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_AUTH_EMULATOR_HOST)
  throw Error('Run with firebase emulators:exec; production is never a test target.');
const env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8088,rules:await readFile('firestore.rules','utf8')}});
const errors=[];
let browser,server;
const root=resolve('public');
try {
  await env.clearFirestore();
  const result=await build({entryPoints:['portal/app.js'],bundle:true,format:'esm',write:false,plugins:[{
    name:'emulator-google-login',setup(b){b.onLoad({filter:/portal\/firebase\.js$/},async args=>({
      contents:(await readFile(args.path,'utf8'))
        .replace('getAuth, GoogleAuthProvider','getAuth, signInWithCredential, GoogleAuthProvider')
        .replace('login:()=>signInWithPopup(auth,provider)',
          'login:()=>signInWithCredential(auth,GoogleAuthProvider.credential(JSON.stringify(window.__testIdentity)))'),
      loader:'js',resolveDir:resolve('portal')
    }));}
  }]});
  server=createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname==='/__/firebase/init.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({apiKey:'demo-key',authDomain:'demo-arvus.firebaseapp.com',projectId,appId:'demo-app'}));return;}
    if(pathname==='/yonetim/app.js'){res.setHeader('Content-Type','text/javascript');res.end(result.outputFiles[0].contents);return;}
    const file=resolve(root,'.'+decodeURIComponent(pathname)+(pathname.endsWith('/')?'index.html':''));
    if(!file.startsWith(root+'/')){res.writeHead(403);res.end();return;}
    try {const buf=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');res.end(buf);}
    catch {res.writeHead(404);res.end();}
  });
  await new Promise(r=>server.listen(8181,'127.0.0.1',r));
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const open=async(email,name,width=1440)=>{
    const context=await browser.newContext({viewport:{width,height:1000}});
    const page=await context.newPage();page.setDefaultTimeout(15000);
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(identity=>{window.__testIdentity=identity;},{sub:email.replace(/[^a-z0-9]/gi,''),email,email_verified:true,name});
    await page.goto('http://127.0.0.1:8181/yonetim/?emulator=1');
    await page.locator('#login:not([disabled])').waitFor();
    await page.locator('#login').click();return page;
  };
  const ready=async p=>{await p.locator('#portal:not([hidden])').waitFor();await p.locator('#loading').waitFor({state:'hidden'});};
  const nav=async(p,v)=>{await p.evaluate(v=>{location.hash=v;},v);await p.locator(`#navigation [data-nav="${v}"].active`).waitFor();};
  const save=async p=>{
    await p.locator('#form button[type=submit]').click();
    try{await p.locator('#modal').waitFor({state:'hidden'});}
    catch(e){throw Error('Form did not save: '+await p.locator('#form-error').innerText(),{cause:e});}
  };
  const owner=await open('rmzazakli@gmail.com','Test Yönetici');await ready(owner);
  await owner.locator('[data-action=bootstrap]').click();
  await nav(owner,'teams');await owner.getByRole('heading',{name:'Havacılıkta Yapay Zekâ',exact:true}).waitFor();
  console.log('PASS owner bootstrap: isolated portal teams and routes');
  const invite=async(address,name,role='member',team='ai')=>{
    await nav(owner,'members');await owner.locator('[data-action=member-new]').click();
    await owner.locator('[name=name]').fill(name);await owner.locator('[name=email]').fill(address);
    await owner.locator('[name=role]').selectOption(role);await owner.locator('[name=active]').selectOption('yes');
    await owner.locator(`[name=teamIds][value=${team}]`).check();await save(owner);
    await owner.getByText(address,{exact:true}).waitFor();
  };
  await invite('mentor@example.com','Test Mentor','mentor');
  await invite('alice@example.com','Test Üye');
  await invite('bob@example.com','Başka Takım Üyesi','member','ew');
  const mentor=await open('mentor@example.com','Test Mentor');await ready(mentor);
  const member=await open('alice@example.com','Test Üye',390);await ready(member);
  const outsider=await open('outsider@example.com','Yetkisiz Test');
  await outsider.getByText('Bu Google hesabının takım erişimi yok veya pasife alınmış. Yöneticiye e-posta adresini ilet.').waitFor();
  assert.equal(await outsider.locator('#content').innerText(),'');
  console.log('PASS invitations, real SDK sign-in, role navigation and outsider gate');
  await nav(mentor,'members');assert.equal(await mentor.getByText('bob@example.com',{exact:true}).count(),0);
  await nav(mentor,'tasks');await mentor.locator('[data-action=task-new]').click();
  await mentor.locator('[name=title]').fill('İlk ölçüm çıktısı');
  await mentor.locator('[name=assignee]').selectOption('alice@example.com');await save(mentor);
  await nav(member,'tasks');await member.getByRole('heading',{name:'İlk ölçüm çıktısı',exact:true}).waitFor();
  assert.equal(await member.locator('[data-action=task-new]').count(),0);
  assert.ok(await member.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile page should not overflow horizontally');
  if(process.env.PORTAL_SCREENSHOT_DIR){
    await mkdir(process.env.PORTAL_SCREENSHOT_DIR,{recursive:true});
    await member.screenshot({path:resolve(process.env.PORTAL_SCREENSHOT_DIR,'portal-mobile.png'),fullPage:true});
    await mentor.screenshot({path:resolve(process.env.PORTAL_SCREENSHOT_DIR,'portal-desktop.png'),fullPage:true});
  }
  await member.locator('[data-action=task-open]').click();await member.locator('[data-action=task-edit]').click();
  await member.locator('[name=status]').selectOption('doing');await member.locator('[name=evidence]').fill('Ölçüm tamamlandı; sonuçlar karşılaştırılıyor.');await save(member);
  await member.locator('[data-action=task-open]').click();
  await member.locator('#comment-form textarea').fill('Mentor, ölçüm sonucunu kontrol eder misin?');
  await member.locator('#comment-form button').click();await member.locator('#thread').getByText('Mentor, ölçüm sonucunu kontrol eder misin?').waitFor();
  await member.locator('#close-modal').click();
  console.log('PASS mentor task creation, member evidence update and atomic comments');
  await nav(mentor,'learning');await mentor.locator('[data-action=enroll-new][data-id="start-ai"]').click();
  await mentor.locator('[name=memberEmail]').selectOption('alice@example.com');await save(mentor);
  await nav(member,'learning');await member.locator('[data-action=enroll-open]').click();
  await member.locator('[data-action=step-evidence]').first().click();
  await member.locator('[name=evidence]').fill('Kurulum tamamlandı, örnek kod çalışıyor.');await save(member);
  await mentor.locator('[data-action=enroll-open]').click();await mentor.locator('[data-action=step-review]').first().click();
  await mentor.locator('[name=feedback]').fill('Kurulum doğrulandı, sonraki adıma geç.');await save(mentor);
  await member.locator('[data-action=enroll-open]').click();await member.getByText('Kurulum doğrulandı, sonraki adıma geç.').waitFor();
  await member.locator('#close-modal').click();
  console.log('PASS member learning evidence and independent mentor approval');
  await nav(owner,'equipment');await owner.locator('[data-action=asset-new]').click();
  await owner.locator('[name=name]').fill('Test Geliştirme Kartı');await owner.locator('[name=code]').fill('ARV-001');await save(owner);
  await owner.locator('[data-action=loan-new]').click();await owner.locator('[name=memberEmail]').selectOption('alice@example.com');
  await owner.locator('[name=purpose]').fill('Laboratuvar ölçümü');await save(owner);
  await nav(member,'equipment');await member.locator('[data-action=return-request]').click();
  await owner.getByText(/İade talebi var/).waitFor();await owner.locator('[data-action=loan-return]').click();
  await owner.locator('[name=condition]').selectOption('maintenance');await owner.locator('[name=note]').fill('Bağlantı kablosu kontrol edilecek.');await save(owner);
  await owner.locator('article').getByText('Bakımda',{exact:true}).waitFor();assert.equal(await owner.locator('[data-action=loan-new]').count(),0);
  console.log('PASS custody, member return request and admin maintenance return');
  await nav(owner,'settings');const downloadPromise=owner.waitForEvent('download');await owner.locator('[data-action=backup]').click();
  const download=await downloadPromise;const backup=JSON.parse(await readFile(await download.path(),'utf8'));
  assert.equal(backup.app,'ARVUS-CLOUD');assert.equal(backup.data.Tasks.length,1);assert.equal(Object.values(backup.data.comments).flat().length,1);assert.equal(backup.data.Loans.length,1);
  await owner.locator('#applications-file').setInputFiles({name:'applications.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({app:'ARVUS-APPLICATIONS',version:1,source:'arvus-basvuru',applications:[{fullName:'İçe Aktarılan Üye',email:'imported@example.com',category:'ai'}]}))});
  await save(owner);await nav(owner,'members');const imported=owner.locator('tr').filter({hasText:'imported@example.com'});await imported.waitFor();assert.match(await imported.innerText(),/Erişim kapalı/);
  console.log('PASS complete JSON backup and disabled-by-default applicant import');
  await nav(member,'tasks');await member.locator('[data-action=task-open]').click();
  await owner.locator('[data-action=member-edit][data-id="alice@example.com"]').click();await owner.locator('[name=active]').selectOption('no');await save(owner);
  await member.locator('#portal').waitFor({state:'hidden'});assert.equal(await member.locator('#content').innerText(),'');assert.equal(await member.locator('#modal').isVisible(),false);assert.equal(await member.locator('#modal-content').innerText(),'');
  await member.reload();await member.getByText('Bu Google hesabının takım erişimi yok veya pasife alınmış. Yöneticiye e-posta adresini ilet.').waitFor();
  assert.equal(await member.locator('#content').innerText(),'');
  await env.withSecurityRulesDisabled(async ctx=>{
    const d=ctx.firestore();assert.equal((await getDocs(collection(d,'applications'))).size,0);
    assert.equal((await getDoc(doc(d,'portalAccess','imported@example.com'))).data().active,false);
    assert.equal((await getDoc(doc(d,'portalAccess','sulbur.korkmaz@gmail.com'))).exists(),false);
  });
  assert.deepEqual(errors,[]);
  console.log('PASS live revocation clears private DOM and remains denied after reload');
  console.log('PASS no changes to applications and no revoked admin restored');
} finally {
  await browser?.close();await new Promise(r=>server?server.close(r):r());await env.cleanup();
}
