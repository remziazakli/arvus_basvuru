'use strict';
const categories={ai:{name:'Havacılıkta Yapay Zekâ',skills:['Python','OpenCV','Derin öğrenme','Veri hazırlama','C++','Yeni başlıyorum'],question:'Görüntü işleme veya yapay zekâ ile ilgili bir deneyimini ya da fikrini anlat.'},ew:{name:'Elektronik Harp',skills:['RF / anten','Sinyal işleme','Elektronik tasarım','Gömülü sistemler','Python / MATLAB','Yeni başlıyorum'],question:'Elektronik veya sinyal işleme alanında yaptığın bir çalışmayı ya da merak ettiğin bir konuyu anlat.'},uav:{name:'Uluslararası İHA',skills:['Mekanik / CAD','Aviyonik','Uçuş yazılımı','Görüntü işleme','Üretim / kompozit','Yeni başlıyorum'],question:'Bir İHA takımında hangi alt sistemde çalışmak istersin? Varsa ilgili deneyimini anlat.'}};
let submitting=false;let step=0;let selected='';const skillSelections={};
const form=document.querySelector('#form');const panels=[...document.querySelectorAll('.panel')];const error=document.querySelector('#error');const back=document.querySelector('#back');const next=document.querySelector('#next');
function showError(message){error.textContent=message;error.hidden=false;}
function renderStep(focus=true){next.disabled=step===0&&!form.elements.category.value;document.querySelectorAll('.category[data-category]').forEach(a=>a.classList.toggle('is-selected',a.dataset.category===form.elements.category.value));document.querySelector('#chosen-field').hidden=step===0||!selected;if(selected)document.querySelector('#chosen-field-name').textContent=categories[selected].name;panels.forEach((p,i)=>p.hidden=i!==step);document.querySelectorAll('.steps li').forEach((li,i)=>{li.classList.toggle('active',i===step);li.classList.toggle('done',i<step);if(i===step)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});back.hidden=step===0;document.querySelector('#footer-caption').hidden=step!==0;next.replaceChildren(document.createTextNode(step===3?'Başvuruyu gönder':'Devam et'));const arrow=document.createElement('span');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');next.append(arrow);error.hidden=true;if(focus){const heading=panels[step].querySelector('h2');heading.tabIndex=-1;heading.focus({preventScroll:true});document.querySelector('#application').scrollIntoView({behavior:'smooth',block:'start'});}}
function renderSkills(){const data=categories[selected];document.querySelector('#category-context').textContent=data.name+' alanında nasıl katkı vermek istediğini keşfedelim.';document.querySelector('#project-question').textContent=data.question;const box=document.querySelector('#skills');box.replaceChildren();data.skills.forEach(skill=>{const label=document.createElement('label');label.className='skill-chip';const input=document.createElement('input');input.type='checkbox';input.name='skills';input.value=skill;input.checked=(skillSelections[selected]||[]).includes(skill);input.addEventListener('change',()=>{skillSelections[selected]=[...box.querySelectorAll('input:checked')].map(el=>el.value);});label.append(input,document.createTextNode(skill));box.append(label);});}
function value(name){return form.elements.namedItem(name).value.trim();}
function renderReview(){document.querySelector('#review-category').textContent=categories[selected].name;const rows=[['Ad soyad',value('fullName')],['E-posta',value('email')],['Üniversite',value('university')],['Bölüm / sınıf',value('department')+' · '+value('year')],['Portfolyo',value('portfolio')||'Belirtilmedi'],['İlgi alanları',(skillSelections[selected]||[]).join(', ')||'Belirtilmedi'],['Deneyim',value('experience')],['Haftalık süre',value('time')],['Motivasyon',value('motivation')],['Proje / fikir',value('project')||'Belirtilmedi']];const target=document.querySelector('#review');target.replaceChildren();rows.forEach(([label,text])=>{const row=document.createElement('div');row.className='review-row';const dt=document.createElement('dt');const dd=document.createElement('dd');dt.textContent=label;dd.textContent=text;row.append(dt,dd);target.append(row);});}
function validate(){error.hidden=true;if(step===0&&!form.elements.category.value){showError('Devam etmek için başvurmak istediğin alanı seç.');document.querySelector('.category[data-category]').focus();return false;}const controls=[...panels[step].querySelectorAll('input,select,textarea')];for(const field of controls){field.removeAttribute('aria-invalid');if(field.type!=='radio'&&field.type!=='checkbox'&&typeof field.value==='string')field.value=field.value.trim();if(!field.checkValidity()){field.setAttribute('aria-invalid','true');showError(field.validity.typeMismatch?'Lütfen geçerli bir e-posta veya https:// ile başlayan bağlantı gir.':'Lütfen zorunlu alanları tamamla ve bilgilerini kontrol et.');field.reportValidity();field.focus();return false;}}if(step===2&&value('motivation').length<20){showError('Motivasyonunu en az 20 karakterle anlat.');form.elements.motivation.focus();return false;}return true;}
form.addEventListener('submit',async event=>{event.preventDefault();if(submitting||!validate())return;if(step===0){const choice=form.elements.category.value;if(selected!==choice){selected=choice;renderSkills();}}if(step===2)renderReview();if(step<3){step++;renderStep();}else{
 if(form.elements.website.value) {showError('Başvuru gönderilemedi. Sayfayı yenileyip tekrar dene.');return;}
 submitting=true;form.inert=true;document.querySelector('#change-field').disabled=true;
 next.textContent='Gönderiliyor…';next.disabled=true;form.setAttribute('aria-busy','true');
 const payload={category:selected,skills:skillSelections[selected]||[],consent:document.querySelector('#confirm').checked};
 for(const name of ['fullName','email','university','department','year','portfolio','experience','time','motivation','project'])payload[name]=value(name);
 let timer;
 try {
  const service=await import('./firebase-client.js');
  const result=await Promise.race([service.submitApplication(payload),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Sunucudan onay alınamadı. Bağlantını kontrol edip tekrar dene; aynı başvuru iki kez oluşturulmaz.')),30000);})]);
  document.querySelector('#success-title').textContent=result.duplicate?'Başvurun zaten kayıtlı.':'Başvurun alındı.';
  document.querySelector('#success-message').textContent=result.duplicate?'Bu tarayıcıdan bu alana daha önce başvuru yapılmış. Yeni bir kayıt oluşturulmadı.':'Bilgilerin ARVUS ekibine ulaştı. Değerlendirme sonrası e-posta adresinden seninle iletişim kurabiliriz.';
  document.querySelector('#application-reference').textContent=result.id;
 } catch(err) {
  let message='Bağlantı kurulamadı. Lütfen internetini kontrol edip tekrar dene.';
  try {message=(await import('./firebase-client.js')).friendlyError(err);}catch(_){}
  showError(message);return;
 } finally {
  clearTimeout(timer);submitting=false;form.inert=false;form.removeAttribute('aria-busy');
  document.querySelector('#change-field').disabled=false;next.disabled=false;next.textContent='Başvuruyu gönder ↗';
 }
 form.hidden=true;document.querySelector('#success').hidden=false;document.querySelector('#success-category').textContent=categories[selected].name;document.querySelectorAll('.steps li').forEach(li=>{li.classList.remove('active');li.classList.add('done');li.removeAttribute('aria-current');});document.querySelector('#success-title').focus();}});
back.addEventListener('click',()=>{if(step>0){step--;renderStep();}});
form.addEventListener('input',event=>{event.target.removeAttribute('aria-invalid');error.hidden=true;});
document.querySelector('#restart').addEventListener('click',()=>{form.reset();Object.keys(skillSelections).forEach(key=>delete skillSelections[key]);selected='';step=0;document.querySelector('#success').hidden=true;form.hidden=false;renderStep();});
renderStep(false);
window.addEventListener('arvus-category-selected',event=>{selected=event.detail;renderSkills();step=0;form.hidden=false;document.querySelector('#success').hidden=true;document.querySelector('#confirm').checked=false;renderStep(false);});

// Category pages return here with a validated, preselected field.
const incomingField=new URLSearchParams(location.search).get('alan');
if(Object.hasOwn(categories,incomingField||'')){
 selected=incomingField;form.elements.category.value=selected;renderSkills();step=1;renderStep(false);
 requestAnimationFrame(()=>document.querySelector('#application').scrollIntoView({behavior:'instant',block:'start'}));
}
document.querySelector('#change-field').addEventListener('click',()=>{step=0;renderStep();});
