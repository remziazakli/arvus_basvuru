// Only explicitly selected application fields leave the administrator panel.
const TEXT_FIELDS = ['category','fullName','phone','email','customArea','university','department','year','portfolio','experience','time','motivation','project','status'];
export function serializeApplication(record) {
  const data = record.data();
  const out = {id:record.id};
  for (const key of TEXT_FIELDS) out[key] = typeof data[key] === 'string' ? data[key] : '';
  out.skills = Array.isArray(data.skills) ? data.skills.filter(x=>typeof x==='string') : [];
  out.createdAt = data.createdAt?.toDate?.().toISOString() || null;
  return out;
}
export async function collectApplications(fetchPage, sessionValid, progress=()=>{}) {
  const rows = new Map();
  let cursor;
  for (;;) {
    if (!sessionValid()) throw new Error('Oturum değişti. Yeniden giriş yapıp dışa aktar.');
    const page = await fetchPage(cursor);
    if (!sessionValid()) throw new Error('Oturum değişti. Yeniden giriş yapıp dışa aktar.');
    for (const record of page.docs) rows.set(record.id, serializeApplication(record));
    progress(rows.size);
    if (page.docs.length < 100) break;
    const next = page.docs.at(-1);
    if (next.id === cursor?.id) throw new Error('Aktarım tamamlanamadı. Yeniden dene.');
    cursor = next;
  }
  return {app:'ARVUS-APPLICATIONS',version:1,source:'arvus-basvuru',exportedAt:new Date().toISOString(),applications:[...rows.values()]};
}
