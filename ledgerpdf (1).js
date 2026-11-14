import {db} from './store.js';
import {summary} from './calc.js';
import {dmy} from './util.js';
import {pdfTools,savePdf,money} from './pdftools.js';
export async function ledgerPdf(from,to){
 const J=await pdfTools(),doc=new J({orientation:'portrait',unit:'mm',format:'a4'}),W=210,S=summary(from,to);
 let y=15;
 doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text(db.shop.name||'Daily Ledger',14,y);y+=6;
 doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text('Daily sales and spends ledger',14,y);doc.text(dmy(from)+' to '+dmy(to),W-14,y,{align:'right'});y+=3;
 const th={fillColor:[15,92,77],textColor:255,fontStyle:'bold'};
 doc.autoTable({startY:y+3,margin:{left:14,right:14},theme:'grid',styles:{fontSize:9,cellPadding:2},headStyles:th,
  head:[['Date','Sales (Rs.)','Spends (Rs.)','Day net (Rs.)','Running profit (Rs.)']],
  body:S.rows.map(r=>[dmy(r.d),r.hasSales?money(r.sales):'-',r.spends?money(r.spends):'-',money(r.net),money(r.run)]),
  foot:[['Total',money(S.sales),money(S.spends),money(S.profit),'']],footStyles:{fillColor:[227,241,236],textColor:20,fontStyle:'bold'},
  columnStyles:{1:{halign:'right'},2:{halign:'right'},3:{halign:'right'},4:{halign:'right'}}});
 y=doc.lastAutoTable.finalY+8;
 const sp=db.spends.filter(s=>s.date>=from&&s.date<=to).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
 if(sp.length){
  doc.setFont('helvetica','bold');doc.setFontSize(12);if(y>260){doc.addPage();y=15}doc.text('Spend details',14,y);
  doc.autoTable({startY:y+3,margin:{left:14,right:14},theme:'grid',styles:{fontSize:9,cellPadding:2},headStyles:th,head:[['Date','Spent on','Amount (Rs.)']],
   body:sp.map(s=>[dmy(s.date),s.tag,money(s.amt)]),columnStyles:{2:{halign:'right'}}});
  y=doc.lastAutoTable.finalY+8;
  if(S.byTag.length){if(y>250){doc.addPage();y=15}doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('Spends by tag',14,y);
   doc.autoTable({startY:y+3,margin:{left:14,right:14},theme:'grid',styles:{fontSize:9,cellPadding:2},headStyles:th,head:[['Tag','Times','Total (Rs.)']],
    body:S.byTag.map(t=>[t.tag,String(t.n),money(t.amt)]),columnStyles:{2:{halign:'right'}}})}
 }
 const n=doc.getNumberOfPages?doc.getNumberOfPages():1;
 for(let i=1;i<=n;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(120);doc.text('Page '+i+' of '+n,W-14,290,{align:'right'})}
 await savePdf(doc,'Ledger-'+from+'-to-'+to+'.pdf');
}
