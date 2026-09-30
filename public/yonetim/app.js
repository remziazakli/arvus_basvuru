import * as api from './api.js';
import {ROOT_ADMINS,BLOCKED_EMAIL,ROLES,STATUSES,COLLECTIONS,emailKey,validEmail,safeURL,escapeHTML as h,parseApplications} from './model.js';
const $=id=>document.getElementById(id);
const NAV=[['overview','◈','Genel bakış'],['tasks','▤','Görev panosu'],['routes','◇','Öğrenme rotaları'],['inventory','▣','Envanter / zimmet'],['members','◎','Üyeler'],['teams','◫','Takım ve birimler'],['notifications','◉','Bildirimler'],['backup','↓','Veri aktarımı']];
let me=null,view='overview',team='',generation=0,stops=[],data={},loaded=new Set(),capped=new Set(),modalSubmit=null,busy=false,activeTask=null,renderQueued=false;
const isAdmin=()=>me?.role==='admin';
const manages=(teamId)=>isAdmin()||(me?.role==='mentor'&&me.teamIds.includes(teamId));
const rows=name=>data[name]||[];
const teamName=id=>rows('teams').find(t=>t.id===id)?.name||id;
const memberName=email=>rows('members').find(m=>m.email===email)?.displayName||email;
const date=value=>value?.toDate?value.toDate().toLocaleString('tr-TR'):'—';
const badge=(text,kind='')=>'<span class="tag '+kind+'">'+h(text)+'</span>';
const button=(action,label,id='',css='secondary small')=>'<button type="button" class="'+css+'" data-action="'+action+'" data-id="'+h(id)+'">'+h(label)+'</button>';
const empty=text=>'<div class="empty">'+h(text)+'</div>';
const link=(url,label='Bağlantıyı aç ↗')=>safeURL(url)?'<a href="'+h(safeURL(url))+'" target="_blank" rel="noopener noreferrer">'+h(label)+'</a>':'';
function notice(message){$('notice').textContent=message;$('notice').hidden=false;}
function report(error){
  const messages={'permission-denied':'Bu işlem için yetkin yok veya üyelik/takım bilgileri değişmiş. Sayfayı yenileyip tekrar dene.',
    unavailable:'Bağlantı kurulamadı. İnternetini kontrol edip yeniden dene.',
    'auth/popup-closed-by-user':'Giriş penceresi kapatıldı. Yeniden deneyebilirsin.',
    'auth/popup-blocked':'Google girişi için açılır pencerelere izin ver.',
    'auth/unauthorized-domain':'Bu adres Firebase Google girişi için yetkili alanlara eklenmeli.',
    'auth/operation-not-allowed':'Firebase Authentication içinde Google girişi etkinleştirilmeli.'};
  const message=messages[error.code]||(error.code?'İşlem tamamlanamadı ('+error.code+'). Tekrar dene.':error.message);
  $('error').textContent=message;$('error').hidden=false;
  if(!$('editor').open){$('gate-message').textContent=message;}else{$('editor-error').textContent=message;}
}
function reset(){
  generation++;stops.forEach(stop=>stop());stops=[];data={};loaded.clear();capped.clear();
  $('editor').close();$('editor-fields').replaceChildren();modalSubmit=null;activeTask=null;
  $('content').replaceChildren();$('identity').textContent='';$('navigation').replaceChildren();
  $('error').hidden=true;$('notice').hidden=true;$('shell').hidden=true;$('gate').hidden=false;
}
function subscribe(){
  stops.forEach(stop=>stop());stops=[];data={};loaded.clear();capped.clear();
  const g=generation;
  const teamFilters=team?[['teamId',team]]:[];
  for(const name of COLLECTIONS){
    let filters=[];
    if(name==='members')filters=isAdmin()?[]:[['active',true]];
    else if(name==='teams')filters=[];
    else if(name==='notifications')filters=[['recipient',me.email]];
    else {
      if(!team&&!isAdmin()){loaded.add(name);data[name]=[];continue;}
      filters=[...teamFilters];
      if(name==='progress'&&me.role==='member')filters.push(['memberEmail',me.email]);
    }
    stops.push(api.watch(name,filters,(value,cap)=>{
      if(g!==generation)return;data[name]=value;loaded.add(name);cap?capped.add(name):capped.delete(name);
      if(name==='teams')renderTeamSelect();queueRender();
      if(name==='comments'&&activeTask&&$('editor').open)renderComments(activeTask);
    },error=>{if(g!==generation)return;data[name]=[];loaded.add(name);report(error);queueRender();}));
  }
  queueRender();
}
function renderTeamSelect(){
  const available=rows('teams').filter(t=>isAdmin()||me.teamIds.includes(t.id));
  $('team-filter').innerHTML=(isAdmin()?'<option value="">Tüm takımlar</option>':'')+available.map(t=>'<option value="'+h(t.id)+'">'+h(t.name)+(t.archived?' (arşiv)':'')+'</option>').join('');
  if(team&&!available.some(t=>t.id===team))$('team-filter').insertAdjacentHTML('beforeend','<option value="'+h(team)+'">'+h(team)+'</option>');
  $('team-filter').value=team;$('team-filter').disabled=!isAdmin()&&!available.length;
}
function queueRender(){if(renderQueued)return;renderQueued=true;queueMicrotask(()=>{renderQueued=false;if(me)render();});}
function heading(title,description,actions=''){
  return '<div class="page-heading"><div><p class="eyebrow">'+h(team?teamName(team):'ARVUS ÇALIŞMA ALANI')+'</p><h1>'+h(title)+'</h1><p class="muted">'+h(description)+'</p></div><div class="actions">'+actions+'</div></div>';
}
function render(){
  $('navigation').innerHTML=NAV.filter(([id])=>id!=='backup'||isAdmin()).map(([id,icon,label])=>
    '<button type="button" data-action="nav" data-id="'+id+'" class="'+(id===view?'active':'')+'" '+(id===view?'aria-current="page"':'')+'><span>'+icon+'</span>'+label+(id==='notifications'?' ('+rows('notifications').filter(n=>!n.read).length+')':'')+'</button>').join('');
  const renderers={overview:overviewView,tasks:tasksView,routes:routesView,inventory:inventoryView,members:membersView,teams:teamsView,notifications:notificationsView,backup:backupView};
  $('content').innerHTML=renderers[view]();
  if(capped.size)$('content').insertAdjacentHTML('beforeend','<p class="muted">Bu görünüm koleksiyon başına ilk 500 kaydı gösterir. Daha dar bir takım seçebilir, tüm kayıtları JSON yedeğiyle dışa aktarabilirsin.</p>');
  if(loaded.size<COLLECTIONS.length)$('content').insertAdjacentHTML('afterbegin','<p class="muted" role="status">Güncel kayıtlar yükleniyor…</p>');
}
function overviewView(){
  const myTasks=rows('tasks').filter(t=>t.assignee===me.email&&t.status!=='done');
  const pending=rows('progress').filter(p=>p.status==='pending');
  return '<section class="hero"><p class="eyebrow">ORTAK HEDEF. BİRLİKTE İLERLEME.</p><h1>Merhaba, '+h(me.displayName.split(' ')[0])+'.<br><em>Bugün ne üretiyoruz?</em></h1><p class="muted">Takımının çalışmalarını takip et, öğrendiklerini kanıtla ve bir sonraki adımı birlikte planla.</p><div class="actions">'+button('nav','Görev panosunu aç ↗','tasks','')+button('nav','Öğrenme rotaları','routes')+'</div></section>'+
    '<div class="stats">'+[['Açık görev',rows('tasks').filter(t=>t.status!=='done').length],['Tamamlanan görev',rows('tasks').filter(t=>t.status==='done').length],['Onay bekleyen çalışma',pending.length],['Zimmetli ekipman',rows('inventory').filter(i=>i.currentLoanId).length]].map(([l,n])=>'<div class="stat"><span>'+l+'</span><strong>'+n+'</strong><span>Seçili çalışma alanı</span></div>').join('')+'</div>'+
    '<div class="page-heading"><h2>Sıradaki görevlerin</h2>'+button('nav','Tüm görevler →','tasks')+'</div><div class="grid">'+(myTasks.length?myTasks.slice(0,6).map(taskCard).join(''):empty('Şu an sana atanmış açık görev yok.'))+'</div>'+
    (!rows('teams').length&&loaded.has('teams')&&isAdmin()?'<div class="card"><h2>Takımı çalışmaya hazırla</h2><p>Elektronik Harp, Uluslararası İHA ve Havacılıkta Yapay Zekâ takımlarını oluştur.</p>'+button('seed','Başlangıç takımlarını oluştur','','')+'</div>':'');
}
function taskCard(t){
  return '<article class="card">'+badge(teamName(t.teamId))+(t.priority==='high'?' '+badge('Öncelikli','amber'):'')+'<h3>'+h(t.title)+'</h3><p>'+h(t.description.slice(0,180))+'</p><span class="meta">'+h(memberName(t.assignee))+' · '+h(t.dueDate||'Tarih yok')+'</span>'+ (t.resultURL?'<p>'+link(t.resultURL,'Sonuç / kanıt ↗')+'</p>':'')+'<div class="actions">'+button('task-detail','Detay ve yorumlar',t.id)+(manages(t.teamId)?button('task-edit','Düzenle',t.id):'')+'</div></article>';
}
function tasksView(){
  const canCreate=isAdmin()||me.role==='mentor';
  return heading('Görev panosu','Fikirden sonuca, bütün çalışmalar tek yerde.',canCreate?button('task-new','+ Yeni görev','',''):'')+
    '<div class="board">'+Object.entries(STATUSES).map(([status,label])=>'<section class="column"><h2>'+label+' <span>'+rows('tasks').filter(t=>t.status===status).length+'</span></h2>'+rows('tasks').filter(t=>t.status===status).map(taskCard).join('')+'</section>').join('')+'</div>';
}
function routesView(){
  return heading('Öğrenme rotaları','Adımları tamamla, kanıtını paylaş ve mentorundan geri bildirim al.',isAdmin()||me.role==='mentor'?button('route-new','+ Yeni rota','',''):'')+
    '<div class="grid">'+(rows('routes').map(r=>{
      const own=rows('progress').find(p=>p.routeId===r.id&&p.memberEmail===me.email);
      return '<article class="card">'+badge(teamName(r.teamId))+(r.archived?' '+badge('Arşiv','amber'):'')+'<h2>'+h(r.title)+'</h2><p>'+h(r.instructions)+'</p>'+link(r.resourceURL,'Öğrenme kaynağı ↗')+
      '<p>'+ (own?badge({pending:'Mentor onayı bekliyor',approved:'Onaylandı',changes:'Düzeltme istendi'}[own.status],own.status==='approved'?'green':'amber'):'Henüz kanıt gönderilmedi.')+'</p>'+
      (own?.feedback?'<p><strong>Mentor geri bildirimi:</strong> '+h(own.feedback)+'</p>':'')+
      '<div class="actions">'+(!r.archived&&own?.status!=='approved'?button('evidence','Kanıt gönder',r.id):'')+(manages(r.teamId)?button('route-edit','Rotayı düzenle',r.id):'')+'</div></article>';
    }).join('')||empty('Henüz öğrenme rotası eklenmedi.'))+'</div>'+
    (isAdmin()||me.role==='mentor'?'<h2>Mentor değerlendirmeleri</h2><div class="grid">'+(rows('progress').map(p=>'<article class="card">'+badge({pending:'Bekliyor',approved:'Onaylandı',changes:'Düzeltme'}[p.status])+'<h3>'+h(rows('routes').find(r=>r.id===p.routeId)?.title||p.routeId)+'</h3><p>'+h(memberName(p.memberEmail))+'</p><p>'+h(p.note)+'</p>'+link(p.evidenceURL,'Çalışmanın kanıtı ↗')+'<p>'+h(p.feedback)+'</p>'+(p.status==='pending'&&p.memberEmail!==me.email?'<div class="actions">'+button('review','Değerlendir',p.id)+'</div>':'')+'</article>').join('')||empty('Değerlendirilecek çalışma yok.'))+'</div>':'');
}
function inventoryView(){
  return heading('Envanter ve zimmet','Her ekipmanı ayrı kaydet; zimmet ve iadelerin geçmişini koru.',isAdmin()?button('item-new','+ Ekipman ekle','',''):'')+
    '<div class="grid">'+(rows('inventory').map(i=>'<article class="card">'+badge(i.currentLoanId?'Zimmetli':i.archived?'Arşiv':'Kullanılabilir',i.currentLoanId?'amber':'green')+'<h2>'+h(i.name)+'</h2><p>'+h(teamName(i.teamId))+' · '+h(i.serial||'Seri no yok')+'</p><p>'+h(i.notes)+'</p>'+(i.borrower?'<p><strong>'+h(memberName(i.borrower))+'</strong></p>':'')+'<div class="actions">'+(isAdmin()?button('item-edit','Düzenle',i.id)+(i.currentLoanId?button('return','İade al',i.id):!i.archived?button('checkout','Zimmetle',i.id):''):'')+'</div></article>').join('')||empty('Henüz ekipman eklenmedi.'))+'</div><h2>Zimmet geçmişi</h2>'+
    '<div class="table-wrap"><table><thead><tr><th>EKİPMAN / ÜYE</th><th>ZİMMET</th><th>İADE</th><th>DURUM</th></tr></thead><tbody>'+rows('loans').sort((a,b)=>(b.checkedOutAt?.toMillis()||0)-(a.checkedOutAt?.toMillis()||0)).map(l=>'<tr><td>'+h(rows('inventory').find(i=>i.id===l.itemId)?.name||l.itemId)+'<small>'+h(l.borrower)+'</small></td><td>'+h(date(l.checkedOutAt))+'</td><td>'+h(date(l.returnedAt))+'<small>'+h(l.returnNote)+'</small></td><td>'+badge(l.status==='out'?'Zimmetli':'İade edildi',l.status==='out'?'amber':'green')+'</td></tr>').join('')+'</tbody></table></div>';
}
function membersView(){
  const members=rows('members');
  return heading('Takım arkadaşların','Üyelik ve rol değişiklikleri erişim kurallarına anında yansır.',isAdmin()?button('member-new','+ Üye ekle','',''):'')+
    (isAdmin()?'<p class="muted">Kalıcı yöneticiler: '+h(ROOT_ADMINS.join(' · '))+'</p>':'')+
    '<div class="table-wrap"><table><thead><tr><th>ÜYE</th><th>ROL</th><th>TAKIM / BİRİM</th><th>DURUM</th><th>İŞLEM</th></tr></thead><tbody>'+members.map(m=>'<tr><td>'+h(m.displayName)+'<small>'+h(m.email)+'</small></td><td>'+h(ROLES[m.role])+'</td><td>'+h(m.teamIds.map(teamName).join(', ')||'Atanmadı')+'<small>'+h(rows('units').find(u=>u.id===m.unitId)?.name||'')+'</small></td><td>'+badge(m.active?'Etkin':'Pasif',m.active?'green':'amber')+'</td><td>'+(isAdmin()?button('member-edit','Düzenle',m.email):'—')+'</td></tr>').join('')+'</tbody></table></div>'+
    (!members.length?empty('Henüz listelenecek üye yok.'):'');
}
function teamsView(){
  return heading('Takım ve birimler','Disiplinleri ortak hedef etrafında bir araya getir.',isAdmin()?button('team-new','+ Takım','','')+button('unit-new','+ Birim'):'')+
    '<div class="grid">'+rows('teams').filter(t=>isAdmin()||me.teamIds.includes(t.id)).map(t=>'<article class="card">'+badge(t.archived?'Arşiv':'Aktif',t.archived?'amber':'green')+'<h2>'+h(t.name)+'</h2><p>'+h(t.description)+'</p><div class="actions">'+(isAdmin()?button('team-edit','Düzenle',t.id):'')+'</div></article>').join('')+'</div><h2>Birimler</h2><div class="grid">'+
    (rows('units').map(u=>'<article class="card">'+badge(teamName(u.teamId))+'<h3>'+h(u.name)+(u.archived?' (arşiv)':'')+'</h3>'+(isAdmin()?button('unit-edit','Düzenle',u.id):'')+'</article>').join('')||empty('Henüz birim eklenmedi.'))+'</div>';
}
function notificationsView(){
  return heading('Bildirimler','Görev atamaları, mentor değerlendirmeleri ve zimmet güncellemeleri.',isAdmin()||me.role==='mentor'?button('notify-new','+ Bildirim gönder','',''):'')+
    '<div class="grid">'+(rows('notifications').sort((a,b)=>(b.createdAt?.toMillis()||0)-(a.createdAt?.toMillis()||0)).map(n=>'<article class="card">'+badge(n.read?'Okundu':'Yeni',n.read?'':'green')+'<h3>'+h(n.title)+'</h3><p>'+h(n.body)+'</p><small class="muted">'+h(date(n.createdAt))+'</small>'+(!n.read?'<div class="actions">'+button('read','Okundu işaretle',n.id)+'</div>':'')+'</article>').join('')||empty('Şu an bildirimin yok.'))+'</div>';
}
function backupView(){
  return heading('Veri aktarımı','Takım kayıtlarını dışa aktar; başvurulardan kontrollü biçimde üye oluştur.')+
    '<div class="grid"><article class="card"><p class="eyebrow">JSON / TAKIM VERİLERİ</p><h2>Takım yedeği</h2><p>Üyeler, takımlar, görevler, yorumlar, rotalar, onaylar, ekipmanlar, zimmetler ve bildirimler. Tüm kayıtlar sayfalanarak alınır.</p><p>Bu dosya kişisel veriler içerir. Güvenli bir yerde sakla. Başvurular bu yedeğe dahil değildir. Aktarım sırasında değişen kayıtlar aynı ana ait olmayabilir.</p>'+button('export','JSON yedeği indir','','')+'</article>'+
    '<article class="card"><p class="eyebrow">BAŞVURU → ÜYELİK</p><h2>Başvurulardan üye al</h2><p>Başvuru panelindeki “Tüm başvuruları indir” dosyasını seç. Önizlemede seçtiğin kişiler pasif üye olarak eklenecek; mevcut üyeler değiştirilmeyecek.</p>'+button('import','Başvuru JSON dosyası seç','','')+'<p><a href="/admin.html">Başvuru panelini aç ↗</a></p></article></div>';
}
function input(name,label,value='',type='text',extra=''){return '<label>'+h(label)+'<input name="'+name+'" type="'+type+'" value="'+h(value)+'" '+extra+'></label>';}
function textarea(name,label,value='',max=5000){return '<label>'+h(label)+'<textarea name="'+name+'" maxlength="'+max+'">'+h(value)+'</textarea></label>';}
function select(name,label,options,value='',extra=''){return '<label>'+h(label)+'<select name="'+name+'" '+extra+'>'+options.map(([id,title])=>'<option value="'+h(id)+'" '+(id===value?'selected':'')+'>'+h(title)+'</option>').join('')+'</select></label>';}
function check(name,label,checked){return '<label class="check"><input name="'+name+'" type="checkbox" '+(checked?'checked':'')+'>'+h(label)+'</label>';}
function teamOptions(){return rows('teams').filter(t=>!t.archived&&(isAdmin()||me.teamIds.includes(t.id))).map(t=>[t.id,t.name]);}
function teamField(value='',disabled=false){
  const options=teamOptions();if(value&&!options.some(([id])=>id===value))options.push([value,teamName(value)]);
  return select('teamId','Takım',options,value||team||options[0]?.[0],'required '+(disabled?'disabled':''));
}
function memberOptions(teamId){
  return [...ROOT_ADMINS.map(email=>[email,email]),...rows('members').filter(m=>m.active&&(!teamId||m.teamIds.includes(teamId))).map(m=>[m.email,m.displayName+' · '+m.email])];
}
function read(form){return Object.fromEntries(new FormData(form));}
function checked(form,name){return !!form.elements.namedItem(name)?.checked;}
function openEditor(title,fields,submit,label='Kaydet'){
  activeTask=null;modalSubmit=submit;$('editor-title').textContent=title;$('editor-fields').innerHTML=fields;
  $('editor-error').textContent='';$('editor-save').textContent=label;$('editor-save').hidden=!submit;$('editor-save').disabled=false;
  $('editor').showModal();
}
function requireTeam(teamId){if(!teamId)throw new Error('Önce bir takım oluştur veya takım seç.');return teamId;}
function validateURL(url){if(url&&!safeURL(url))throw new Error('Bağlantı http:// veya https:// ile başlamalı.');return url;}
function actorStamp(old){return old?{createdAt:old.createdAt,createdBy:old.createdBy}:{createdAt:api.stamp(),createdBy:me.email};}
function dynamicAssignees(current){
  const teamElement=$('editor-form').elements.namedItem('teamId'),assignee=$('editor-form').elements.namedItem('assignee');
  const update=()=>{const options=memberOptions(teamElement.value);if(current&&!options.some(([email])=>email===current))options.push([current,current+' (pasif / takım dışında)']);assignee.innerHTML=options.map(([id,label])=>'<option value="'+h(id)+'">'+h(label)+'</option>').join('');if(current)assignee.value=current;};
  teamElement.addEventListener('change',()=>{current='';update();});update();
}
function editMember(old){
  const teamChecks=rows('teams').map(t=>check('team-'+t.id,t.name,old?.teamIds.includes(t.id))).join('');
  openEditor(old?'Üyeyi düzenle':'Yeni üye',
    input('email','Google e-posta adresi',old?.email,'email','required maxlength="150" '+(old?'readonly':''))+
    input('displayName','Ad soyad',old?.displayName,'text','required minlength="2" maxlength="100"')+
    select('role','Rol',Object.entries(ROLES),old?.role||'member')+
    check('active','Panel erişimi etkin',old?.active||false)+'<fieldset><legend>Takımlar</legend>'+teamChecks+'</fieldset>'+
    select('unitId','Birim',[['','Atanmadı'],...rows('units').filter(u=>!u.archived).map(u=>[u.id,teamName(u.teamId)+' / '+u.name])],old?.unitId||''),
    async form=>{
      const values=read(form),email=emailKey(values.email);
      if(!validEmail(email)||email===BLOCKED_EMAIL||ROOT_ADMINS.includes(email))throw new Error('Bu adres eklenemez veya değiştirilemez.');
      const teamIds=rows('teams').filter(t=>checked(form,'team-'+t.id)).map(t=>t.id);
      if(teamIds.length>20)throw new Error('En fazla 20 takım seçilebilir.');
      const unit=rows('units').find(u=>u.id===values.unitId);
      if(unit&&!teamIds.includes(unit.teamId))throw new Error('Üyenin birimi, seçtiğin takımlardan birinde olmalı.');
      await api.save('members',email,{email,displayName:values.displayName.trim(),role:values.role,active:checked(form,'active'),teamIds,unitId:values.unitId,updatedAt:api.stamp()},!old);
    });
}
function editTeam(old){
  openEditor(old?'Takımı düzenle':'Yeni takım',input('name','Takım adı',old?.name,'text','required minlength="2" maxlength="100"')+textarea('description','Açıklama',old?.description,1000)+check('archived','Arşivlendi',old?.archived),
    async form=>{const v=read(form);await api.save('teams',old?.id,{name:v.name.trim(),description:v.description,archived:checked(form,'archived'),updatedAt:api.stamp()},!old);});
}
function editUnit(old){
  openEditor(old?'Birimi düzenle':'Yeni birim',input('name','Birim adı',old?.name,'text','required minlength="2" maxlength="100"')+teamField(old?.teamId)+check('archived','Arşivlendi',old?.archived),
    async form=>{const v=read(form);await api.save('units',old?.id,{name:v.name.trim(),teamId:requireTeam(v.teamId),archived:checked(form,'archived'),updatedAt:api.stamp()},!old);});
}
function editTask(old){
  openEditor(old?'Görevi düzenle':'Yeni görev',input('title','Görev başlığı',old?.title,'text','required minlength="2" maxlength="150"')+
    textarea('description','Açıklama / tamamlanma ölçütleri',old?.description)+teamField(old?.teamId,!!old)+
    select('assignee','Sorumlu',memberOptions(old?.teamId||team),old?.assignee||me.email,'required')+
    '<div class="form-grid">'+input('dueDate','Hedef tarih',old?.dueDate,'date')+select('priority','Öncelik',[['normal','Normal'],['high','Yüksek']],old?.priority||'normal')+'</div>'+
    select('status','Durum',Object.entries(STATUSES),old?.status||'todo')+input('resultURL','Sonuç / kanıt bağlantısı',old?.resultURL,'url','maxlength="1000"'),
    async form=>{
      const v=read(form),teamId=requireTeam(old?.teamId||v.teamId);
      const record={title:v.title.trim(),description:v.description,teamId,assignee:v.assignee,dueDate:v.dueDate,priority:v.priority,status:v.status,resultURL:validateURL(v.resultURL),...actorStamp(old),updatedAt:api.stamp()};
      await api.saveWithNotice('tasks',old?.id,record,api.notification(v.assignee,teamId,old?'Görev güncellendi':'Yeni görev',record.title,me.email),{createOnly:!old});
    });
  dynamicAssignees(old?.assignee||me.email);
}
function showTask(id){
  const t=rows('tasks').find(t=>t.id===id);if(!t)return;
  const canEdit=manages(t.teamId)||(t.assignee===me.email&&t.status!=='done');
  openEditor(t.title,'<p class="detail-block">'+h(t.description)+'</p><p>'+badge(STATUSES[t.status])+' · '+h(memberName(t.assignee))+'</p>'+
    (canEdit?select('status','Durum',Object.entries(STATUSES).filter(([s])=>manages(t.teamId)||s!=='done'),t.status)+input('resultURL','Sonuç / kanıt bağlantısı',t.resultURL,'url','maxlength="1000"'):link(t.resultURL))+
    '<h3>Yorumlar</h3><div id="task-comments"></div>'+textarea('comment','Yeni yorum','',2000),
    async form=>{
      const v=read(form),comment=v.comment.trim();
      if(canEdit)await api.patch('tasks',id,{status:v.status,resultURL:validateURL(v.resultURL),updatedAt:api.stamp()});
      if(comment)await api.save('comments',null,{taskId:id,teamId:t.teamId,author:me.email,body:comment,createdAt:api.stamp()},true);
    },'Değişiklikleri / yorumu kaydet');
  activeTask=id;renderComments(id);
}
function renderComments(id){
  const el=$('task-comments');if(!el)return;
  el.innerHTML=rows('comments').filter(c=>c.taskId===id).sort((a,b)=>(a.createdAt?.toMillis()||0)-(b.createdAt?.toMillis()||0)).map(c=>'<div class="comment"><small>'+h(memberName(c.author))+' · '+h(date(c.createdAt))+'</small><p>'+h(c.body)+'</p></div>').join('')||'<p class="muted">İlk yorumu sen yaz.</p>';
}
function editRoute(old){
  openEditor(old?'Rotayı düzenle':'Yeni öğrenme rotası',input('title','Rota başlığı',old?.title,'text','required minlength="2" maxlength="150"')+
    teamField(old?.teamId,!!old)+textarea('instructions','Sıralı adımlar ve başarı ölçütleri',old?.instructions)+input('resourceURL','Kaynak bağlantısı',old?.resourceURL,'url','maxlength="1000"')+check('archived','Arşivlendi',old?.archived),
    async form=>{const v=read(form);if(v.instructions.trim().length<2)throw new Error('Öğrenme adımlarını yaz.');await api.save('routes',old?.id,{title:v.title.trim(),teamId:requireTeam(old?.teamId||v.teamId),instructions:v.instructions,resourceURL:validateURL(v.resourceURL),archived:checked(form,'archived'),...actorStamp(old),updatedAt:api.stamp()},!old);});
}
function evidence(id){
  const route=rows('routes').find(r=>r.id===id),old=rows('progress').find(p=>p.routeId===id&&p.memberEmail===me.email);if(!route)return;
  openEditor('Kanıt gönder · '+route.title,input('evidenceURL','Çalışma / sonuç bağlantısı',old?.evidenceURL,'url','required maxlength="1000"')+textarea('note','Neler yaptın? Mentoruna not',old?.note,2000),
    async form=>{const v=read(form);await api.save('progress',id+'_'+me.email,{teamId:route.teamId,routeId:id,memberEmail:me.email,evidenceURL:validateURL(v.evidenceURL),note:v.note,status:'pending',feedback:'',reviewedBy:'',submittedAt:api.stamp(),updatedAt:api.stamp()});},'Mentor onayına gönder');
}
function review(id){
  const p=rows('progress').find(p=>p.id===id);if(!p)return;
  openEditor('Mentor değerlendirmesi','<p>'+h(memberName(p.memberEmail))+'</p>'+link(p.evidenceURL,'Kanıtı incele ↗')+select('status','Karar',[['approved','Onayla'],['changes','Düzeltme iste']])+textarea('feedback','Geri bildirim','',2000),
    async form=>{const v=read(form);if(v.status==='changes'&&!v.feedback.trim())throw new Error('Düzeltme için geri bildirim yaz.');
      const {id:_,...record}=p;
      await api.saveWithNotice('progress',id,{...record,status:v.status,feedback:v.feedback,reviewedBy:me.email,updatedAt:api.stamp()},
        api.notification(p.memberEmail,p.teamId,v.status==='approved'?'Öğrenme çalışman onaylandı':'Çalışmana düzeltme istendi',v.feedback.slice(0,1000),me.email),{expectedStatus:'pending'});
    },'Değerlendirmeyi kaydet');
}
function editItem(old){
  openEditor(old?'Ekipmanı düzenle':'Yeni ekipman',input('name','Ekipman adı',old?.name,'text','required minlength="2" maxlength="150"')+teamField(old?.teamId,!!old)+input('serial','Seri / envanter numarası',old?.serial,'text','maxlength="150"')+textarea('notes','Notlar',old?.notes,2000)+check('archived','Arşivlendi',old?.archived),
    async form=>{const v=read(form),fields={name:v.name.trim(),serial:v.serial,notes:v.notes,archived:checked(form,'archived'),updatedAt:api.stamp()};
      if(old)await api.patch('inventory',old.id,fields);
      else await api.save('inventory',null,{...fields,teamId:requireTeam(v.teamId),currentLoanId:'',borrower:''},true);
    });
}
function checkout(id){
  const item=rows('inventory').find(i=>i.id===id);if(!item)return;
  openEditor('Zimmetle · '+item.name,select('borrower','Teslim alan',memberOptions(item.teamId),'','required'),
    async form=>api.checkout(id,read(form).borrower,me.email),'Zimmeti kaydet');
}
function returnItem(id){
  const item=rows('inventory').find(i=>i.id===id);if(!item)return;
  openEditor('İade al · '+item.name,'<p>'+h(memberName(item.borrower))+' üzerindeki zimmet kapatılacak.</p>'+textarea('returnNote','İade durumu / not','',2000),
    async form=>api.returnItem(id,read(form).returnNote,me.email),'İadeyi onayla');
}
function notify(){
  openEditor('Panel içi bildirim',teamField()+select('assignee','Alıcı',memberOptions(team),'','required')+
    input('title','Başlık','','text','required minlength="2" maxlength="150"')+textarea('body','Mesaj','',1000),
    async form=>{const v=read(form);await api.save('notifications',null,api.notification(v.assignee,requireTeam(v.teamId),v.title,v.body,me.email),true);},'Bildirimi gönder');
  dynamicAssignees('');
}
async function importFile(file){
  if(!file||!isAdmin())return;
  if(file.size>10*1024*1024)throw new Error('Dosya en fazla 10 MB olabilir.');
  const g=generation;
  const parsed=parseApplications(JSON.parse(await file.text()));
  if(g!==generation||!isAdmin())return;
  openEditor('Başvuru içe aktarma önizlemesi','<p class="muted">'+parsed.members.length+' benzersiz aday · '+parsed.skipped.length+' atlanan · '+parsed.duplicates+' birleştirilen başvuru. Mevcut üyeler korunur. Hiçbir hesap otomatik etkinleştirilmez.</p>'+
    '<div class="import-list">'+parsed.members.map((m,i)=>check('candidate-'+i,m.displayName+' · '+m.email+' · '+m.teamIds.join(', '),false)).join('')+'</div>',
    async form=>{
      const selected=parsed.members.filter((_,i)=>checked(form,'candidate-'+i));
      if(!selected.length)throw new Error('İçe alınacak adayları seç.');
      await api.seedTeams(me.email);
      const result=await api.importMembers(selected,()=>generation===g&&isAdmin(),({added,existing})=>{$('editor-save').textContent=added+' eklendi · '+existing+' mevcut';});
      notice(result.added+' pasif üye eklendi; '+result.existing+' mevcut üye korundu. Üyeler bölümünden erişimlerini etkinleştirebilirsin.');
    },'Seçilenleri pasif üye olarak ekle');
}
async function exportBackup(){
  if(!isAdmin())return;const g=generation;
  notice('Yedek hazırlanıyor…');
  const result=await api.backup(()=>generation===g&&isAdmin(),(name,count)=>notice('Yedek hazırlanıyor: '+name+' / '+count));
  if(g!==generation||!isAdmin())return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='ARVUS-Takim-'+new Date().toISOString().replaceAll(':','-')+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  notice('Takım yedeği indirildi. Dosyayı güvenli bir yerde sakla.');
}
document.addEventListener('click',async event=>{
  const target=event.target.closest('[data-action]');if(!target||busy||!me)return;
  const action=target.dataset.action,id=target.dataset.id;
  $('error').hidden=true;
  const adminActions=['member-new','member-edit','team-new','team-edit','unit-new','unit-edit','item-new','item-edit','checkout','return','import','export','seed'];
  if(adminActions.includes(action)&&!isAdmin())return;
  try{
    const actions={
      nav:()=>{if(id==='backup'&&!isAdmin())return;view=id;render();$('content').focus();},
      'member-new':()=>editMember(), 'member-edit':()=>editMember(rows('members').find(m=>m.email===id)),
      'team-new':()=>editTeam(),'team-edit':()=>editTeam(rows('teams').find(t=>t.id===id)),
      'unit-new':()=>editUnit(),'unit-edit':()=>editUnit(rows('units').find(t=>t.id===id)),
      'task-new':()=>editTask(),'task-edit':()=>editTask(rows('tasks').find(t=>t.id===id)),
      'task-detail':()=>showTask(id),'route-new':()=>editRoute(),'route-edit':()=>editRoute(rows('routes').find(r=>r.id===id)),
      evidence:()=>evidence(id),review:()=>review(id),'item-new':()=>editItem(),'item-edit':()=>editItem(rows('inventory').find(i=>i.id===id)),
      checkout:()=>checkout(id),return:()=>returnItem(id),'notify-new':notify,
      read:()=>api.patch('notifications',id,{read:true}),
      import:()=>$('import-file').click(),export:exportBackup,
      seed:async()=>{await api.seedTeams(me.email);notice('Başlangıç takımları hazır.');}
    };
    busy=true;target.disabled=true;await actions[action]?.();
  }catch(error){report(error);}finally{busy=false;target.disabled=false;}
});
$('editor-form').addEventListener('submit',async event=>{
  event.preventDefault();if(!modalSubmit||busy)return;
  const g=generation;busy=true;$('editor-save').disabled=true;$('close-editor').disabled=true;$('editor-error').textContent='';
  try{await modalSubmit(event.target);if(g===generation){$('editor').close();activeTask=null;}}
  catch(error){if(g===generation)report(error);}
  finally{busy=false;$('editor-save').disabled=false;$('close-editor').disabled=false;}
});
$('close-editor').addEventListener('click',()=>{if(!busy){$('editor').close();activeTask=null;}});
$('editor').addEventListener('cancel',event=>{if(busy)event.preventDefault();else activeTask=null;});
$('import-file').addEventListener('change',event=>{importFile(event.target.files[0]).catch(report);event.target.value='';});
$('team-filter').addEventListener('change',event=>{team=event.target.value;generation++;subscribe();});
$('login').addEventListener('click',async()=>{try{$('login').disabled=true;await api.login();}catch(error){report(error);}finally{$('login').disabled=false;}});
for(const id of ['logout','gate-logout'])$(id).addEventListener('click',()=>api.logout().catch(report));
try{
  await api.initialize();$('login').disabled=false;$('gate-message').textContent='Yalnızca yönetici tarafından etkinleştirilen Google hesapları giriş yapabilir.';
  api.observeSession((member,waiting=false)=>{
    const previousTeam=team;reset();me=member;
    $('gate-logout').hidden=!waiting;
    if(!member){$('gate-message').textContent=waiting?'Hesabın henüz etkin değil veya erişimin kaldırıldı. Takım yöneticinle iletişime geç.':'Google hesabınla giriş yap.';return;}
    if(view==='backup'&&!isAdmin())view='overview';
    team=isAdmin()?previousTeam:(member.teamIds.includes(previousTeam)?previousTeam:member.teamIds[0]||'');
    $('gate').hidden=true;$('shell').hidden=false;$('identity').textContent=member.displayName+' · '+ROLES[member.role];
    subscribe();
  },report);
}catch(error){report(error);}
