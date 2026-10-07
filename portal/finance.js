export const FINANCE_CATEGORIES={sponsor:'Sponsorluk',dues:'Aidat',donation:'Bağış',opening:'Açılış bakiyesi',materials:'Malzeme / ekipman',travel:'Ulaşım / konaklama',event:'Etkinlik',other:'Diğer'};
export const FINANCE_ACCOUNTS={bank:'Banka',cash:'Nakit kasa'};
export function parseMoney(value){
  const s=String(value).trim();
  if(!/^\d{1,8}([.,]\d{1,2})?$/.test(s))throw Error('Tutarı 1250,50 gibi, binlik ayırıcı kullanmadan yaz.');
  const [whole,fraction='']=s.replace(',','.').split('.');
  const cents=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  if(!Number.isSafeInteger(cents)||cents<1||cents>1000000000)throw Error('Tutar 0,01–10.000.000 TL arasında olmalı.');
  return cents;
}
export function validFinanceDate(value){
  return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
}
export const money=cents=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(cents/100);
export function financeTotals(rows){
  const totals={income:0,expense:0,balance:0,bank:0,cash:0};
  for(const r of rows){if(r.voidedAt)continue;const sign=r.kind==='income'?1:-1;totals[r.kind]+=r.amountCents;totals.balance+=sign*r.amountCents;totals[r.account]+=sign*r.amountCents;}
  return totals;
}
