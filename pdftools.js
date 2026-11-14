// PDF libraries are bundled in the Android app (lib/); on the web they load from a CDN the first time and are then cached.
import {saveFile} from './util.js';
const load=u=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=u;s.onload=ok;s.onerror=()=>{s.remove();no(new Error('offline'))};document.head.appendChild(s)});
async function first(list){let e;for(const u of list){try{await load(u);return}catch(x){e=x}}throw e||new Error('offline')}
export async function pdfTools(){
 if(!(window.jspdf&&window.jspdf.jsPDF))await first(['lib/jspdf.umd.min.js','https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js']);
 if(!window.jspdf.jsPDF.API.autoTable)await first(['lib/jspdf.plugin.autotable.min.js','https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js']);
 return window.jspdf.jsPDF;
}
export const savePdf=(doc,name)=>saveFile(name,'application/pdf',doc.output('blob'));
// Standard PDF fonts cannot print the rupee sign, so PDFs use "Rs."
export const money=n=>Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
