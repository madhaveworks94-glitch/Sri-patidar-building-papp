// Small shared helpers: formatting, dates, GST states, amount in words, saving files.
export const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const num=v=>{const x=parseFloat(String(v==null?'':v).replace(/,/g,''));return Number.isFinite(x)?x:0};
export const r2=n=>Math.round((n+Number.EPSILON)*100)/100;
export const inr=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});
export const f2=n=>Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
export const fmt=n=>String(Math.round(n*1000)/1000);
export const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);

const p2=n=>String(n).padStart(2,'0');
export const iso=d=>d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());
export const today=()=>iso(new Date());
export const parse=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
export const addDays=(s,n)=>{const d=parse(s);d.setDate(d.getDate()+n);return iso(d)};
export const dmy=s=>{if(!s)return '';const [y,m,d]=s.split('-');return d+'-'+m+'-'+y};
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const monthName=k=>{const [y,m]=k.split('-');return MON[+m-1]+' '+y};
export const dayName=s=>['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][parse(s).getDay()];
export const nice=s=>dayName(s)+', '+Number(s.slice(8))+' '+MON[+s.slice(5,7)-1]+' '+s.slice(0,4);
export const monthStart=s=>s.slice(0,8)+'01';
export const monthEnd=s=>{const [y,m]=s.split('-').map(Number);return iso(new Date(y,m,0))};
// Indian financial year label, like 26-27 (April to March)
export const fy=s=>{const d=parse(s||today()),y=d.getFullYear()%100,a=d.getMonth()>=3?y:(y+99)%100;return p2(a)+'-'+p2((a+1)%100)};
export const fyStart=s=>{const d=parse(s),y=d.getMonth()>=3?d.getFullYear():d.getFullYear()-1;return y+'-04-01'};
export const fyEnd=s=>{const d=parse(fyStart(s));return iso(new Date(d.getFullYear()+1,2,31))};
export const eachDay=(a,b)=>{const r=[];let x=a,n=0;while(x<=b&&n<4000){r.push(x);x=addDays(x,1);n++}return r};

const STATE_TXT='01 Jammu and Kashmir,02 Himachal Pradesh,03 Punjab,04 Chandigarh,05 Uttarakhand,06 Haryana,07 Delhi,08 Rajasthan,09 Uttar Pradesh,10 Bihar,11 Sikkim,12 Arunachal Pradesh,13 Nagaland,14 Manipur,15 Mizoram,16 Tripura,17 Meghalaya,18 Assam,19 West Bengal,20 Jharkhand,21 Odisha,22 Chhattisgarh,23 Madhya Pradesh,24 Gujarat,26 Dadra and Nagar Haveli and Daman and Diu,27 Maharashtra,29 Karnataka,30 Goa,31 Lakshadweep,32 Kerala,33 Tamil Nadu,34 Puducherry,35 Andaman and Nicobar Islands,36 Telangana,37 Andhra Pradesh,38 Ladakh';
export const STATES=STATE_TXT.split(',').map(s=>[s.slice(0,2),s.slice(3)]);
export const stateName=c=>{const s=STATES.find(x=>x[0]===c);return s?s[1]+' ('+c+')':(c||'')};
export const stateOpts=sel=>'<option value="">Select state</option>'+STATES.map(s=>`<option value="${s[0]}" ${s[0]===sel?'selected':''}>${s[1]} (${s[0]})</option>`).join('');

const A=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'],T=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
const two=n=>n<20?A[n]:T[Math.floor(n/10)]+(n%10?' '+A[n%10]:'');
const three=n=>(n>=100?A[Math.floor(n/100)]+' Hundred'+(n%100?' ':''):'')+(n%100?two(n%100):'');
export function words(n){n=r2(n);const r=Math.floor(n),p=Math.round((n-r)*100);let s='';
 const cr=Math.floor(r/1e7),lk=Math.floor(r%1e7/1e5),th=Math.floor(r%1e5/1e3),rest=r%1e3;
 if(cr)s+=two(cr)+' Crore ';if(lk)s+=two(lk)+' Lakh ';if(th)s+=two(th)+' Thousand ';if(rest)s+=three(rest)+' ';
 return 'Rupees '+(s.trim()||'Zero')+(p?' and '+two(p)+' Paise':'')+' Only'}

// HSN code suggestions for common building materials (the owner can always change it)
const HSN=[[/cement|ppc|opc|clinker/i,'2523',18],[/tmt|rebar|saria|steel bar|iron rod|\brod\b/i,'7214',18],[/binding wire|\bwire\b/i,'7217',18],[/\bnail/i,'7317',18],[/angle|channel|\bbeam\b|girder/i,'7216',18],[/\bsheet|gi sheet|roofing/i,'7210',18],[/\bpipe|\btube/i,'7306',18],[/\bpvc\b/i,'3917',18],[/water tank|tank/i,'3925',18],[/\bbrick|\bfly ash|paver/i,'6901',12],[/\btile|vitrified|ceramic/i,'6908',18],[/\bsand\b|\bbajri\b|\bbalu\b/i,'2505',5],[/\bgravel|aggregate|\bgitti\b|\bstone chips|\bmetal\b/i,'2517',5],[/\bmarble|granite/i,'6802',18],[/\bpaint|\bprimer|\bputty|distemper|emulsion/i,'3209',18],[/\bwall putty|white cement/i,'3214',18],[/\bplywood|\bply\b|\bboard/i,'4412',18],[/\btimber|\bwood\b|\bdoor\b/i,'4407',18],[/\bglass/i,'7005',18],[/\block\b|\bhinge|\bhandle|\bbolt\b|\bscrew|\bhardware/i,'8302',18],[/\btap\b|\bfaucet|\bvalve|\bcock\b/i,'8481',18],[/\bwire\b|\bcable|\bswitch|\bsocket|\bmcb/i,'8544',18],[/\bbulb|\blamp|\bled\b/i,'8539',12],[/\bsanitary|\bbasin|\bcommode|\bwash/i,'6910',18],[/\bbitumen|\btar\b/i,'2713',18],[/\bgypsum|\bpop\b|plaster of paris/i,'2520',18],[/\bsolvent|\bthinner|\badhesive|\bfevicol|\bglue/i,'3506',18],[/\bwaterproof|\bchemical|\bcompound/i,'3824',18]];
export const hsnGuess=name=>{for(const [re,h,g] of HSN)if(re.test(name||''))return{hsn:h,gst:g};return null};

// Sending or saving a file: share sheet in the Android app, normal download on the web
export async function saveFile(name,mime,blob){
 const c=window.Capacitor,P=c&&c.isNativePlatform&&c.isNativePlatform()?c.Plugins:null;
 if(P&&P.Filesystem&&P.Share){
  const data=await new Promise((ok,no)=>{const fr=new FileReader();fr.onload=()=>ok(String(fr.result).split(',')[1]);fr.onerror=no;fr.readAsDataURL(blob)});
  const r=await P.Filesystem.writeFile({path:name,data,directory:'CACHE'});
  await P.Share.share({title:name,url:r.uri,dialogTitle:'Save or send'});return}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();
 setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000);
}
export const toast=(m,bad)=>{let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t)}
 t.textContent=m;t.className='show'+(bad?' bad':'');clearTimeout(toast.h);toast.h=setTimeout(()=>{t.className=''},2600)};
