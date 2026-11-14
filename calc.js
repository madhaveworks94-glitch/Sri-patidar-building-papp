// Numbers for Section 1 data (daily sales and spends). Sections 1 and 3 both use this; invoices are never read here.
import {db} from './store.js';
import {r2} from './util.js';
export const cleanTag=t=>String(t||'').trim().replace(/\s+/g,' ');
export const spendsOn=d=>db.spends.filter(s=>s.date===d);
export const salesOn=d=>db.days[d]?db.days[d].sales:null;
export function allTags(){const m=new Map();db.spends.forEach(s=>{const k=s.tag.toLowerCase();m.set(k,(m.get(k)||{tag:s.tag,n:0}));m.get(k).n++});return[...m.values()].sort((a,b)=>b.n-a.n).map(x=>x.tag)}
export function summary(from,to){
 const by={};
 for(const d of Object.keys(db.days)){if(d>=from&&d<=to)by[d]={d,sales:db.days[d].sales||0,spends:0,hasSales:true}}
 const tags=new Map();
 for(const s of db.spends){if(s.date<from||s.date>to)continue;
  const o=by[s.date]||(by[s.date]={d:s.date,sales:0,spends:0,hasSales:false});o.spends=r2(o.spends+s.amt);
  const k=s.tag.toLowerCase(),t=tags.get(k)||{tag:s.tag,amt:0,n:0};t.amt=r2(t.amt+s.amt);t.n++;tags.set(k,t)}
 const rows=Object.values(by).sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);
 let run=0,sales=0,spends=0;
 rows.forEach(r=>{r.net=r2(r.sales-r.spends);run=r2(run+r.net);r.run=run;sales=r2(sales+r.sales);spends=r2(spends+r.spends)});
 return{rows,sales,spends,profit:r2(sales-spends),byTag:[...tags.values()].sort((a,b)=>b.amt-a.amt),salesDays:rows.filter(r=>r.hasSales).length};
}
