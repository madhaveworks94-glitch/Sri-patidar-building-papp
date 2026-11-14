import {db} from './store.js';
import {toast} from './util.js';
const I={
 sales:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18M8 15h4"/></svg>',
 invoices:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h8"/></svg>',
 analysis:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>'};
const TABS=[['sales','Sales & Ledger'],['invoices','Invoices'],['analysis','Analysis']];
const LOAD={sales:()=>import('./sales.js'),invoices:()=>import('./invoices.js'),analysis:()=>import('./analysis.js'),settings:()=>import('./settings.js')};
const view=document.getElementById('view'),nav=document.getElementById('nav');
nav.innerHTML=TABS.map(([k,l])=>`<a href="#${k}" data-k="${k}">${I[k]}<span>${l}</span></a>`).join('');
let seq=0;
export function refreshBrand(){document.getElementById('shopname').textContent=db.shop.name||'Patidar Accounts'}
async function route(){
 const k=(location.hash||'#sales').slice(1).split('/')[0],key=LOAD[k]?k:'sales',my=++seq;
 nav.querySelectorAll('a').forEach(a=>a.classList.toggle('on',a.dataset.k===key));
 document.getElementById('gear').style.color=key==='settings'?'var(--g)':'';
 view.onclick=view.oninput=view.onchange=view.onkeydown=null;
 refreshBrand();
 try{const m=await LOAD[key]();if(my!==seq)return;view.innerHTML='';m.mount(view);window.scrollTo(0,0)}
 catch(e){view.innerHTML='<div class="card"><b>Something went wrong opening this page.</b><p class="mute">'+String(e&&e.message||e).replace(/</g,'&lt;')+'</p><button class="btn" onclick="location.reload()">Reload</button></div>'}
}
window.addEventListener('hashchange',route);
window.addEventListener('savefail',()=>toast('Could not save. Phone storage may be full.',true));
document.getElementById('gear').onclick=()=>{location.hash=location.hash==='#settings'?'#sales':'#settings'};
nav.onclick=e=>{const a=e.target.closest('a');if(a&&location.hash==='#'+a.dataset.k){e.preventDefault();route()}};
route();
