const {test}=require('node:test');
const assert=require('node:assert/strict');
test('TRY amounts use exact integer cents and reject ambiguous input',async()=>{
  const {parseMoney}=await import('../portal/finance.js');
  for(const [text,cents] of [['0,01',1],['1250,50',125050],['0.1',10],['10000000',1000000000]])assert.equal(parseMoney(text),cents);
  for(const value of ['','-1','0','1e3','1.234,56','1,234.56','1.999','Infinity','10000000.01'])assert.throws(()=>parseMoney(value));
});
test('balances include every row and exclude voids from every account',async()=>{
  const {financeTotals}=await import('../portal/finance.js');
  const rows=[{kind:'income',amountCents:125050,account:'bank'},{kind:'expense',amountCents:20010,account:'bank'},{kind:'income',amountCents:10000,account:'cash'},{kind:'expense',amountCents:900,account:'cash',voidedAt:{seconds:1}}];
  assert.deepEqual(financeTotals(rows),{income:135050,expense:20010,balance:115040,bank:105040,cash:10000});
  assert.equal(financeTotals(Array.from({length:201},()=>({kind:'income',amountCents:10,account:'cash'}))).balance,2010);
});
test('invalid calendar dates are rejected',async()=>{
  const {validFinanceDate}=await import('../portal/finance.js');
  assert.equal(validFinanceDate('2028-02-29'),true);
  for(const day of ['2026-02-29','2026-13-01','2026-04-31','abc'])assert.equal(validFinanceDate(day),false);
});
