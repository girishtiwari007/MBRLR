/* Export the displayed report, retaining editable values and native PPT objects. */
(function(root){
  'use strict';
  const PORTAL_BRAND='Ordinary Working Expenses (OWE) PORTAL - Moradabad Division';
  const pages=[['summary','Summary'],['liability','OWE Statement'],['smhdetail','Department wise'],['demandsmh','Demand SMH'],['pumaster','PU Master'],['monthwise','Month-wise'],['bpanalysis','BP Analysis'],['budgetcontrol','Budget Control'],['excessshortfall','AE vs BP'],['trend','Graphs'],['aitrend','AI Summary'],['historycompare','History Compare']];
  const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
  function grid(rows,repeatSpan=false){
    const result=[];
    [...rows].filter(r=>!r.hidden && r.style.display!=='none').forEach((row,i)=>{
      result[i] ||= []; let col=0;
      for(const cell of row.cells){
        while(result[i][col]!==undefined) col++;
        const text=clean(cell.innerText||cell.textContent);
        for(let y=0;y<(cell.rowSpan||1);y++) for(let x=0;x<(cell.colSpan||1);x++){
          result[i+y] ||= []; result[i+y][col+x]=(x===0||repeatSpan?text:'');
        }
        col+=cell.colSpan||1;
      }
    });
    return result;
  }
  function capture(id){
    const section=(document.body.classList.contains('bi-view-active') && id===(root.activeTabName?.()||id) && document.getElementById('biViewPanel'))
      ? document.getElementById('biViewPanel')
      : document.getElementById('tab-'+id);
    if(!section) throw new Error('Report unavailable: '+id);
    const tables=[...section.querySelectorAll('table')].filter(t=>!t.hidden && t.style.display!=='none').map((t,i)=>{
      const header=grid(t.tHead?.rows||[],true), rows=grid([...t.tBodies].flatMap(b=>[...b.rows]).concat([...t.tFoot?.rows||[]]));
      const n=Math.max(0,...header.map(r=>r.length),...rows.map(r=>r.length));
      const headers=Array.from({length:n},(_,c)=>[...new Set(header.map(r=>r[c]).filter(Boolean))].join(' / ')||`Column ${c+1}`);
      return {title:clean(t.caption?.textContent)||`Table ${i+1}`,headers,rows:rows.map(r=>Array.from({length:n},(_,c)=>r[c]||''))};
    }).filter(t=>t.rows.length);
    const charts=[];
    section.querySelectorAll('canvas').forEach(canvas=>{
      const chart=root.Chart?.getChart?.(canvas); if(!chart)return;
      const labels=chart.data.labels.map(clean);
      const series=chart.data.datasets.filter((_,i)=>chart.isDatasetVisible(i)).map(d=>({name:clean(d.label),labels,values:d.data.map(v=>v==null?null:Number(v))}));
      if(series.length) charts.push({title:canvas.id,type:chart.config.type,series});
    });
    if(!charts.length)for(const table of tables){
      const monthCols=table.headers.map((h,i)=>/\b(APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|JAN|FEB|MAR)\b/i.test(h)?i:-1).filter(i=>i>=0);
      if(monthCols.length<2)continue;
      const series=table.rows.map(row=>({name:clean(row[0])+' '+clean(row[1]),labels:monthCols.map(i=>table.headers[i]),values:monthCols.map(i=>{
        const raw=clean(row[i]).replace(/,/g,'');return /^[+-]?\d+(\.\d+)?$/.test(raw)?Number(raw):null;
      })})).filter(s=>s.values.some(v=>v!==null));
      for(let i=0;i<series.length;i+=6)charts.push({title:table.title+' monthly series '+(i/6+1),type:'line',series:series.slice(i,i+6)});
    }
    for(const chart of charts) tables.push({title:chart.title+' (chart data)',headers:['Category',...chart.series.map(s=>s.name)],rows:chart.series[0].labels.map((label,i)=>[label,...chart.series.map(s=>s.values[i])])});
    const notes=[...new Set([...section.querySelectorAll('.kpi,.card,.summary-card,.summary-point,.prog-item,.ai-dash-kpi,.bi-kpi,.ai-pu-head,.ai-kpi-row,.ai-bullets,.ai-digest-head,.ai-summary-card,.chart-note,.formula-note')].map(n=>clean(n.innerText||n.textContent)).filter(Boolean))];
    if(!tables.length && !notes.length) throw new Error('Open '+id+' first and allow its data to finish loading before exporting.');
    return {id,title:(pages.find(p=>p[0]===id)||[id,id])[1],tables,charts,notes};
  }
  function bands(table,max=7){
    if(table.headers.length<=max)return [table];
    const out=[];
    for(let c=2;c<table.headers.length;c+=max-2){
      const indices=[0,1,...Array.from({length:Math.min(max-2,table.headers.length-c)},(_,i)=>i+c)];
      out.push({title:table.title+` - columns ${c+1}-${indices.at(-1)+1}`,headers:indices.map(i=>table.headers[i]),rows:table.rows.map(r=>indices.map(i=>r[i]))});
    }
    return out;
  }
  function typed(value,col,header){
    if(typeof value==='number')return value;
    const s=clean(value);
    if(col===0 || /code|unit|department|name|description|year|month|category/i.test(header))return s;
    const raw=s.replace(/,/g,'');
    if(/^[+-]?\d+(\.\d+)?$/.test(raw))return Number(raw);
    return s;
  }
  async function excel(reports,meta,ExcelJS){
    const wb=new ExcelJS.Workbook();wb.creator=PORTAL_BRAND;
    let count=0;
    for(const report of reports){
      const tables=[...report.tables,...(report.notes.length?[{title:'Review',headers:['Review note'],rows:report.notes.map(n=>[n])}]:[])];
      for(const table of tables) for(const part of bands(table)){
        const ws=wb.addWorksheet(`${++count} ${report.title}`.slice(0,31),{pageSetup:{orientation:'landscape',paperSize:9,scale:100,fitToPage:false,margins:{left:.4,right:.4,top:.5,bottom:.5,header:.2,footer:.2}},views:[{state:'frozen',ySplit:5}]});
        ws.addRow(['NORTHERN RAILWAY - MORADABAD DIVISION']);
        ws.addRow([PORTAL_BRAND]);
        ws.addRow([report.title+' - '+part.title]);ws.addRow([meta.period]);ws.addRow(['Displayed values and units; '+meta.filters]);ws.addRow(part.headers);
        part.rows.forEach(r=>ws.addRow(r.map((v,c)=>typed(v,c,part.headers[c]))));
        const width=part.headers.length===1?110:part.headers.length<=4?28:18;
        ws.columns=part.headers.map(()=>({width}));
        for(let r=1;r<=5;r++)if(part.headers.length>1)ws.mergeCells(r,1,r,part.headers.length);
        ws.eachRow((row,i)=>{
          row.height=i<=4?30:Math.max(28,...row.values.slice(1).map(v=>Math.ceil(String(v??'').length/Math.max(width-3,10))*13+8));
          row.eachCell({includeEmpty:true},cell=>{
            cell.font={name:'Times New Roman',size:10,bold:i<=6};
            cell.alignment={vertical:'middle',wrapText:true};
            if(typeof cell.value==='number')cell.numFmt='#,##0.00;[Red]-#,##0.00';
            if(i===6) {cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF17365D'}};cell.font={name:'Times New Roman',size:10,bold:true,color:{argb:'FFFFFFFF'}};}
          });
        });
        ws.pageSetup.printTitlesRow='1:6';ws.pageSetup.printArea=`A1:${ws.getColumn(part.headers.length).letter}${ws.rowCount}`;
        ws.headerFooter.oddFooter='&LFor Official Use Only&RPage &P of &N';
      }
    }
    return wb.xlsx.writeBuffer();
  }
  async function pdf(reports,meta,jsPDF,fonts){
    const doc=new jsPDF({orientation:'landscape',unit:'pt',format:'a4'});
    for(const [style,data] of Object.entries(fonts)){doc.addFileToVFS(style+'.ttf',data);doc.addFont(style+'.ttf','TimesNewRoman',style);}
    const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight();let started=false;
    for(const report of reports) for(const table of [...report.tables,...(report.notes.length?[{title:'Review',headers:['Review note'],rows:report.notes.map(n=>[n])}]:[])])for(const part of bands(table)){
      if(started)doc.addPage();started=true;
      doc.autoTable({head:[part.headers],body:part.rows.map(r=>r.map(v=>typeof v==='number'?v.toFixed(2):v)),startY:92,margin:{top:92,bottom:35,left:32,right:32},theme:'grid',showHead:'everyPage',styles:{font:'TimesNewRoman',fontSize:10,cellPadding:4,overflow:'linebreak'},headStyles:{fillColor:[23,54,93],fontStyle:'bold'},alternateRowStyles:{fillColor:[245,248,251]},rowPageBreak:'avoid',didDrawPage:()=>{
        doc.setFont('TimesNewRoman','bold');doc.setFontSize(14);doc.setTextColor(23,54,93);doc.text(report.title,32,27);
        doc.setFont('TimesNewRoman','normal');doc.setFontSize(10);doc.setTextColor(40);
        doc.text(PORTAL_BRAND,32,43);doc.text(meta.period,32,57);
        doc.text(doc.splitTextToSize(part.title+'; '+meta.filters,W-64).slice(0,2),32,71);
        doc.text('Displayed values and units. For Official Use Only.',32,H-18);doc.text(String(doc.internal.getCurrentPageInfo().pageNumber),W-32,H-18,{align:'right'});
      }});
    }
    return doc;
  }
  async function ppt(reports,meta,PptxGenJS){
    const deck=new PptxGenJS();deck.layout='LAYOUT_WIDE';deck.author=PORTAL_BRAND;deck.subject=meta.period;
    deck.theme={headFontFace:'Times New Roman',bodyFontFace:'Times New Roman',lang:'en-IN'};
    function slide(title){const s=deck.addSlide();s.addText(title,{x:.5,y:.3,w:12.3,h:.6,fontSize:26,bold:true,color:'17365D',margin:0});s.addText(meta.period,{x:.5,y:.98,w:12.3,h:.35,fontSize:11,margin:0});s.addText(PORTAL_BRAND+'. For Official Use Only.',{x:.5,y:7.08,w:11,h:.2,fontSize:10,margin:0});return s;}
    const cover=slide('Ordinary Working Expenses Review');cover.addText(reports.map(r=>r.title).join('\n'),{x:.6,y:1.6,w:11.8,h:3.8,fontSize:20,breakLine:false,margin:0});cover.addText(meta.filters,{x:.6,y:5.7,w:11.8,h:.7,fontSize:12,margin:0});
    for(const report of reports){
      for(const chart of report.charts){
        const s=slide(report.title+' - '+chart.title);
        s.addChart(deck.ChartType.line,chart.series,{x:.6,y:1.6,w:12.1,h:5.1,showLegend:true,showTitle:false,catAxisLabelFontSize:10,valAxisLabelFontSize:10,legendFontSize:10,showValue:false,chartColors:['17365D','31836A','B87824'],showBorder:false});
      }
      for(const table of report.tables)for(const part of bands(table,6)){
        for(let offset=0;offset<part.rows.length;offset+=6){
          const s=slide(report.title);
          s.addText(part.title+` (rows ${offset+1}-${Math.min(offset+6,part.rows.length)})`,{x:.5,y:1.35,w:12.3,h:.3,fontSize:10,margin:0});
          s.addTable([part.headers.map(text=>({text,options:{bold:true,color:'FFFFFF',fill:'17365D'}})),...part.rows.slice(offset,offset+6).map(r=>r.map(v=>String(v??'')))],{x:.5,y:1.8,w:12.3,fontFace:'Times New Roman',fontSize:10,border:{type:'solid',pt:.5,color:'CCD5DF'},margin:5,autoPage:false,rowH:.5,verbose:false});
        }
      }
      if(report.notes.length){
        const lines=report.notes.flatMap(n=>n.match(/.{1,105}(?:\s|$)|.{1,105}/g)||[]);
        for(let i=0;i<lines.length;i+=14){const s=slide(report.title+' - review');s.addText(lines.slice(i,i+14).join('\n'),{x:.6,y:1.6,w:12,h:5,fontSize:14,margin:0,breakLine:false});}
      }
    }
    return deck;
  }
  async function fonts(){
    const result={};for(const [style,file] of [['normal','times.ttf'],['bold','timesbd.ttf']]){
      const response=await fetch('assets/fonts/'+file);if(!response.ok)throw new Error('Times New Roman font unavailable');
      const bytes=new Uint8Array(await response.arrayBuffer());let raw='';for(const b of bytes)raw+=String.fromCharCode(b);result[style]=btoa(raw);
    }return result;
  }
  async function run(format,which){
    if(!confirmProtectedExport(`Display ${format} ${which}`))return;
    try{
      const audit=prepareFreshExport(format);
    renderSMHDetail();renderExcessShortfall();
      await new Promise(resolve=>setTimeout(resolve,200));
      const chosen=which==='all'?pages:(pages.some(p=>p[0]===which)?pages.filter(p=>p[0]===which):[[which,which]]);
      const reports=chosen.map(p=>capture(p[0]));
      const status=getMonthStatus();
      const meta={period:`Completed through ${getBPModeStatus().bpThrough?.label||'NONE'}; running ${status.cur.label} ${status.cur.year}. Generated ${new Date().toLocaleDateString('en-IN')}`,filters:'Current displayed filters; amounts retain displayed units. Source '+audit.id};
      const name='MBRLR_'+which+'_current_view_'+new Date().toISOString().slice(0,10);
      if(format==='Excel')saveBlob(new Blob([await excel(reports,meta,root.ExcelJS)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),name+'.xlsx');
      else if(format==='PDF')(await pdf(reports,meta,root.jspdf.jsPDF,await fonts())).save(name+'.pdf');
      else await (await ppt(reports,meta,root.PptxGenJS)).writeFile({fileName:name+'.pptx'});
    }catch(e){showPortalNotice('Displayed export failed: '+e.message,'err');}
  }
  function init(){
    const box=document.getElementById('displayExportPages');if(!box)return;
    box.innerHTML=pages.map(([id,title],i)=>`<tr><td>${i+1}. ${title}</td>${['Excel','PDF','PPT'].map(f=>`<td><button type="button" onclick="DisplayExport.run('${f}','${id}')">${f}</button></td>`).join('')}</tr>`).join('');
    pages.forEach(([id])=>{
      const section=document.getElementById('tab-'+id);
      if(section)section.querySelectorAll('.display-export-actions').forEach(bar=>bar.remove());
    });
  }
  async function configurePDF(doc){
    const loaded=await fonts();
    for(const [style,data] of Object.entries(loaded)){
      doc.addFileToVFS(style+'.ttf',data);
      for(const name of ['times','helvetica','TimesNewRoman'])doc.addFont(style+'.ttf',name,style);
    }
  }
  root.DisplayExport={pages,grid,bands,typed,capture,excel,pdf,ppt,run,init,configurePDF,fonts};
  if(typeof module!=='undefined')module.exports=root.DisplayExport;
})(typeof window!=='undefined'?window:globalThis);
