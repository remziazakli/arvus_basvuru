export const ROOT_ADMINS = Object.freeze(['rmzazakli@gmail.com','remziazakli@gmail.com','sudenzturk@gmail.com']);
export const BLOCKED_EMAIL = 'sulbur.korkmaz@gmail.com';
export const ROLES = {admin:'Yönetici',mentor:'Mentor',member:'Üye'};
export const STATUSES = {todo:'Yapılacak',doing:'Sürüyor',review:'İncelemede',done:'Tamamlandı'};
export const CATEGORIES = {ew:'Elektronik Harp',uav:'Uluslararası İHA',ai:'Havacılıkta Yapay Zekâ'};
export const COLLECTIONS = ['members','teams','units','tasks','comments','routes','progress','inventory','loans','notifications'];
export const emailKey = value => String(value || '').trim().toLowerCase();
export function validEmail(value) { return /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(value) && value.length <= 150; }
export function safeURL(value) {
  if (!value) return '';
  try { const url=new URL(value); return ['https:','http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}
export function parseApplications(payload) {
  if (payload?.app !== 'ARVUS-APPLICATIONS' || payload.version !== 1 || payload.source !== 'arvus-basvuru' || !Array.isArray(payload.applications))
    throw new Error('Başvuru panelinden indirilen ARVUS JSON dosyasını seç.');
  if (payload.applications.length > 5000) throw new Error('Bir dosyada en fazla 5000 başvuru işlenebilir.');
  const rows=new Map(), skipped=[];
  for (const data of payload.applications) {
    const email=emailKey(data?.email), name=String(data?.fullName || '').trim();
    if (!validEmail(email) || name.length<2 || name.length>100 || email===BLOCKED_EMAIL || ROOT_ADMINS.includes(email)) {
      skipped.push({email,reason:'Geçersiz veya korunan hesap'}); continue;
    }
    const old=rows.get(email);
    const teamIds=[...new Set([...(old?.teamIds || []),...(Object.hasOwn(CATEGORIES,data.category)?[data.category]:[])])];
    rows.set(email,{email,displayName:name,role:'member',active:false,teamIds,unitId:''});
  }
  return {members:[...rows.values()],skipped,duplicates:payload.applications.length-rows.size-skipped.length};
}
export function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function snapshotJSON(value) {
  if (value?.toDate) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(snapshotJSON);
  if (value && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,snapshotJSON(v)]));
  return value;
}
