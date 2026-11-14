// Reads a supplier invoice PDF (text based, made by a computer or billing app) into rows the owner can check.
const UN=/^(bags?|kgs?|pcs?|nos?|tons?|mt|qtl|quintals?|cft|trolleys?|sq\.?ft|ltrs?|litres?|box(es)?|bundles?|rolls?|mtr|meters?)$/i;
const UMAP={bags:'bag',kgs:'kg',pc:'pcs',no:'pcs',nos:'pcs',tons:'ton',mt:'ton',quintals:'quintal',qtl:'quintal',trolleys:'trolley',ltrs:'ltr',litres:'ltr',litre:'ltr',boxes:'box',bundles:'bundle',rolls:'roll',meters:'meter',mtr:'meter'};
const normU=u=>{u=u.toLowerCase().replace(/\.$/,'');return UMAP[u]||u};
const numOf=s=>/^-?[\d,]+(\.\d+)?$/.test(s)?parseFloat(s.replace(/,/g,'')):null;
const SKIP=/total|subtotal|grand|cgst|sgst|igst|round|discount|freight|balance|amount in words|taxable|invoice|gstin/i;
const FACT={1.05:5,1.12:12,1.18:18,1.28:28};
function core(toks){
 const nums=[];toks.forEach(t=>{const v=numOf(t);if(v!==null)nums.push(v)});
 if(nums.length<3)return null;
 const name=toks.filter(t=>numOf(t)===null&&!UN.test(t)&&/[A-Za-z]{3,}/.test(t)).sort((a,b)=>b.length-a.length)[0];
 if(!name||SKIP.test(name))return null;
 for(const f of [1,1.05,1.12,1.18,1.28])
  for(let k=nums.length-1;k>=2;k--)for(let i=0;i<k;i++)for(let j=i+1;j<k;j++){
   const a=nums[i],b=nums[j];if(a>0&&b>0&&Math.abs(a*b*f-nums[k])<=Math.max(1,nums[k]*0.01))return{name,nums,q:a,r:b,i,j,k,f}}
 return null;
}
export function parseLine(cells){
 const toks=[];cells.forEach(c=>{c=String(c).trim();const m=c.match(/^([\d,]+(?:\.\d+)?)\s*([A-Za-z.]+)$/);if(m&&UN.test(m[2]))toks.push(m[1],m[2]);else toks.push(c)});
 let hsn='',use=toks;
 const hi=toks.findIndex((t,i)=>i>0&&/^(\d{4}|\d{6}|\d{8})$/.test(t));
 let best=null;
 if(hi>0){const t2=toks.filter((_,i)=>i!==hi);best=core(t2);if(best){hsn=toks[hi];use=t2}}
 if(!best)best=core(toks);
 if(!best)return null;
 const g=best.f>1?FACT[best.f]:(best.nums.find((v,x)=>x!==best.i&&x!==best.j&&x!==best.k&&[5,12,18,28].includes(v))||'');
 const u=use.find(t=>UN.test(t));
 return{n:best.name.trim(),q:best.q,u:u?normU(u):'',r:best.r,g,h:hsn};
}
const GST=/\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]\b/;
export function parseHeader(lines){
 const flat=lines.map(c=>c.join(' ')),text=flat.join('\n'),o={supplier:'',gstin:'',no:'',date:''};
 const g=text.match(GST);if(g)o.gstin=g[0];
 const n=text.match(/invoice\s*(?:no\.?|number|#)\s*[:.\-]?\s*([A-Z0-9][A-Z0-9\/\-]*)/i);if(n)o.no=n[1];
 const d=text.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/);
 if(d){const p=x=>String(x).padStart(2,'0');o.date=d[3]+'-'+p(d[2])+'-'+p(d[1])}
 const s=flat.find(l=>/[A-Za-z]{4,}/.test(l)&&!/invoice|bill|original|duplicate|gstin|page|tax|e-way|date/i.test(l)&&l.length<70);if(s)o.supplier=s.trim();
 return o;
}
const load=u=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=u;s.onload=ok;s.onerror=()=>{s.remove();no(new Error('offline'))};document.head.appendChild(s)});
let lib;
async function pdfjs(){
 if(lib)return lib;
 if(!window.pdfjsLib){
  let local=true;
  try{await load('lib/pdf.min.js')}catch(e){local=false;await load('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js')}
  window.pdfjsLib.GlobalWorkerOptions.workerSrc=local?'lib/pdf.worker.min.js':'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
 }
 return lib=window.pdfjsLib;
}
export async function readLines(file){
 const doc=await (await pdfjs()).getDocument({data:await file.arrayBuffer()}).promise,lines=[];
 for(let p=1;p<=Math.min(doc.numPages,10);p++){
  const tc=await (await doc.getPage(p)).getTextContent(),rows=[];
  tc.items.forEach(it=>{if(!it.str.trim())return;const y=it.transform[5];let r=rows.find(x=>Math.abs(x.y-y)<=3);if(!r){r={y,c:[]};rows.push(r)}r.c.push({x:it.transform[4],w:it.width,s:it.str.trim()})});
  rows.sort((a,b)=>b.y-a.y).forEach(r=>{r.c.sort((a,b)=>a.x-b.x);const cells=[];r.c.forEach(it=>{const l=cells[cells.length-1];if(l&&it.x-l.end<6){l.s+=' '+it.s;l.end=it.x+it.w}else cells.push({s:it.s,end:it.x+it.w})});lines.push(cells.map(c=>c.s))});
 }
 return lines;
}
