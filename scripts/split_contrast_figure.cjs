// Reflow the accepted figure's existing SVG axes; never recompute a plotted value.
const {chromium}=require('playwright');
const fs=require('node:fs/promises'),path=require('node:path');
(async()=>{
 const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: split_contrast_figure.cjs input.svg output-directory');
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage(),source=await fs.readFile(input,'utf8');
  const results=await page.evaluate(async source=>{
   const ns='http://www.w3.org/2000/svg',doc=new DOMParser().parseFromString(source,'image/svg+xml');
   const [x,y,width,height]=doc.documentElement.getAttribute('viewBox').split(/\s+/).map(Number);
   const defs=doc.createElementNS(ns,'defs');
   for(const d of doc.querySelectorAll('defs'))for(const child of d.children)defs.append(child.cloneNode(true));
   const cells=[['stimulus-wdnw',1],['offset-wdnw',5],['stimulus-nwwd',9],['offset-nwwd',13]],results=[];
   const decode=async svg=>{const img=new Image();img.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svg)));await img.decode();return img;};
   // Web derivatives keep every plotted path; only text size/placement changes.
   // Sizes are in source SVG units. At a 350 px phone panel they render at
   // roughly 14–16 px, with a 360 px CSS cap to avoid oversized desktop labels.
   const webTypography=(group,part)=>{
    const font=(text,size)=>text.setAttribute('style',text.getAttribute('style').replace(/font-size:\s*[\d.]+px/,`font-size: ${size}px`));
    const place=(text,x,y,angle=0)=>{text.setAttribute('x',x);text.setAttribute('y',y);text.setAttribute('transform',`rotate(${angle} ${x} ${y})`);};
    if(part==='trace'){
     const coordinates=group.querySelector('path').getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
     const [left,bottom,,,,top]=coordinates;
     const axes=[...group.children].filter(e=>(e.id||'').startsWith('matplotlib.axis_'));
     for(const text of axes[0].querySelectorAll('text')){
      const label=text.textContent.startsWith('Time from');font(text,label?13:12);
      place(text,+text.getAttribute('x'),bottom+(label?35:17));
     }
     for(const text of axes[1].querySelectorAll('text')){
      const label=text.getAttribute('transform').startsWith('rotate(-90');font(text,label?13:12);
      place(text,label?left-42:left-7,label?(top+bottom)/2:+text.getAttribute('y')-(28-12)*.36,label?-90:0);
     }
     for(const text of group.querySelectorAll('text'))if(text.textContent.startsWith('n =')){font(text,11);place(text,+text.getAttribute('x'),top-7);}
    }else if(part==='roi'){
     // Keep outside labels anchored to their original leader lines; center the
     // smaller in-wedge labels and tighten the original two-line Other label.
     for(const block of [...group.children].filter(e=>e.querySelector('text'))){
      const texts=[...block.querySelectorAll('text')];
      const boundsInParent=text=>{const b=text.getBBox(),m=text.transform.baseVal.consolidate().matrix;return {x:b.x+m.e,y:b.y+m.f,width:b.width,height:b.height};};
      const bounds=texts.map(boundsInParent);
      const centerY=bounds.reduce((sum,b)=>sum+b.y+b.height/2,0)/bounds.length;
      texts.forEach((text,i)=>{
       const before=bounds[i],transform=text.getAttribute('transform')||'';
       font(text,12.5);const after=boundsInParent(text);
       const dx=text.hasAttribute('x')?0:before.x+before.width/2-after.x-after.width/2;
       const targetY=centerY+(before.y+before.height/2-centerY)*12.5/24;
       const dy=targetY-after.y-after.height/2;
       text.setAttribute('transform',`${transform} translate(${dx} ${dy})`);
      });
     }
    }
   };
   for(const [cell,first] of cells)for(const [i,part] of ['lh','rh','trace','roi'].entries()){
    const svg=doc.createElementNS(ns,'svg');svg.setAttribute('xmlns',ns);svg.setAttribute('viewBox',`${x} ${y} ${width} ${height}`);svg.setAttribute('width',width);svg.setAttribute('height',height);svg.append(defs.cloneNode(true));
    const group=doc.querySelector('#axes_'+(first+i)).cloneNode(true);
    if(i<2)group.querySelectorAll('text').forEach(e=>e.remove()); // Hemisphere labels become readable HTML.
    svg.append(group);
    if(i>=2){document.body.append(svg);webTypography(group,part);svg.remove();}
    const serialize=()=>new XMLSerializer().serializeToString(svg);
    const canvas=document.createElement('canvas');canvas.width=Math.ceil(width*2);canvas.height=Math.ceil(height*2);
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(await decode(serialize()),0,0,canvas.width,canvas.height);
    const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data;let left=canvas.width,top=canvas.height,right=0,bottom=0;
    for(let py=0;py<canvas.height;py++)for(let px=0;px<canvas.width;px++){const k=(py*canvas.width+px)*4;if(Math.min(rgba[k],rgba[k+1],rgba[k+2])<250){left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);}}
    if(right<=left||bottom<=top)throw Error('Empty axis '+cell+' '+part);
    const pad=8,box=[left/2-pad,top/2-pad,(right-left+1)/2+pad*2,(bottom-top+1)/2+pad*2];
    // One coordinate width keeps type and plot scale consistent across all four
    // selections. Extra margins never alter the accepted scientific geometry.
    if(i>=2){
     if(box[2]>300)throw Error('Web labels exceed the shared 300-unit panel width');
     if(part==='trace')box[0]=Number(group.querySelector('path').getAttribute('d').match(/-?\d+(?:\.\d+)?/g)[0])-60;
     else box[0]-=(300-box[2])/2;
     box[2]=300;
    }
    svg.setAttribute('viewBox',box.join(' '));svg.setAttribute('width',box[2]);svg.setAttribute('height',box[3]);
    const cropped=serialize();let webp;
    if(i<2){canvas.width=900;canvas.height=Math.round(900*box[3]/box[2]);ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(await decode(cropped),0,0,canvas.width,canvas.height);webp=canvas.toDataURL('image/webp',.94).split(',')[1];}
    results.push({cell,part,axis:first+i,box,svg:cropped,webp,width:i<2?canvas.width:Math.round(box[2]*2),height:i<2?canvas.height:Math.round(box[3]*2)});
   }
   return results;
  },source);
  const manifest=[];
  for(const result of results){const stem=`contrast-${result.cell}-${result.part}`;await fs.writeFile(path.join(output,stem+'.svg'),result.svg);if(result.webp)await fs.writeFile(path.join(output,stem+'.webp'),Buffer.from(result.webp,'base64'));manifest.push({cell:result.cell,part:result.part,axis:result.axis,box:result.box,width:result.width,height:result.height,file:stem+(result.webp?'.webp':'.svg')});}
  console.log(JSON.stringify(manifest));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
