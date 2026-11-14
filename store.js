// All data lives on this phone only (localStorage). Nothing is sent anywhere.
import {today} from './util.js';
const KEY='pa.v1';
const blank=()=>({v:1,shop:{name:'',gstin:'',addr:'',phone:'',state:'',sign:'',bank:'',terms:'Goods once sold will not be taken back.'},days:{},spends:[],products:[],purchases:[],invoices:[],log:[],seq:{}});
export let db=load();
function load(){
 try{const t=localStorage.getItem(KEY);if(t){const d=JSON.parse(t);const b=blank();return{...b,...d,shop:{...b.shop,...(d.shop||{})}}}}catch(e){}
 return blank();
}
let failed=false;
export function save(){
 try{localStorage.setItem(KEY,JSON.stringify(db));failed=false;return true}
 catch(e){failed=true;window.dispatchEvent(new CustomEvent('savefail'));return false}
}
export const saveFailed=()=>failed;
// db is an exported live binding, so every file that imported it sees the new object after these calls
export function replaceAll(d){const b=blank(),nd={...b,...d,shop:{...b.shop,...(d.shop||{})}};
 ['days','seq'].forEach(k=>{if(!nd[k]||typeof nd[k]!=='object'||Array.isArray(nd[k]))nd[k]=b[k]});
 ['spends','products','purchases','invoices','log'].forEach(k=>{if(!Array.isArray(nd[k]))nd[k]=[]});
 db=nd;save()}
export function wipe(){db=blank();try{localStorage.removeItem(KEY)}catch(e){}}
export const hasData=()=>Object.keys(db.days).length||db.spends.length||db.products.length||db.purchases.length||db.invoices.length;
export const stamp=today;
