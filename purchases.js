// Section 2 / Purchases tab: supplier bills. Saving a bill puts the goods into stock.
import {db,save} from './store.js';
import {esc,num,fmt,inr,r2,uid,today,dmy,hsnGuess,toast} from './util.js';
import {calcLine,gstinOk} from './invcalc.js';
import {matchProduct,addStock,note} from './stock.js';
import {readLines,parseLine,parseHeader} from './pdfimport.js';
let root,view='list',draft=null,openId=null,msg='';
const $=s=>root.querySelector(s);
const blankLine=()=>({n:'',h:'',u:'',q:'',r:'',g:'18',sell:'',mult:''});
const blankDraft=()=>({supplier:'',gstin:'',no:'',date:today(),incl:false,other:'',fname:'',lines:[blankLine()],note:''});
export function mount(r){root=r;view='list';draft=null;openId=null;msg='';draw()}
const draw=()=>view==='form'?form():view==='open'?open():list();
const sameUnit=(a,b)=>String(a||'').trim().toLowerCase()===String(b||'').trim().toLowerCase();

function list(){
 const P=[...db.purchases].sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:b.ts-a.ts);
 root.innerHTML=`<div class="card"><h3>Add supplier bill</h3><p class="mute" style="margin:0">Put in a bill from your supplier and the stock fills in by itself.</p>
 <label>Import a PDF bill</label><input id="pdf" type="file" accept="application/pdf,.pdf"><div class="msg" id="pm"></div>
 <button class="btn ghost" id="typed" type="button">Type a bill in by hand</button></div>
 <h2>Supplier bills</h2>${P.length?P.map(p=>`<button class="item" data-o="${p.id}" type="button"><span><b>${esc(p.supplier)}</b><br><small class="mute">${dmy(p.date)}${p.no?' · Bill '+esc(p.no):''} · ${p.lines.length} items</small></span><span class="r"><b>${inr(p.total)}</b></span></button>`).join(''):'<p class="empty">No supplier bills yet.</p>'}`;
 $('#typed').onclick=()=>{draft=blankDraft();view='form';draw()};
 root.onclick=e=>{const b=e.target.closest('[data-o]');if(b){openId=b.dataset.o;view='open';msg='';draw()}};
 $('#pdf').onchange=async e=>{const f=e.target.files[0];if(!f)return;const m=$('#pm');m.className='msg';m.textContent='Reading the PDF…';
  try{const lines=await readLines(f);
   if(!lines.length){m.textContent='No text found. This looks like a photo or scan. Use "Type a bill in by hand".';return}
   const h=parseHeader(lines),rows=lines.map(parseLine).filter(Boolean);
   draft={...blankDraft(),supplier:h.supplier,gstin:h.gstin,no:h.no,date:h.date||today(),fname:f.name,lines:rows.length?rows.map(x=>({n:x.n,h:x.h||'',u:x.u||'',q:String(x.q),r:String(x.r),g:String(x.g===''?18:x.g),sell:'',mult:''})):[blankLine()],note:rows.length?'':'I could not find item rows in this PDF. Add the rows by hand below.'};
   view='form';draw()}
  catch(err){m.textContent=err&&err.message==='offline'?'Could not load the PDF reader. Connect to the internet and try again.':'Could not read this PDF. Use "Type a bill in by hand".'}};
}

function meta(x,i){
 const p=matchProduct(x.n),diff=p&&x.u&&!sameUnit(p.unit,x.u);
 return`<div style="margin-top:8px"><span class="pill ${p?'':'warn'}">${p?'Adds to: '+esc(p.name):x.n.trim()?'New product will be created':'Type the item name'}</span></div>
 ${diff?`<label>Your stock is counted in ${esc(p.unit)}. 1 ${esc(x.u)} on this bill = how many ${esc(p.unit)}?</label><input data-i="${i}" data-f="mult" inputmode="decimal" value="${esc(x.mult)}" placeholder="Example 20">`:''}`;
}
function rowHTML(x,i){
 const f=`data-i="${i}" data-f`;
 return`<div class="lineitem"><div class="top2"><input ${f}="n" value="${esc(x.n)}" placeholder="Item name"><button class="x" data-rm="${i}" type="button" aria-label="Remove row">×</button></div>
 <div class="row3"><div><label>Qty</label><input ${f}="q" inputmode="decimal" value="${esc(x.q)}"></div><div><label>Unit</label><input ${f}="u" value="${esc(x.u)}" placeholder="bag"></div><div><label>Rate ₹</label><input ${f}="r" inputmode="decimal" value="${esc(x.r)}"></div></div>
 <div class="row3"><div><label>GST %</label><input ${f}="g" inputmode="decimal" value="${esc(x.g)}"></div><div><label>HSN</label><input ${f}="h" value="${esc(x.h)}" placeholder="2523"></div><div><label>Sell at ₹</label><input ${f}="sell" inputmode="decimal" value="${esc(x.sell)}" placeholder="optional"></div></div>
 <div data-meta="${i}">${meta(x,i)}</div>
 <div class="mute" style="margin-top:6px;font-size:12.5px" data-amt="${i}"></div></div>`;
}
const lineCalc=(x)=>calcLine({qty:x.q,rate:x.r,gst:x.g,incl:draft.incl,disc:0});
function totalsHTML(){
 let sub=0,tax=0;draft.lines.forEach(x=>{const c=lineCalc(x);sub+=c.tx;tax+=c.tax});sub=r2(sub);tax=r2(tax);
 const other=num(draft.other);
 return`<div class="total"><span>Taxable value</span><b>${inr(sub)}</b></div><div class="total"><span>GST</span><b>${inr(tax)}</b></div>${other?`<div class="total"><span>Other charges</span><b>${inr(other)}</b></div>`:''}<div class="total big"><span>Bill total</span><span>${inr(r2(sub+tax+other))}</span></div>`;
}
function amts(){draft.lines.forEach((x,i)=>{const el=$('[data-amt="'+i+'"]');if(!el)return;const c=lineCalc(x);el.textContent=num(x.q)&&num(x.r)?'Line: '+inr(c.tx)+' + GST '+inr(c.tax)+' = '+inr(c.total):''})}
function form(){
 const d=draft;
 root.innerHTML=`<button class="link" id="x" type="button">← Cancel</button><h1>Supplier bill</h1>${d.fname?`<p class="mute">From ${esc(d.fname)}. Check every row. Stock changes only when you press Save.</p>`:''}
 ${d.note?`<div class="card" style="border-color:var(--amb)">${esc(d.note)}</div>`:''}
 <div class="card"><label style="margin-top:0">Supplier name</label><input id="b-s" value="${esc(d.supplier)}" placeholder="Supplier / company">
 <div class="row2"><div><label>Supplier GSTIN</label><input id="b-g" value="${esc(d.gstin)}" maxlength="15" autocapitalize="characters"></div><div><label>Bill number</label><input id="b-n" value="${esc(d.no)}"></div></div>
 <label>Bill date</label><input type="date" id="b-d" value="${d.date}">
 <label>Rates on this bill</label><select id="b-i"><option value="0" ${d.incl?'':'selected'}>Without GST (GST is added on top)</option><option value="1" ${d.incl?'selected':''}>Already include GST</option></select></div>
 <div id="rows">${d.lines.map(rowHTML).join('')}</div>
 <button class="btn ghost" id="add" type="button">+ Add another item</button>
 <div class="card" style="margin-top:12px"><label style="margin-top:0">Freight / other charges ₹ (minus for a discount)</label><input id="b-o" inputmode="decimal" value="${esc(d.other)}"><div id="tot" style="margin-top:8px"></div>
 <div class="msg" id="b-m"></div><button class="btn" id="save" type="button">Save bill and add to stock</button></div>`;
 const refresh=()=>{$('#tot').innerHTML=totalsHTML();amts()};refresh();
 $('#x').onclick=()=>{view='list';draw()};
 $('#add').onclick=()=>{d.lines.push(blankLine());$('#rows').innerHTML=d.lines.map(rowHTML).join('');refresh()};
 root.oninput=e=>{const t=e.target,i=t.dataset.i;
  if(t.dataset.f){d.lines[i][t.dataset.f]=t.value;refresh()}
  else if(t.id==='b-s')d.supplier=t.value;else if(t.id==='b-g')d.gstin=t.value;else if(t.id==='b-n')d.no=t.value;else if(t.id==='b-d')d.date=t.value;else if(t.id==='b-o'){d.other=t.value;refresh()}};
 root.onchange=e=>{const t=e.target;
  if(t.id==='b-i'){d.incl=t.value==='1';refresh()}
  else if(t.dataset.f==='n'||t.dataset.f==='u'){const i=t.dataset.i,x=d.lines[i];
   if(t.dataset.f==='n'){const p=matchProduct(x.n);
    const set=(k,v)=>{x[k]=v;const el=$('[data-i="'+i+'"][data-f="'+k+'"]');if(el)el.value=v};
    if(p){if(!x.h&&p.hsn)set('h',p.hsn);if(!x.u)set('u',p.unit)}else if(!x.h){const g=hsnGuess(x.n);if(g){set('h',g.hsn);set('g',String(g.gst))}}}
   $('[data-meta="'+i+'"]').innerHTML=meta(x,i);refresh()}};
 root.onclick=e=>{const t=e.target;
  if(t.dataset.rm!==undefined){d.lines.splice(+t.dataset.rm,1);if(!d.lines.length)d.lines.push(blankLine());$('#rows').innerHTML=d.lines.map(rowHTML).join('');refresh()}
  else if(t.id==='save')apply()};
}
function apply(){
 const d=draft,m=$('#b-m');m.className='msg';
 if(!d.supplier.trim())return m.textContent='Enter the supplier name.';
 if(!d.date)return m.textContent='Choose the bill date.';
 if(d.gstin.trim()&&!gstinOk(d.gstin))return m.textContent='The supplier GSTIN does not look right (15 letters and numbers). Fix it or clear it.';
 const use=d.lines.filter(x=>x.n.trim()||num(x.q)||num(x.r));
 if(!use.length)return m.textContent='Add at least one item.';
 for(const x of use){
  if(!x.n.trim())return m.textContent='An item has no name.';
  if(!(num(x.q)>0))return m.textContent='Enter the quantity for "'+x.n+'".';
  if(!(num(x.r)>=0)||String(x.r).trim()==='')return m.textContent='Enter the rate for "'+x.n+'".';
  if(!x.u.trim()&&!matchProduct(x.n))return m.textContent='Enter the unit for "'+x.n+'" (bag, kg, pcs…).';
  const p=matchProduct(x.n);if(p&&x.u&&!sameUnit(p.unit,x.u)&&!(num(x.mult)>0))return m.textContent='Say how many '+p.unit+' make 1 '+x.u+' for "'+x.n+'".';
 }
 const out=[];let sub=0,tax=0,made=0;
 use.forEach(x=>{
  let p=matchProduct(x.n);const c=lineCalc(x);
  const k=p&&x.u&&!sameUnit(p.unit,x.u)?num(x.mult):1;
  if(!p){p={id:uid(),name:x.n.trim(),unit:x.u.trim(),hsn:x.h.trim(),gst:num(x.g),rate:0,incl:false,cost:0,stock:0,low:0};db.products.push(p);made++}
  if(x.h.trim())p.hsn=x.h.trim();
  if(String(x.g).trim()!=='')p.gst=num(x.g);
  if(num(x.sell)>0)p.rate=num(x.sell);
  const q=num(x.q)*k;
  addStock(p,q,c.exRate/k,'Bill '+(d.no||'')+' '+d.supplier.trim());
  sub+=c.tx;tax+=c.tax;
  out.push({pid:p.id,name:x.n.trim(),hsn:x.h.trim(),unit:x.u.trim()||p.unit,qty:num(x.q),rate:num(x.r),gst:num(x.g),mult:k,tx:c.tx,tax:c.tax,total:c.total});
 });
 sub=r2(sub);tax=r2(tax);const other=num(d.other);
 db.purchases.push({id:uid(),ts:Date.now(),date:d.date,supplier:d.supplier.trim(),gstin:d.gstin.trim().toUpperCase(),no:d.no.trim(),incl:d.incl,other,lines:out,sub,tax,total:r2(sub+tax+other)});
 save();toast('Stock updated');
 const noPrice=out.filter(o=>{const p=db.products.find(z=>z.id===o.pid);return p&&!(p.rate>0)}).length;
 msg=use.length+' items added to stock'+(made?', '+made+' of them new':'')+'.'+(noPrice?' '+noPrice+' product(s) have no selling price yet: open the Stock tab and set it before invoicing.':'');
 view='list';draft=null;list();
 root.insertAdjacentHTML('afterbegin','<div class="card" style="border-color:var(--g2)"><b class="ok">Saved.</b> '+esc(msg)+'</div>');
}
function open(){
 const p=db.purchases.find(x=>x.id===openId);if(!p){view='list';return list()}
 root.innerHTML=`<button class="link" id="b" type="button">← All bills</button><h1 style="margin-top:0">${esc(p.supplier)}</h1><div class="mute">${dmy(p.date)}${p.no?' · Bill '+esc(p.no):''}${p.gstin?' · GSTIN '+esc(p.gstin):''}</div>
 <div class="card" style="margin-top:12px;padding:10px 12px"><div class="scroll"><table class="tbl"><thead><tr><th>Item</th><th class="n">Qty</th><th class="n">Rate</th><th class="n">GST</th><th class="n">Amount</th></tr></thead><tbody>${p.lines.map(l=>`<tr><td>${esc(l.name)}<br><small class="mute">${l.hsn?'HSN '+esc(l.hsn):''}</small></td><td class="n">${fmt(l.qty)} ${esc(l.unit)}</td><td class="n">${inr(l.rate)}</td><td class="n">${l.gst}%</td><td class="n">${inr(l.total)}</td></tr>`).join('')}</tbody></table></div>
 <div class="total"><span>Taxable value</span><b>${inr(p.sub)}</b></div><div class="total"><span>GST</span><b>${inr(p.tax)}</b></div>${p.other?`<div class="total"><span>Other charges</span><b>${inr(p.other)}</b></div>`:''}<div class="total big"><span>Bill total</span><span>${inr(p.total)}</span></div></div>
 <button class="btn red" id="del" type="button">Delete this bill</button><p class="mute"><small>Deleting takes these quantities back out of stock. The average buying price is not changed.</small></p>`;
 $('#b').onclick=()=>{view='list';list()};
 $('#del').onclick=e=>{if(!e.target.dataset.a){e.target.dataset.a=1;e.target.textContent='Tap again to delete';return}
  p.lines.forEach(l=>{const pr=db.products.find(z=>z.id===l.pid);if(pr){const q=l.qty*(l.mult||1);pr.stock=Math.round((pr.stock-q)*1000)/1000;note(pr,-q,'adjust','Bill '+(p.no||'')+' deleted')}});
  db.purchases=db.purchases.filter(z=>z!==p);save();view='list';list()};
}
