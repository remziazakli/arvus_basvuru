export const ROLES={admin:'Yönetici',mentor:'Mentor / takım sorumlusu',member:'Üye'};
export const STATUS={todo:'Yapılacak',doing:'Devam ediyor',done:'Tamamlandı'};
export const stamp=v=>v?.toMillis?.()??(v?Date.parse(v)||0:0);
export const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const localDay=()=>new Date().toLocaleDateString('sv-SE');
export function safeURL(v){if(!v)return '';try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
export function notices(data,email,isAdmin){
  const result=[];
  const add=(kind,id,at,title,detail,target)=>result.push({id:`${kind}-${id}-${stamp(at)}`,at:stamp(at),title,detail,target});
  for(const t of data.tasks){
    if(t.assignee===email&&t.status!=='done')add('task',t.id,t.updatedAt,'Görevin güncellendi',t.title,{kind:'task',id:t.id});
    if(t.lastCommentBy&&t.lastCommentBy!==email)add('comment',t.id,t.lastCommentAt,'Görevde yeni yorum',t.title,{kind:'task',id:t.id});
  }
  for(const en of data.enrollments){
    const steps=data.steps[en.id]||[];
    if(en.memberEmail===email)add('route',en.id,en.createdAt,'Öğrenme rotan hazır',en.name,{kind:'enrollment',id:en.id});
    for(const s of steps){
      if(s.status==='pending'&&(en.mentorEmail===email||isAdmin))add('review',en.id+'-'+s.id,s.updatedAt,'İncelemen bekleniyor',s.title,{kind:'enrollment',id:en.id});
      if(en.memberEmail===email&&s.reviewedAt)add('feedback',en.id+'-'+s.id,s.reviewedAt,'Mentor geri bildirimi',s.title,{kind:'enrollment',id:en.id});
    }
  }
  for(const l of data.loans){if(!l.returnedAt&&l.memberEmail===email)add('loan',l.id,l.issuedAt,l.due<localDay()?'Ekipman iadesi gecikti':'Ekipman teslim aldın',`${l.equipmentName} · İade: ${l.due}`,{kind:'equipment'});if(isAdmin&&l.returnRequested&&!l.returnedAt)add('return',l.id,l.issuedAt,'İade onayın bekleniyor',l.equipmentName,{kind:'equipment'});}
  return result.sort((a,b)=>b.at-a.at);
}
export function canManage(grant,teamId){return grant?.role==='admin'||(grant?.role==='mentor'&&grant.teamIds.includes(teamId));}
export function teamDefaults(){return [
 ['ai','Havacılıkta Yapay Zekâ','purple'],['ew','Elektronik Harp','orange'],['uav','Uluslararası İHA','blue'],['other','Diğer yarışmalar','teal']
 ].map(([id,name,color])=>({id,name,color,kind:'team',description:''}));}
