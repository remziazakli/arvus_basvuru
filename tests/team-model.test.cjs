const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('import recognizes the real application export, deduplicates and never activates',async()=>{
 const {parseApplications}=await import('../public/yonetim/model.js');
 const result=parseApplications({app:'ARVUS-APPLICATIONS',version:1,source:'arvus-basvuru',applications:[
  {email:' Alice@Example.com ',fullName:'Alice Example',category:'ai',role:'admin',active:true,phone:'secret'},
  {email:'alice@example.com',fullName:'Alice Example',category:'ew'},
  {email:'sulbur.korkmaz@gmail.com',fullName:'Blocked User',category:'ai'},
  {email:'remziazakli@gmail.com',fullName:'Root User',category:'ai'},
  {email:'bad/email@example.com',fullName:'Bad User'},
 ]});
 assert.equal(result.members.length,1);assert.equal(result.duplicates,1);
 assert.equal(result.skipped.length,3);
 assert.deepEqual(result.members[0],{email:'alice@example.com',displayName:'Alice Example',role:'member',active:false,teamIds:['ai','ew'],unitId:''});
 assert.throws(()=>parseApplications({app:'ARVUS-TEAM'}));
});
test('links and displayed data cannot inject script',async()=>{
 const {safeURL,escapeHTML}=await import('../public/yonetim/model.js');
 for(const url of ['javascript:alert(1)','data:text/html,x','//example.com','file:///tmp/x'])assert.equal(safeURL(url),'');
 assert.equal(safeURL('https://example.com'),'https://example.com/');
 assert.equal(escapeHTML('<img src=x onerror="x">'),'&lt;img src=x onerror=&quot;x&quot;&gt;');
});
test('new workspace does not change legacy application rule blocks',()=>{
 const rules=fs.readFileSync('firestore.rules','utf8');
 const original=fs.readFileSync('tests/fixtures/application-rules-baseline.txt','utf8');
 assert.equal(rules.slice(0,rules.indexOf('    // Team workspace')),original);
});
