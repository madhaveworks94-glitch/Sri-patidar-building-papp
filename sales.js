import {db,save} from './store.js';
import {esc,num,r2,inr,uid,today,addDays,nice,dmy,monthStart,monthEnd,toast} from './util.js';
import {salesOn,spendsOn,allTags,cleanTag,summary} from './calc.js';
import {ledgerPdf} from './ledgerpdf.js';
let root,date=today(),editId=null,from='',to='',manual=false;
const $=s=>root.querySelector(s);
export function mount(r){root=r;if(!manual){from=monthStart(date);to=monthEnd(date)}
 root.innerHTML=`<h1>Sales & Ledger</h1><p class="sub">Enter the whole day's sales and what you spent.</p>
 <div class="datebar"><button id="d-p" type="button" aria-label="Previous day">‹</button><input type="date" id="d-in"><button id="d-n" type="button" aria-label="Next day">›</button></div>
 <div id="day"></div><div id="led"></div>`;
 $('#d-in').value=date;
 const go=d=>{if(!d)return;date=d;editId=null;if(!manual){from=monthStart(date);to=monthEnd(date)}$('#d-in').value=date;day();ledger()};
 $('#d-in').onchange=e=>go(e.target.value);
 $('#d-p').onclick=()=>go(addDays(date,-1));$('#d-n').onclick=()=>go(addDays(date,1));
 root.onclick=e=>{const t=e.target.closest('[data-a]');if(!t)return;const a=t.dataset.a;
  if(a==='jump'){go(t.dataset.d);window.scrollTo(0,0)}
  else if(a==='today')go(today())};
 day();ledger();
}
function day(){
 const el=$('#day'),s=salesOn(date),sp=spendsOn(date),tot=r2(sp.reduce((a,x)=>a+x.amt,0)),net=r2((s||0)-tot);
 el.innerHTML=`<div class="card hero"><h3>${esc(nice(date))}${date===today()?' · Today':''}</h3>
  <div class="num">${s===null?'No sales entered':inr(s)}</div>
  <div style="opacity:.9;margin-top:4px">Spent ${inr(tot)} · Day profit ${inr(net)}</div></div>
 <div class="card"><h3>Total sales for this day</h3>
  <label style="margin-top:0">Whole day sales (₹)</label><input id="s-v" inputmode="decimal" placeholder="Example 45000" value="${s===null?'':s}">
  <div class="msg" id="s-m"></div>
  <div class="btns"><button class="btn" id="s-save" type="button">${s===null?'Save sales':'Update sales'}</button>${s===null?'':'<button class="btn red" id="s-del" type="button" style="width:auto;flex:none">Remove</button>'}</div></div>
 <div class="card"><h3>Spends on this day</h3>
  ${sp.length?sp.map(x=>x.id===editId?editRow(x):`<div class="line"><span><b>${esc(x.tag)}</b></span><span style="display:flex;align-items:center;gap:8px"><b>${inr(x.amt)}</b><button class="btn sm soft" data-e="${x.id}" type="button">Edit</button></span></div>`).join(''):'<p class="mute" style="margin:0 0 6px">No spends added for this day.</p>'}
  <label>Spent on (type a name)</label><input id="p-t" list="tags" placeholder="Labour, Rent, Fuel, Tea…" autocomplete="off"><datalist id="tags">${allTags().map(t=>`<option value="${esc(t)}">`).join('')}</datalist>
  <label>Amount (₹)</label><input id="p-a" inputmode="decimal" placeholder="500">
  <div class="msg" id="p-m"></div><button class="btn" id="p-add" type="button">Add spend</button></div>`;
 const msg=(id,t,ok)=>{const m=$(id);m.className='msg'+(ok?' ok':'');m.textContent=t};
 $('#s-save').onclick=()=>{const raw=$('#s-v').value.trim(),v=num(raw);
  if(!raw||!/^[\d,]*\.?\d*$/.test(raw))return msg('#s-m','Enter the sales total as a number.');
  if(v<0)return msg('#s-m','Sales cannot be negative.');
  db.days[date]={sales:r2(v)};save();toast('Sales saved');day();ledger()};
 const dl=$('#s-del');if(dl)dl.onclick=()=>{if(!confirm('Remove the sales total for this day?'))return;delete db.days[date];save();day();ledger()};
 $('#p-add').onclick=()=>{const t=cleanTag($('#p-t').value),raw=$('#p-a').value.trim(),a=num(raw);
  if(!t)return msg('#p-m','Type what the money was spent on.');
  if(!raw||!/^[\d,]*\.?\d*$/.test(raw)||!(a>0))return msg('#p-m','Enter the amount spent.');
  const old=allTags().find(x=>x.toLowerCase()===t.toLowerCase());
  db.spends.push({id:uid(),date,tag:old||t,amt:r2(a)});save();toast('Spend added');day();ledger()};
 el.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{editId=b.dataset.e;day()});
 const sv=el.querySelector('[data-es]');if(sv)sv.onclick=()=>{const x=db.spends.find(z=>z.id===sv.dataset.es),t=cleanTag($('#e-t').value),a=num($('#e-a').value);
  if(!x||!t||!(a>0))return toast('Enter a name and an amount',true);x.tag=t;x.amt=r2(a);save();editId=null;day();ledger()};
 const cn=el.querySelector('[data-ec]');if(cn)cn.onclick=()=>{editId=null;day()};
 const rm=el.querySelector('[data-er]');if(rm)rm.onclick=()=>{if(!confirm('Delete this spend?'))return;db.spends=db.spends.filter(z=>z.id!==rm.dataset.er);save();editId=null;day();ledger()};
}
const editRow=x=>`<div class="line" style="display:block"><input id="e-t" value="${esc(x.tag)}"><div style="height:6px"></div><input id="e-a" inputmode="decimal" value="${x.amt}">
 <div class="btns"><button class="btn sm" data-es="${x.id}" type="button" style="flex:1;margin-top:8px">Save</button><button class="btn sm ghost" data-ec="1" type="button" style="flex:1;margin-top:8px">Cancel</button><button class="btn sm red" data-er="${x.id}" type="button" style="margin-top:8px">Delete</button></div></div>`;
function ledger(){
 const el=$('#led'),S=summary(from,to);
 el.innerHTML=`<h2>Ledger</h2>
 <div class="card"><div class="row2"><div><label style="margin-top:0">From</label><input type="date" id="l-f" value="${from}"></div><div><label style="margin-top:0">To</label><input type="date" id="l-t" value="${to}"></div></div>
 <div class="chips" style="margin-top:10px"><button class="chip" id="l-m" type="button">This month</button><button class="chip" id="l-l" type="button">Last month</button></div></div>
 <div class="row3" style="margin-bottom:12px"><div class="kpi"><h3>Sales</h3><div class="num" style="font-size:18px">${inr(S.sales)}</div></div><div class="kpi"><h3>Spends</h3><div class="num" style="font-size:18px">${inr(S.spends)}</div></div><div class="kpi"><h3>Profit</h3><div class="num ${S.profit<0?'bad':'ok'}" style="font-size:18px">${inr(S.profit)}</div></div></div>
 <div class="card" style="padding:10px 12px">${S.rows.length?`<div class="scroll"><table class="tbl"><thead><tr><th>Date</th><th class="n">Sales</th><th class="n">Spends</th><th class="n">Net</th><th class="n">Running</th></tr></thead><tbody>
 ${S.rows.map(r=>`<tr class="tap" data-a="jump" data-d="${r.d}"><td>${dmy(r.d).slice(0,5)}<br><small class="mute">${nice(r.d).slice(0,3)}</small></td><td class="n">${r.hasSales?inr(r.sales):'–'}</td><td class="n">${r.spends?inr(r.spends):'–'}</td><td class="n ${r.net<0?'bad':''}">${inr(r.net)}</td><td class="n ${r.run<0?'bad':''}">${inr(r.run)}</td></tr>`).join('')}</tbody>
 <tfoot><tr><td>Total</td><td class="n">${inr(S.sales)}</td><td class="n">${inr(S.spends)}</td><td class="n">${inr(S.profit)}</td><td></td></tr></tfoot></table></div><p class="mute" style="margin:8px 2px 0"><small>Tap a row to open that day. Running = profit added up from the first day shown.</small></p>`:'<p class="empty">Nothing entered between these dates yet.</p>'}</div>
 ${S.byTag.length?`<div class="card"><h3>Where the money went</h3>${S.byTag.map(t=>`<div class="line"><span>${esc(t.tag)} <small class="mute">× ${t.n}</small></span><b>${inr(t.amt)}</b></div>`).join('')}</div>`:''}
 <div class="msg" id="l-m2"></div><button class="btn" id="l-pdf" type="button" ${S.rows.length?'':'disabled'}>Download ledger (PDF)</button>`;
 const set=(f,t)=>{if(!f||!t)return;if(f>t)[f,t]=[t,f];from=f;to=t;manual=true;ledger()};
 $('#l-f').onchange=e=>set(e.target.value,to);$('#l-t').onchange=e=>set(from,e.target.value);
 $('#l-m').onclick=()=>{const n=today();set(monthStart(n),monthEnd(n))};
 $('#l-l').onclick=()=>{const n=addDays(monthStart(today()),-1);set(monthStart(n),monthEnd(n))};
 $('#l-pdf').onclick=async e=>{const b=e.target,m=$('#l-m2');b.disabled=true;m.className='msg';m.textContent='Making the PDF…';
  try{await ledgerPdf(from,to);m.className='msg ok';m.textContent='Ledger PDF ready.'}
  catch(x){m.className='msg';m.textContent=x&&x.message==='offline'?'The PDF tool needs internet the first time. Connect and try again.':'Could not make the PDF.'}
  b.disabled=false};
}
