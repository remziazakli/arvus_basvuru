const {test}=require('node:test');
const assert=require('node:assert/strict');
test('portal enters the auth origin before login, retaining navigation',async()=>{
  const {portalDestination}=await import('../public/yonetim/entry.js');
  for(const path of ['/yonetim','/yonetim/','/yonetim/index.html'])
    assert.equal(portalDestination('https://arvus-basvuru.web.app'+path+'?from=team#tasks'),
      'https://arvus-basvuru.firebaseapp.com'+path+'?from=team#tasks');
});
test('no redirect loop or changes to recruitment, callbacks, or local emulator',async()=>{
  const {portalDestination}=await import('../public/yonetim/entry.js');
  for(const url of ['https://arvus-basvuru.firebaseapp.com/yonetim/',
    'https://arvus-basvuru.web.app/','https://arvus-basvuru.web.app/admin.html',
    'https://arvus-basvuru.web.app/__/auth/handler',
    'http://127.0.0.1:8181/yonetim/?emulator=1','https://example.com/yonetim/'])
    assert.equal(portalDestination(url),null);
});
