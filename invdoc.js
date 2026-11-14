// How a GST tax invoice looks: on screen (preview) and as a PDF.
import {db} from './store.js';
import {esc,fmt,f2,dmy,stateName,words} from './util.js';
import {pdfTools,savePdf,money} from './pdftools.js';
export const bal=i=>Math.max(Math.round((i.total-i.paid)*100)/100,0);
const qtyTxt=l=>fmt(l.qty)+' '+l.unit;
export function invoiceHTML(i){
 const s=i.sup,c=i.cust,b=bal(i);
 return`<div class="inv"><div class="inv-t"><b>TAX INVOICE</b><span class="m">Original for Recipient</span></div>
 <div class="inv-p"><div><b>${esc(s.name)}</b><br>${esc(s.addr).replace(/\n/g,'<br>')}<br>${s.phone?'Phone: '+esc(s.phone)+'<br>':''}GSTIN: <b>${esc(s.gstin)}</b><br>State: ${esc(stateName(s.state))}</div>
 <div>Invoice No: <b>${esc(i.no)}</b><br>Date: <b>${dmy(i.date)}</b><br>Place of supply: ${esc(stateName(c.pos))}<br>${i.inter?'Inter-state sale (IGST)':'Within state (CGST + SGST)'}</div></div>
 <div class="inv-p" style="grid-template-columns:1fr"><div><span class="m">Bill to</span><br><b>${esc(c.name)}</b>${c.addr?'<br>'+esc(c.addr).replace(/\n/g,'<br>'):''}${c.phone?'<br>Phone: '+esc(c.phone):''}${c.gstin?'<br>GSTIN: <b>'+esc(c.gstin)+'</b>':''}</div></div>
 <table><thead><tr><th>#</th><th>Item</th><th>HSN</th><th class="n">Qty</th><th class="n">Rate</th><th class="n">Disc%</th><th class="n">Taxable</th><th class="n">GST%</th><th class="n">GST</th><th class="n">Amount</th></tr></thead><tbody>
 ${i.lines.map((l,k)=>`<tr><td>${k+1}</td><td>${esc(l.name)}</td><td>${esc(l.hsn||'')}</td><td class="n">${esc(qtyTxt(l))}</td><td class="n">${f2(l.exRate)}</td><td class="n">${l.disc?fmt(l.disc):''}</td><td class="n">${f2(l.tx)}</td><td class="n">${fmt(l.gst)}</td><td class="n">${f2(l.tax)}</td><td class="n">${f2(l.total)}</td></tr>`).join('')}</tbody></table>
 <div style="display:flex;justify-content:flex-end;margin-top:8px"><table style="width:auto;min-width:240px"><tbody>
 <tr><td>Taxable value</td><td class="n">${f2(i.sub)}</td></tr>
 ${i.inter?`<tr><td>IGST</td><td class="n">${f2(i.igst)}</td></tr>`:`<tr><td>CGST</td><td class="n">${f2(i.cgst)}</td></tr><tr><td>SGST</td><td class="n">${f2(i.sgst)}</td></tr>`}
 ${i.round?`<tr><td>Round off</td><td class="n">${f2(i.round)}</td></tr>`:''}
 <tr><td><b>Grand total</b></td><td class="n"><b>₹ ${f2(i.total)}</b></td></tr>
 <tr><td>Received</td><td class="n">${f2(i.paid)}</td></tr><tr><td><b>Balance due</b></td><td class="n"><b>${f2(b)}</b></td></tr></tbody></table></div>
 <p class="m" style="margin:8px 0 0"><b style="color:#111">${esc(words(i.total))}</b></p>
 ${s.bank?`<p style="margin:8px 0 0"><span class="m">Bank details</span><br>${esc(s.bank).replace(/\n/g,'<br>')}</p>`:''}
 <div class="inv-s"><div class="m" style="max-width:55%">${s.terms?'<b style="color:#111">Terms</b><br>'+esc(s.terms).replace(/\n/g,'<br>'):''}</div><div style="text-align:right">For <b>${esc(s.name)}</b>${db.shop.sign?`<img src="${db.shop.sign}" alt="Signature">`:'<div style="height:48px"></div>'}<span class="m">Authorised signatory</span></div></div></div>`;
}
const imgSize=src=>new Promise(ok=>{const im=new Image();im.onload=()=>ok([im.naturalWidth||1,im.naturalHeight||1]);im.onerror=()=>ok(null);im.src=src});
export async function invoicePdf(i){
 const J=await pdfTools(),doc=new J({orientation:'portrait',unit:'mm',format:'a4'}),W=210,s=i.sup,c=i.cust,b=bal(i);
 let y=14;
 doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text('TAX INVOICE',W/2,y,{align:'center'});
 doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text('Original for Recipient',W-10,y,{align:'right'});y+=7;
 doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text(s.name||'',10,y);
 doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text('Invoice No: '+i.no,W-10,y,{align:'right'});y+=5;
 doc.text('Date: '+dmy(i.date),W-10,y,{align:'right'});
 const ad=doc.splitTextToSize(s.addr||'',110);doc.text(ad,10,y);y+=Math.max(ad.length,1)*4.2;
 if(s.phone){doc.text('Phone: '+s.phone,10,y);y+=4.2}
 doc.text('GSTIN: '+s.gstin,10,y);doc.text('Place of supply: '+stateName(c.pos),W-10,y,{align:'right'});y+=4.2;
 doc.text('State: '+stateName(s.state),10,y);doc.text(i.inter?'Inter-state sale (IGST)':'Within state (CGST + SGST)',W-10,y,{align:'right'});y+=6;
 doc.setFont('helvetica','bold');doc.text('Bill to',10,y);y+=4.5;doc.setFontSize(10.5);doc.text(c.name||'',10,y);y+=4.5;
 doc.setFont('helvetica','normal');doc.setFontSize(9);
 const ca=doc.splitTextToSize(c.addr||'',120);if(c.addr){doc.text(ca,10,y);y+=ca.length*4.2}
 if(c.phone){doc.text('Phone: '+c.phone,10,y);y+=4.2}if(c.gstin){doc.text('GSTIN: '+c.gstin,10,y);y+=4.2}
 y+=2;
 const base={theme:'grid',margin:{left:10,right:10},styles:{fontSize:8.5,cellPadding:1.8,lineColor:[70,70,70],lineWidth:.15,textColor:20},headStyles:{fillColor:[230,230,230],textColor:20,fontStyle:'bold'}};
 doc.autoTable({...base,startY:y,head:[['#','Item','HSN','Qty','Rate','Disc%','Taxable','GST%','GST','Amount']],
  body:i.lines.map((l,k)=>[String(k+1),l.name,l.hsn||'',qtyTxt(l),money(l.exRate),l.disc?fmt(l.disc):'',money(l.tx),fmt(l.gst),money(l.tax),money(l.total)]),
  columnStyles:{0:{cellWidth:8},3:{halign:'right'},4:{halign:'right'},5:{halign:'right'},6:{halign:'right'},7:{halign:'right'},8:{halign:'right'},9:{halign:'right'}}});
 y=doc.lastAutoTable.finalY+4;
 doc.autoTable({...base,startY:y,margin:{left:10,right:10},tableWidth:90,head:[['GST %','Taxable',i.inter?'IGST':'CGST + SGST']],
  body:i.rates.map(r=>[fmt(r.rate)+'%',money(r.tx),money(r.tax)]),columnStyles:{1:{halign:'right'},2:{halign:'right'}}});
 const y1=doc.lastAutoTable.finalY;
 const rows=[['Taxable value',money(i.sub)]];
 if(i.inter)rows.push(['IGST',money(i.igst)]);else{rows.push(['CGST',money(i.cgst)]);rows.push(['SGST',money(i.sgst)])}
 if(i.round)rows.push(['Round off',money(i.round)]);
 rows.push(['Grand total (Rs.)',money(i.total)],['Received',money(i.paid)],['Balance due',money(b)]);
 doc.autoTable({...base,startY:y,margin:{left:110,right:10},tableWidth:90,body:rows,columnStyles:{1:{halign:'right'}},
  didParseCell:d=>{if(d.row&&d.row.raw&&/Grand total|Balance/.test(d.row.raw[0]))d.cell.styles.fontStyle='bold'}});
 y=Math.max(y1,doc.lastAutoTable.finalY)+6;
 const H=297;if(y>H-70){doc.addPage();y=16}
 doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text(words(i.total),10,y);y+=6;doc.setFont('helvetica','normal');
 if(s.bank){const t=doc.splitTextToSize('Bank details: '+s.bank.replace(/\n/g,', '),110);doc.text(t,10,y);y+=t.length*4.2+2}
 const yt=y;
 if(s.terms){const t=doc.splitTextToSize('Terms: '+s.terms.replace(/\n/g,' '),105);doc.setFontSize(8);doc.text(t,10,y);y+=t.length*3.6}
 doc.setFontSize(9);doc.text('For '+(s.name||''),W-10,yt,{align:'right'});
 if(db.shop.sign){const d=await imgSize(db.shop.sign);if(d){const mw=48,mh=20,k=Math.min(mw/d[0],mh/d[1]),w=d[0]*k,h=d[1]*k;
  try{doc.addImage(db.shop.sign,/^data:image\/jpe?g/.test(db.shop.sign)?'JPEG':'PNG',W-10-w,yt+2,w,h)}catch(e){}}}
 doc.text('Authorised signatory',W-10,yt+25,{align:'right'});
 await savePdf(doc,'Invoice-'+i.no.replace(/\//g,'-')+'.pdf');
}
