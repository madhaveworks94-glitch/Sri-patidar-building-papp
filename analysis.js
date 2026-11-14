// Section 3: everything here is worked out from Section 1 (daily sales and spends) only.
import {esc,inr,r2,today,addDays,dmy,nice,monthStart,monthEnd,fyStart,fyEnd,eachDay,monthName,parse,dayName} from './util.js';
import {summary} from './calc.js';
let root,preset='month',cf='',ct='';
const $=s=>root.querySelector(s);
const P=[['month','This month'],['last','Last month'],['30','Last 30 days'],['fy','This year (Apr–Mar)'],['custom','Custom']];
function span(){
 const t=today();
 if(preset==='month')return[monthStart(t),monthEnd(t)];
 if(preset==='last'){const d=addDays(monthStart(t),-1);return[monthStart(d),monthEnd(d)]}
 if(preset==='30')return[addDays(t,-29),t];
 if(preset==='fy')return[fyStart(t),fyEnd(t)];
 let f=cf||monthStart(t),e=ct||t;if(f>e)[f,e]=[e,f];return[f,e];
}
const days=(a,b)=>eachDay(a,b).length;
const d1=x=>Math.round(x*10)/10;
export const compact=n=>{const a=Math.abs(n),s=n<0?'-':'';return a>=1e7?s+d1(a/1e7)+'Cr':a>=1e5?s+d1(a/1e5)+'L':a>=1e3?s+d1(a/1e3)+'k':s+Math.round(a)};
const niceMax=m=>{const t=m/4,p=Math.pow(10,Math.floor(Math.log10(t))),f=t/p;return(f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p*4};
function chart(b){
 if(!b.length)return '';
 const W=360,H=190,L=38,Bt=24,T=10,R=6,iw=W-L-R,ih=H-T-Bt,max=niceMax(Math.max(1,...b.map(x=>Math.max(x.sales,x.spends)))),bw=iw/b.length;
 const step=b.length>16?Math.ceil(b.length/8):1;
 let g='';
 for(let i=0;i<=4;i++){const v=max*i/4,y=T+ih-ih*i/4;g+=`<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" stroke="#e5e2d8"/><text x="${L-4}" y="${y+3}" font-size="9" text-anchor="end" fill="#6b746f">${compact(v)}</text>`}
 b.forEach((x,i)=>{const cx=L+i*bw,w=Math.max(1.5,Math.min(14,bw*.36)),h1=ih*x.sales/max,h2=ih*x.spends/max;
  g+=`<rect x="${cx+bw/2-w-.5}" y="${T+ih-h1}" width="${w}" height="${h1}" rx="2" fill="#17806b"><title>${esc(x.tip)}: sales ${inr(x.sales)}</title></rect>`;
  g+=`<rect x="${cx+bw/2+.5}" y="${T+ih-h2}" width="${w}" height="${h2}" rx="2" fill="#c77d0a"><title>${esc(x.tip)}: spends ${inr(x.spends)}</title></rect>`;
  if(i%step===0)g+=`<text x="${cx+bw/2}" y="${H-8}" font-size="9" text-anchor="middle" fill="#6b746f">${esc(x.label)}</text>`});
 return`<svg class="svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sales and spends chart">${g}</svg>
 <div style="display:flex;gap:16px;font-size:12.5px;color:#6b746f;margin-top:4px"><span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#17806b;margin-right:5px"></i>Sales</span><span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#c77d0a;margin-right:5px"></i>Spends</span></div>`;
}
function buckets(f,t,S){
 const map=new Map(S.rows.map(r=>[r.d,r]));
 if(days(f,t)<=62)return eachDay(f,t).map(d=>({label:String(+d.slice(8)),tip:nice(d),sales:(map.get(d)||{sales:0}).sales,spends:(map.get(d)||{spends:0}).spends}));
 const m=new Map();S.rows.forEach(r=>{const k=r.d.slice(0,7),o=m.get(k)||{label:monthName(k).slice(0,3),tip:monthName(k),sales:0,spends:0};o.sales=r2(o.sales+r.sales);o.spends=r2(o.spends+r.spends);m.set(k,o)});
 return[...m.entries()].sort((a,b)=>a[0]<b[0]?-1:1).map(x=>x[1]);
}
const chg=(cur,prev,goodUp)=>{
 if(!prev&&!cur)return'<span class="mute">–</span>';
 if(!prev)return'<span class="mute">no data before</span>';
 const p=(cur-prev)/Math.abs(prev)*100,up=p>=0,good=up===goodUp;
 return`<b class="${good?'ok':'bad'}">${up?'▲':'▼'} ${Math.abs(Math.round(p*10)/10)}%</b>`;
};
export function mount(r){root=r;draw()}
function draw(){
 const [f,t]=span(),S=summary(f,t),n=days(f,t),pt=addDays(f,-1),pf=addDays(pt,-(n-1)),Pv=summary(pf,pt);
 const sd=S.rows.filter(x=>x.hasSales),best=sd.reduce((a,x)=>!a||x.sales>a.sales?x:a,null),low=sd.reduce((a,x)=>!a||x.sales<a.sales?x:a,null);
 const margin=S.sales>0?Math.round(S.profit/S.sales*1000)/10:null,avg=S.salesDays?r2(S.sales/S.salesDays):0;
 const wk=[0,0,0,0,0,0,0],wn=[0,0,0,0,0,0,0];sd.forEach(x=>{const w=parse(x.d).getDay();wk[w]+=x.sales;wn[w]++});
 const wa=wk.map((v,i)=>wn[i]?v/wn[i]:0),wmax=Math.max(...wa,1),names=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
 const b=buckets(f,t,S),empty=!S.rows.length;
 const monthly=days(f,t)>62;
 root.innerHTML=`<h1>Analysis</h1><p class="sub">Worked out from your daily sales and spends only.</p>
 <div class="chips">${P.map(([k,l])=>`<button class="chip ${preset===k?'on':''}" data-p="${k}" type="button">${l}</button>`).join('')}</div>
 ${preset==='custom'?`<div class="card"><div class="row2"><div><label style="margin-top:0">From</label><input type="date" id="a-f" value="${f}"></div><div><label style="margin-top:0">To</label><input type="date" id="a-t" value="${t}"></div></div></div>`:''}
 <p class="mute" style="margin:0 2px 10px"><small>${dmy(f)} to ${dmy(t)} · ${n} days</small></p>
 ${empty?'<div class="card empty">No sales or spends entered between these dates yet. Add them in Sales & Ledger and the analysis fills in by itself.</div>':''}
 <div class="card hero"><h3>Profit after all spends</h3><div class="num">${inr(S.profit)}</div><div style="opacity:.92;margin-top:4px">${inr(S.sales)} turnover − ${inr(S.spends)} spends${margin===null?'':' · '+margin+'% of turnover kept'}</div></div>
 <div class="row2" style="margin-bottom:12px"><div class="kpi"><h3>Turnover</h3><div class="num">${inr(S.sales)}</div></div><div class="kpi"><h3>Total spends</h3><div class="num">${inr(S.spends)}</div></div>
 <div class="kpi"><h3>Average per day</h3><div class="num">${inr(avg)}</div><small class="mute">${S.salesDays} days entered</small></div>
 <div class="kpi"><h3>Spends vs sales</h3><div class="num">${S.sales>0?Math.round(S.spends/S.sales*1000)/10+'%':'–'}</div><small class="mute">of turnover spent</small></div>
 <div class="kpi"><h3>Best day</h3><div class="num" style="font-size:19px">${best?inr(best.sales):'–'}</div><small class="mute">${best?esc(nice(best.d)):''}</small></div>
 <div class="kpi"><h3>Weakest day</h3><div class="num" style="font-size:19px">${low?inr(low.sales):'–'}</div><small class="mute">${low?esc(nice(low.d)):''}</small></div></div>
 ${empty?'':`<div class="card"><h3>${monthly?'Month by month':'Day by day'}</h3>${chart(b)}${monthly?`<div class="scroll" style="margin-top:10px"><table class="tbl"><thead><tr><th>Month</th><th class="n">Sales</th><th class="n">Spends</th><th class="n">Profit</th></tr></thead><tbody>${b.map(x=>`<tr><td>${esc(x.tip)}</td><td class="n">${inr(x.sales)}</td><td class="n">${inr(x.spends)}</td><td class="n ${x.sales-x.spends<0?'bad':''}">${inr(r2(x.sales-x.spends))}</td></tr>`).join('')}</tbody></table></div>`:''}</div>`}
 <div class="card"><h3>Compared with the ${n} days before</h3><p class="mute" style="margin:0 0 4px"><small>${dmy(pf)} to ${dmy(pt)}</small></p>
 ${[['Turnover',S.sales,Pv.sales,true],['Spends',S.spends,Pv.spends,false],['Profit',S.profit,Pv.profit,true]].map(([l,c,p,g])=>`<div class="line"><span>${l}<br><small class="mute">before: ${inr(p)}</small></span><span style="text-align:right"><b>${inr(c)}</b><br>${chg(c,p,g)}</span></div>`).join('')}</div>
 ${S.byTag.length?`<div class="card"><h3>Spends by tag</h3>${S.byTag.map(x=>`<div style="margin:10px 0"><div style="display:flex;justify-content:space-between;gap:8px"><span>${esc(x.tag)} <small class="mute">× ${x.n}</small></span><b>${inr(x.amt)}</b></div><div class="bar amb"><i style="width:${S.spends?Math.max(2,x.amt/S.spends*100):0}%"></i></div><small class="mute">${S.spends?Math.round(x.amt/S.spends*1000)/10:0}% of spends</small></div>`).join('')}</div>`:''}
 ${sd.length?`<div class="card"><h3>Average sales by weekday</h3>${wa.map((v,i)=>`<div style="display:grid;grid-template-columns:38px 1fr 84px;gap:8px;align-items:center;margin:7px 0"><span>${names[i]}</span><div class="bar"><i style="width:${v?Math.max(2,v/wmax*100):0}%"></i></div><small style="text-align:right" class="${wn[i]?'':'mute'}">${wn[i]?inr(Math.round(v)):'–'}</small></div>`).join('')}</div>`:''}`;
 root.onclick=e=>{const c=e.target.closest('[data-p]');if(!c)return;preset=c.dataset.p;draw()};
 const a=$('#a-f'),z=$('#a-t');if(a)a.onchange=()=>{cf=a.value;ct=z.value;draw()};if(z)z.onchange=()=>{cf=a.value;ct=z.value;draw()};
}
