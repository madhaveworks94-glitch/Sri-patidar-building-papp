// Section 2 / Stock tab: products and how many are in stock.
import {db,save} from './store.js';
import {esc,num,fmt,inr,uid,dmy,today,hsnGuess,toast} from './util.js';
let root,sel=null,edit=null,q='',flt='all',msg='';
const $=s=>root.querySelector(s);
const r3=n=>Math.round((n+Number.EPSILON)*1000)/1000;
export const low=p=>p.low>0&&p.stock<=p.low;
export function note(p,qty,type,txt,cost){db.log.push({id:uid(),pid:p.id,qty,type,note:txt||'',cost:cost||0,date:today(),ts:Date.now()})}
// Put stock in. c = buying price per unit WITHOUT GST; cost becomes the weighted average.
export function addStock(p,qty,c,txt){
 const old=Math.max(p.stock,0);
 if(c>0)p.cost=Math.round(((old+qty)>0?(old*(p.cost||0)+qty*c)/(old+qty):c)*10000)/10000;
 p.stock=r3(p.stock+qty);note(p,qty,'in',txt,c);
}
export function takeStock(p,qty,txt){p.stock=r3(p.stock-qty);note(p,-qty,'out',txt,0)}
const words=s=>new Set(String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter(w=>w.length>1));
export function matchProduct(name){
 const t=String(name||'').trim().toLowerCase();if(!t)return null;
 const exact=db.products.find(p=>p.name.toLowerCase()===t);if(exact)return exact;
 const a=words(name);if(!a.size)return null;let best=null,bs=0;
 db.products.forEach(p=>{const b=words(p.name);let n=0;a.forEach(w=>{if(b.has(w))n++});const s=n/Math.max(a.size,b.size||1);if(s>bs){bs=s;best=p}});
 return bs>=0.75?best:null;
}
export const priceTxt=p=>inr(p.rate)+' / '+esc(p.unit)+(p.incl?' (with GST)':' + GST');
export function mount(r){root=r;sel=null;edit=null;msg='';draw()}
const draw=()=>edit?form():sel?detail():list();

function list(){
 const items=db.products.filter(p=>(!q||p.name.toLowerCase().includes(q.toLowerCase()))&&(flt==='all'||(flt==='low'&&low(p))||(flt==='out'&&p.stock<=0)));
 const val=db.products.reduce((s,p)=>s+Math.max(p.stock,0)*(p.cost||0),0),nl=db.products.filter(low).length;
 root.innerHTML=`<div class="row2" style="margin-bottom:12px"><div class="kpi"><h3>Products</h3><div class="num">${db.products.length}</div><small class="mute">${nl} low on stock</small></div><div class="kpi"><h3>Stock worth (buying)</h3><div class="num" style="font-size:20px">${inr(Math.round(val))}</div></div></div>
 <div class="seg"><button data-f="all" class="${flt==='all'?'on':''}">All</button><button data-f="low" class="${flt==='low'?'on':''}">Low stock</button><button data-f="out" class="${flt==='out'?'on':''}">Out of stock</button></div>
 <input id="q" value="${esc(q)}" placeholder="Search product" style="margin-bottom:10px">
 ${items.length?items.map(p=>`<button class="item" data-p="${p.id}" type="button"><span><b>${esc(p.name)}</b><br><small class="mute">HSN ${esc(p.hsn||'–')} · GST ${p.gst}%</small></span><span class="r"><b class="${p.stock<=0?'bad':low(p)?'bad':''}">${fmt(p.stock)} ${esc(p.unit)}</b><br><small class="mute">${priceTxt(p)}</small></span></button>`).join(''):`<p class="empty">${db.products.length?'No products match.':'No products yet. Add one, or add a supplier bill in the Purchases tab and the stock fills in by itself.'}</p>`}
 <button class="btn" id="new" type="button">+ Add product</button>`;
 $('#q').oninput=e=>{q=e.target.value;const p=e.target.selectionStart;list();const i=$('#q');i.focus();try{i.setSelectionRange(p,p)}catch(x){}};
 root.onclick=e=>{const t=e.target,p=t.closest('[data-p]');
  if(t.dataset.f){flt=t.dataset.f;list()}else if(p){sel=p.dataset.p;msg='';draw()}else if(t.id==='new'){edit='new';draw()}};
}

function form(){
 const n=edit==='new',p=n?{name:'',unit:'',hsn:'',gst:18,rate:'',incl:false,cost:'',low:'',stock:''}:db.products.find(x=>x.id===edit);
 const f=(id,l,v,ph,m)=>`<label>${l}</label><input id="${id}" value="${esc(v==null?'':v)}" placeholder="${ph||''}" ${m?'inputmode="decimal"':''}>`;
 root.innerHTML=`<button class="link" id="x" type="button">← Back</button><h1>${n?'Add product':'Edit product'}</h1><div class="card">
 ${f('f-n','Product name',p.name,'Cement PPC 50 kg')}
 <label>Unit (what you count)</label><input id="f-u" list="units" value="${esc(p.unit)}" placeholder="bag, kg, pcs, ton, cft" autocomplete="off"><datalist id="units">${['bag','kg','pcs','ton','quintal','cft','sq.ft','meter','ltr','box','bundle','roll','nos','trolley'].map(u=>`<option value="${u}">`).join('')}</datalist>
 ${f('f-h','HSN code (for the GST invoice)',p.hsn,'2523')}<div class="mute" id="f-hint" style="font-size:12.5px;margin-top:4px"></div>
 <label>GST %</label><select id="f-g">${[0,5,12,18,28].map(g=>`<option ${num(p.gst)===g?'selected':''}>${g}</option>`).join('')}</select>
 ${f('f-r','Selling price per unit (₹)',p.rate,'335',1)}
 <label>Selling price is</label><select id="f-i"><option value="0" ${p.incl?'':'selected'}>Without GST (GST added on top)</option><option value="1" ${p.incl?'selected':''}>With GST included</option></select>
 ${f('f-c','Buying price per unit, without GST (₹)',p.cost>0?p.cost:'','Only to know your stock value',1)}
 ${f('f-l','Low stock alert at',p.low,'20',1)}${n?f('f-s','Opening stock now','','0',1):''}
 <div class="msg" id="f-m"></div><button class="btn" id="f-save" type="button">Save product</button></div>`;
 const hint=()=>{const nm=$('#f-n').value,h=$('#f-h'),g=hsnGuess(nm);
  if(g&&!h.value.trim()){h.value=g.hsn;$('#f-g').value=String(g.gst);$('#f-hint').textContent='HSN '+g.hsn+' and GST '+g.gst+'% suggested from the name. Please check them.'}};
 $('#f-n').onblur=()=>{if(n)hint()};
 $('#x').onclick=()=>{edit=null;draw()};
 $('#f-save').onclick=()=>{const name=$('#f-n').value.trim(),unit=$('#f-u').value.trim(),m=$('#f-m');
  if(!name||!unit)return m.textContent='Enter the product name and its unit.';
  if(db.products.some(x=>x!==p&&x.name.toLowerCase()===name.toLowerCase()))return m.textContent='A product with this name already exists.';
  const d={name,unit,hsn:$('#f-h').value.trim(),gst:num($('#f-g').value),rate:num($('#f-r').value),incl:$('#f-i').value==='1',cost:num($('#f-c').value),low:num($('#f-l').value)};
  if(d.rate<0||d.cost<0)return m.textContent='Prices cannot be negative.';
  if(n){const np={id:uid(),stock:0,...d};db.products.push(np);const s=num($('#f-s').value);if(s>0)addStock(np,s,d.cost,'Opening stock');sel=np.id}
  else Object.assign(p,d);
  save();edit=null;msg='Saved.';draw()};
}

function detail(){
 const p=db.products.find(x=>x.id===sel);if(!p){sel=null;return list()}
 const h=db.log.filter(x=>x.pid===p.id).sort((a,b)=>b.ts-a.ts).slice(0,10);
 root.innerHTML=`<button class="link" id="back" type="button">← All products</button><h1 style="margin-top:0">${esc(p.name)}</h1>
 <div class="mute">HSN ${esc(p.hsn||'not set')} · GST ${p.gst}%${p.cost>0?' · bought at '+inr(p.cost)+' (no GST)':''}</div>
 <div class="card hero" style="margin-top:12px"><h3>In stock</h3><div class="num">${fmt(p.stock)} ${esc(p.unit)}</div>${low(p)?'<div>Low stock, time to reorder.</div>':''}</div>
 <div class="card"><h3>Selling price</h3><div class="row2"><div><label style="margin-top:0">Price per ${esc(p.unit)} (₹)</label><input id="pr" inputmode="decimal" value="${p.rate}"></div><div><label style="margin-top:0">Price is</label><select id="pi"><option value="0" ${p.incl?'':'selected'}>Without GST</option><option value="1" ${p.incl?'selected':''}>With GST</option></select></div></div><button class="btn soft" id="pr-s" type="button">Update price</button></div>
 <div class="card"><h3>Change stock</h3><div class="btns"><button class="btn" id="d-in" type="button">Add stock</button><button class="btn ghost" id="d-adj" type="button">Count / fix</button></div><div id="panel"></div><div class="msg ok">${esc(msg)}</div></div>
 <h2>Recent stock changes</h2><div class="card">${h.length?h.map(x=>`<div class="line"><span><b>${x.type==='in'?'Stock added':x.type==='out'?'Sold on invoice':'Count fixed'}</b><br><small class="mute">${dmy(x.date)}${x.note?' · '+esc(x.note):''}</small></span><b class="${x.qty>=0?'ok':'bad'}">${x.qty>=0?'+':''}${fmt(x.qty)} ${esc(p.unit)}</b></div>`).join(''):'<p class="mute" style="margin:0">Nothing yet.</p>'}</div>
 <div class="btns"><button class="btn ghost" id="d-edit" type="button">Edit product</button><button class="btn red" id="d-del" type="button">Delete</button></div>`;
 $('#back').onclick=()=>{sel=null;msg='';list()};
 $('#d-edit').onclick=()=>{edit=p.id;draw()};
 $('#d-del').onclick=e=>{if(e.target.dataset.a){db.products=db.products.filter(x=>x!==p);save();sel=null;list()}else{e.target.dataset.a=1;e.target.textContent='Tap again to delete'}};
 $('#pr-s').onclick=()=>{const v=num($('#pr').value);if(!(v>=0)||$('#pr').value.trim()==='')return toast('Enter the price',true);p.rate=v;p.incl=$('#pi').value==='1';save();msg='Price updated.';toast('Price updated');detail()};
 $('#d-in').onclick=()=>{$('#panel').innerHTML=`<label>Quantity received (${esc(p.unit)})</label><input id="i-q" inputmode="decimal"><label>Buying price per ${esc(p.unit)}, without GST (optional)</label><input id="i-c" inputmode="decimal"><div class="msg" id="i-m"></div><button class="btn" id="i-s" type="button">Save stock</button>`;
  $('#i-s').onclick=()=>{const k=num($('#i-q').value);if(!(k>0))return $('#i-m').textContent='Enter a quantity.';addStock(p,k,num($('#i-c').value),'Added by hand');save();msg='Added '+fmt(k)+' '+p.unit+'.';detail()}};
 $('#d-adj').onclick=()=>{$('#panel').innerHTML=`<label>Actual count now (${esc(p.unit)})</label><input id="a-q" inputmode="decimal" value="${fmt(p.stock)}"><label>Reason (optional)</label><input id="a-n" placeholder="Damaged, counted, returned"><div class="msg" id="a-m"></div><button class="btn" id="a-s" type="button">Save count</button>`;
  $('#a-s').onclick=()=>{const raw=$('#a-q').value.trim();if(raw===''||!/^-?[\d.]+$/.test(raw))return $('#a-m').textContent='Enter the count.';const v=num(raw),d=r3(v-p.stock);if(d!==0){p.stock=r3(v);note(p,d,'adjust',$('#a-n').value.trim());save()}msg='Stock updated.';detail()}};
}
