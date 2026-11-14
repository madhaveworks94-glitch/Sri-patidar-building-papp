// Section 2: Invoices (GST tax invoices), Stock and supplier Purchases. Works on its own; Sections 1 and 3 never read it.
import {db,save} from './store.js';
import {esc,num,fmt,inr,r2,uid,today,dmy,fy,stateOpts,stateName,toast} from './util.js';
import {calcDoc,gstinOk} from './invcalc.js';
import {takeStock,addStock,low} from './stock.js';
import {invoiceHTML,invoicePdf,bal} from './invdoc.js';
let host,tab='inv';
export function mount(r){
 host=r;
 r.innerHTML=`<h1>Invoices</h1><p class="sub">GST tax invoices, stock and supplier bills.</p><div class="seg" id="tabs"><button data-t="inv">Invoices</button><button data-t="stock">Stock</button><button data-t="buy">Purchases</button></div><div id="sub"></div>`;
 const go=async t=>{tab=t;r.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));const sub=r.querySelector('#sub');sub.onclick=sub.oninput=sub.onchange=null;sub.innerHTML='';
  if(t==='inv')mountInv(sub);else if(t==='stock')(await import('./stock.js')).mount(sub);else(await import('./purchases.js')).mount(sub)};
 r.querySelector('#tabs').onclick=e=>{const b=e.target.closest('button');if(b)go(b.dataset.t)};
 go(tab);
}
export const openStockTab=()=>{if(host){tab='stock';mount(host)}};

// ---------- invoice list, maker, view ----------
let root,view='list',draft=null,openId=null,q='',flt='all';
const $=s=>root.querySelector(s);
function mountInv(r){root=r;view='list';draft=null;openId=null;draw()}
const draw=()=>view==='new'?maker():view==='open'?show():list();
const status=i=>i.cancelled?'<span class="pill red">Cancelled</span>':bal(i)>0?`<span class="pill warn">Due ${inr(bal(i))}</span>`:'<span class="pill">Paid</span>';

function list(){
 const all=[...db.invoices].sort((a,b)=>b.ts-a.ts),m=today().slice(0,7);
 const billed=all.filter(i=>!i.cancelled&&i.date.startsWith(m)),due=all.filter(i=>!i.cancelled&&bal(i)>0);
 const items=all.filter(i=>(!q||(i.no+' '+i.cust.name+' '+i.cust.phone).toLowerCase().includes(q.toLowerCase()))&&(flt==='all'||(flt==='due'&&!i.cancelled&&bal(i)>0)));
 root.innerHTML=`<button class="btn" id="new" type="button" style="margin-top:0">+ New GST invoice</button>
 <div class="row2" style="margin:12px 0"><div class="kpi"><h3>Invoiced this month</h3><div class="num" style="font-size:20px">${inr(r2(billed.reduce((a,i)=>a+i.total,0)))}</div><small class="mute">${billed.length} invoices</small></div><div class="kpi"><h3>Customers owe</h3><div class="num" style="font-size:20px">${inr(r2(due.reduce((a,i)=>a+bal(i),0)))}</div><small class="mute">${due.length} invoices</small></div></div>
 <div class="seg"><button data-f="all" class="${flt==='all'?'on':''}">All invoices</button><button data-f="due" class="${flt==='due'?'on':''}">Payment due</button></div>
 <input id="q" value="${esc(q)}" placeholder="Search invoice number or customer" style="margin-bottom:10px">
 ${items.length?items.map(i=>`<button class="item" data-o="${i.id}" type="button"><span><b>${esc(i.cust.name)}</b><br><small class="mute">${esc(i.no)} · ${dmy(i.date)}</small></span><span class="r"><b style="${i.cancelled?'text-decoration:line-through':''}">${inr(i.total)}</b><br>${status(i)}</span></button>`).join(''):`<p class="empty">${db.invoices.length?'No invoices match.':'No invoices yet.'}</p>`}`;
 $('#q').oninput=e=>{q=e.target.value;const p=e.target.selectionStart;list();const i=$('#q');i.focus();try{i.setSelectionRange(p,p)}catch(x){}};
 root.onclick=e=>{const t=e.target,o=t.closest('[data-o]');
  if(t.dataset.f){flt=t.dataset.f;list()}
  else if(o){openId=o.dataset.o;view='open';draw()}
  else if(t.id==='new')start()};
}
function start(){
 const s=db.shop;
 if(!s.name||!s.gstin||!s.state||!s.addr){
  root.innerHTML=`<div class="card"><h3>One-time setup needed</h3><p>A GST tax invoice must carry your shop name, address, GSTIN and state. Add them in Settings first (the gear at the top).</p><a class="btn" href="#settings">Open settings</a><button class="btn ghost" id="b" type="button">Back</button></div>`;
  $('#b').onclick=list;return}
 draft={date:today(),cust:{name:'',phone:'',gstin:'',addr:'',pos:s.state},lines:[],pay:'full',paid:''};view='new';draw();
}

const stockOf=pid=>{const p=db.products.find(x=>x.id===pid);return p?p.stock:0};
const calc=()=>calcDoc(draft.lines.map(l=>({...l})),isInter());
const isInter=()=>!!(draft.cust.pos&&db.shop.state&&draft.cust.pos!==db.shop.state);
function lineHTML(l,i){const f=`data-i="${i}" data-f`;
 return`<div class="lineitem"><div class="top2"><span><b>${esc(l.name)}</b><br><small class="mute">HSN ${esc(l.hsn||'–')} · in stock: ${fmt(stockOf(l.pid))} ${esc(l.unit)}</small></span><button class="x" data-rm="${i}" type="button" aria-label="Remove">×</button></div>
 <div class="row3"><div><label>Qty (${esc(l.unit)})</label><input ${f}="qty" inputmode="decimal" value="${esc(l.qty)}"></div><div><label>Rate ₹</label><input ${f}="rate" inputmode="decimal" value="${esc(l.rate)}"></div><div><label>Disc %</label><input ${f}="disc" inputmode="decimal" value="${esc(l.disc)}" placeholder="0"></div></div>
 <div class="row2"><div><label>GST %</label><select ${f}="gst">${[0,5,12,18,28].map(g=>`<option ${num(l.gst)===g?'selected':''}>${g}</option>`).join('')}</select></div><div><label>Rate is</label><select ${f}="incl"><option value="0" ${l.incl?'':'selected'}>Without GST</option><option value="1" ${l.incl?'selected':''}>With GST</option></select></div></div>
 <div class="mute" style="margin-top:6px;font-size:12.5px" data-amt="${i}"></div></div>`}
function totalsHTML(){
 const D=calc(),paid=payAmt(D.total);
 return`<div class="total"><span>Taxable value</span><b>${inr(D.sub)}</b></div>${isInter()?`<div class="total"><span>IGST</span><b>${inr(D.igst)}</b></div>`:`<div class="total"><span>CGST</span><b>${inr(D.cgst)}</b></div><div class="total"><span>SGST</span><b>${inr(D.sgst)}</b></div>`}${D.round?`<div class="total"><span>Round off</span><b>${inr(D.round)}</b></div>`:''}<div class="total big"><span>Invoice total</span><span>${inr(D.total)}</span></div>${D.total?`<div class="total"><span>Balance due</span><b>${inr(Math.max(r2(D.total-paid),0))}</b></div>`:''}`}
const payAmt=t=>draft.pay==='full'?t:draft.pay==='none'?0:Math.min(num(draft.paid),t);
function maker(){
 const d=draft,c=d.cust,names=[...new Map(db.invoices.map(i=>[i.cust.name.toLowerCase(),i.cust.name])).values()];
 root.innerHTML=`<button class="link" id="x" type="button">← Cancel</button><h2 style="margin-top:0">New GST invoice</h2>
 <div class="card"><label style="margin-top:0">Customer name</label><input id="c-n" list="cn" value="${esc(c.name)}" placeholder="Customer or company" autocomplete="off"><datalist id="cn">${names.map(n=>`<option value="${esc(n)}">`).join('')}</datalist>
 <div class="row2"><div><label>Phone</label><input id="c-p" inputmode="tel" value="${esc(c.phone)}"></div><div><label>Customer GSTIN</label><input id="c-g" value="${esc(c.gstin)}" maxlength="15" autocapitalize="characters" placeholder="if they have one"></div></div>
 <label>Address</label><textarea id="c-a">${esc(c.addr)}</textarea>
 <label>Place of supply (customer's state)</label><select id="c-s">${stateOpts(c.pos)}</select>
 <label>Invoice date</label><input type="date" id="i-d" value="${d.date}"></div>
 <h2>Items</h2><div id="rows">${d.lines.map(lineHTML).join('')}</div>
 <button class="btn ghost" id="add" type="button" style="margin-top:0">+ Add item from stock</button>
 <div class="card" style="margin-top:12px"><div id="tot"></div>
 <label>Payment</label><select id="p-m"><option value="full" ${d.pay==='full'?'selected':''}>Paid in full</option><option value="part" ${d.pay==='part'?'selected':''}>Part paid</option><option value="none" ${d.pay==='none'?'selected':''}>Not paid yet (credit)</option></select>
 <div id="p-w" style="${d.pay==='part'?'':'display:none'}"><label>Amount received ₹</label><input id="p-a" inputmode="decimal" value="${esc(d.paid)}"></div>
 <div class="msg" id="m"></div><button class="btn" id="save" type="button">Create invoice</button></div>`;
 const refresh=()=>{const D=calc();$('#tot').innerHTML=totalsHTML();D.lines.forEach((l,i)=>{const e=$('[data-amt="'+i+'"]');if(e)e.textContent=num(l.qty)&&num(l.rate)?'Taxable '+inr(l.tx)+' + GST '+inr(l.tax)+' = '+inr(l.total):''})};refresh();
 $('#x').onclick=()=>{view='list';draw()};
 $('#add').onclick=pick;
 root.oninput=e=>{const t=e.target,id=t.id;
  if(t.dataset.f){d.lines[t.dataset.i][t.dataset.f]=t.value;refresh()}
  else if(id==='c-n'){c.name=t.value;const o=[...db.invoices].reverse().find(i=>i.cust.name.toLowerCase()===t.value.trim().toLowerCase());
   if(o&&!c.phone&&!c.gstin&&!c.addr){Object.assign(c,{phone:o.cust.phone,gstin:o.cust.gstin,addr:o.cust.addr,pos:o.cust.pos});const set=(k,v)=>{$(k).value=v||''};set('#c-p',c.phone);set('#c-g',c.gstin);set('#c-a',c.addr);$('#c-s').value=c.pos||'';refresh()}}
  else if(id==='c-p')c.phone=t.value;else if(id==='c-a')c.addr=t.value;else if(id==='i-d')d.date=t.value;else if(id==='p-a'){d.paid=t.value;refresh()}
  else if(id==='c-g'){c.gstin=t.value.toUpperCase();if(gstinOk(c.gstin)){c.pos=c.gstin.slice(0,2);$('#c-s').value=c.pos;refresh()}}};
 root.onchange=e=>{const t=e.target;
  if(t.dataset.f){d.lines[t.dataset.i][t.dataset.f]=t.dataset.f==='incl'?t.value==='1':t.value;refresh()}
  else if(t.id==='c-s'){c.pos=t.value;refresh()}
  else if(t.id==='p-m'){d.pay=t.value;$('#p-w').style.display=d.pay==='part'?'':'none';refresh()}};
 root.onclick=e=>{const t=e.target;
  if(t.dataset.rm!==undefined){d.lines.splice(+t.dataset.rm,1);$('#rows').innerHTML=d.lines.map(lineHTML).join('');refresh()}
  else if(t.id==='save')create()};
}
function pick(){
 const ov=document.createElement('div');ov.className='sheet';
 const inStock=db.products.filter(p=>p.stock>0);
 ov.innerHTML=`<div><h2>Choose from stock</h2>${db.products.length?`<input id="pq" placeholder="Search product"><div id="pl" style="margin-top:10px"></div>`:'<p class="empty">No products yet. Add stock first.</p>'}<button class="btn ghost" id="pc" type="button">Close</button></div>`;
 document.body.appendChild(ov);
 const close=()=>ov.remove(),L=ov.querySelector('#pl');
 const fill=()=>{if(!L)return;const t=ov.querySelector('#pq').value.toLowerCase(),a=inStock.filter(p=>p.name.toLowerCase().includes(t));
  L.innerHTML=a.length?a.map(p=>`<button class="item" data-p="${p.id}" type="button"><span><b>${esc(p.name)}</b><br><small class="mute">${fmt(p.stock)} ${esc(p.unit)} in stock</small></span><span class="r">${inr(p.rate)}<br><small class="mute">${p.incl?'with GST':'+ GST'}</small></span></button>`).join(''):`<p class="empty">${inStock.length?'Nothing matches.':'Nothing is in stock. Add stock in the Stock or Purchases tab.'}</p>`};
 fill();if(L)ov.querySelector('#pq').oninput=fill;
 ov.onclick=e=>{if(e.target===ov||e.target.id==='pc')return close();const b=e.target.closest('[data-p]');if(!b)return;
  const p=db.products.find(x=>x.id===b.dataset.p);close();if(!p)return;
  const ex=draft.lines.find(l=>l.pid===p.id);
  if(ex)ex.qty=String(num(ex.qty)+1);else draft.lines.push({pid:p.id,name:p.name,hsn:p.hsn||'',unit:p.unit,qty:'1',rate:String(p.rate||''),incl:!!p.incl,disc:'',gst:p.gst});
  maker()};
}
function create(){
 const d=draft,c=d.cust,m=$('#m');m.className='msg';const D=calc();
 if(!c.name.trim())return m.textContent='Enter the customer name.';
 if(c.gstin.trim()&&!gstinOk(c.gstin))return m.textContent='The customer GSTIN does not look right (15 letters and numbers). Fix it or clear it.';
 if(!c.pos)return m.textContent='Choose the place of supply.';
 if(!d.date)return m.textContent='Choose the invoice date.';
 if(!d.lines.length)return m.textContent='Add at least one item.';
 const need={};
 for(const l of d.lines){
  if(!(num(l.qty)>0))return m.textContent='Enter the quantity for "'+l.name+'".';
  if(!(num(l.rate)>0))return m.textContent='Enter the rate for "'+l.name+'".';
  if(num(l.disc)<0||num(l.disc)>100)return m.textContent='Discount must be between 0 and 100.';
  if(!db.products.find(p=>p.id===l.pid))return m.textContent='"'+l.name+'" was removed from stock. Remove this row.';
  need[l.pid]=(need[l.pid]||0)+num(l.qty)}
 for(const pid of Object.keys(need)){const p=db.products.find(x=>x.id===pid);if(need[pid]>p.stock+1e-9)return m.textContent='Only '+fmt(p.stock)+' '+p.unit+' of "'+p.name+'" in stock.'}
 if(d.pay==='part'&&!(num(d.paid)>=0&&d.paid.trim()!==''))return m.textContent='Enter the amount received.';
 const paid=r2(payAmt(D.total));
 const y=fy(d.date),n=(db.seq[y]||0)+1;db.seq[y]=n;
 const no='INV/'+y+'/'+String(n).padStart(4,'0'),s=db.shop;
 const inv={id:uid(),ts:Date.now(),no,date:d.date,cust:{name:c.name.trim(),phone:c.phone.trim(),gstin:c.gstin.trim().toUpperCase(),addr:c.addr.trim(),pos:c.pos},
  sup:{name:s.name,gstin:s.gstin,addr:s.addr,phone:s.phone,state:s.state,bank:s.bank,terms:s.terms},inter:isInter(),
  lines:D.lines.map(l=>({pid:l.pid,name:l.name,hsn:l.hsn,unit:l.unit,qty:num(l.qty),rate:num(l.rate),incl:!!l.incl,disc:num(l.disc),gst:num(l.gst),exRate:r2(l.exRate),gross:l.gross,tx:l.tx,tax:l.tax,total:l.total})),
  sub:D.sub,tax:D.tax,cgst:D.cgst,sgst:D.sgst,igst:D.igst,round:D.round,total:D.total,rates:D.rates,paid,cancelled:false};
 inv.lines.forEach(l=>{const p=db.products.find(x=>x.id===l.pid);takeStock(p,l.qty,'Invoice '+no)});
 db.invoices.push(inv);save();toast('Invoice '+no+' created');
 openId=inv.id;view='open';draft=null;draw();
}
function show(){
 const i=db.invoices.find(x=>x.id===openId);if(!i){view='list';return list()}
 root.innerHTML=`<button class="link" id="b" type="button">← All invoices</button>
 ${i.cancelled?'<div class="card" style="border-color:var(--bad)"><b class="bad">This invoice is cancelled.</b> Its stock was put back.</div>':''}
 ${invoiceHTML(i)}
 <div class="msg" id="m"></div>
 ${i.cancelled?'':`<button class="btn" id="pdf" type="button">Download / share PDF</button>
 ${bal(i)>0?`<div class="card" style="margin-top:12px"><h3>Payment received</h3><label style="margin-top:0">Amount ₹ (due ${inr(bal(i))})</label><input id="pa" inputmode="decimal"><button class="btn soft" id="pay" type="button">Save payment</button></div>`:''}
 <button class="btn red" id="cx" type="button">Cancel this invoice</button><p class="mute"><small>Cancelling keeps the invoice number in the list and puts the items back into stock.</small></p>`}`;
 $('#b').onclick=()=>{view='list';list()};
 const pdf=$('#pdf');if(pdf)pdf.onclick=async()=>{const m=$('#m');m.className='msg';m.textContent='Making the PDF…';pdf.disabled=true;
  try{await invoicePdf(i);m.className='msg ok';m.textContent='PDF ready.'}catch(x){m.className='msg';m.textContent=x&&x.message==='offline'?'The PDF tool needs internet the first time. Connect and try again.':'Could not make the PDF.'}pdf.disabled=false};
 const pay=$('#pay');if(pay)pay.onclick=()=>{const v=num($('#pa').value);if(!(v>0))return toast('Enter the amount',true);i.paid=r2(Math.min(i.total,i.paid+v));save();toast('Payment saved');show()};
 const cx=$('#cx');if(cx)cx.onclick=()=>{if(!cx.dataset.a){cx.dataset.a=1;cx.textContent='Tap again to cancel the invoice';return}
  i.lines.forEach(l=>{const p=db.products.find(x=>x.id===l.pid);if(p)addStock(p,l.qty,0,'Invoice '+i.no+' cancelled')});
  i.cancelled=true;save();show()};
}
