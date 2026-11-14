// GST maths for invoices and supplier bills. Amounts are kept to 2 decimals.
import {num,r2} from './util.js';
// One line. rate may include GST (incl=true). Discount % comes off before GST is added.
export function calcLine(l){
 const g=Math.max(num(l.gst),0),q=num(l.qty),rate=num(l.rate),d=Math.min(Math.max(num(l.disc),0),100);
 const ex=l.incl?rate/(1+g/100):rate,gross=r2(q*ex),tx=r2(gross*(1-d/100)),tax=r2(tx*g/100);
 return{gross,tx,tax,total:r2(tx+tax),exRate:ex};
}
// Whole invoice. inter=true means IGST (customer in another state), else CGST + SGST halves.
export function calcDoc(lines,inter){
 const L=lines.map(l=>({...l,...calcLine(l)}));
 const sub=r2(L.reduce((a,x)=>a+x.tx,0)),tax=r2(L.reduce((a,x)=>a+x.tax,0));
 const cgst=inter?0:r2(tax/2),sgst=inter?0:r2(tax-cgst),igst=inter?tax:0;
 const grand=r2(sub+tax),total=Math.round(grand),round=r2(total-grand);
 const rates={};L.forEach(x=>{const k=num(x.gst);const o=rates[k]||(rates[k]={rate:k,tx:0,tax:0});o.tx=r2(o.tx+x.tx);o.tax=r2(o.tax+x.tax)});
 return{lines:L,sub,tax,cgst,sgst,igst,grand,total,round,rates:Object.values(rates).sort((a,b)=>a.rate-b.rate)};
}
export const gstinOk=g=>/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(String(g||'').trim().toUpperCase());
