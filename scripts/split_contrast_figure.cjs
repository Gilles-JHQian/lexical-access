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
   for(const [cell,first] of cells)for(const [i,part] of ['lh','rh','trace','roi'].entries()){
    const svg=doc.createElementNS(ns,'svg');svg.setAttribute('xmlns',ns);svg.setAttribute('viewBox',`${x} ${y} ${width} ${height}`);svg.setAttribute('width',width);svg.setAttribute('height',height);svg.append(defs.cloneNode(true));
    const group=doc.querySelector('#axes_'+(first+i)).cloneNode(true);
    if(i<2)group.querySelectorAll('text').forEach(e=>e.remove()); // Hemisphere labels become readable HTML.
    svg.append(group);const serialize=()=>new XMLSerializer().serializeToString(svg);
    const canvas=document.createElement('canvas');canvas.width=Math.ceil(width*2);canvas.height=Math.ceil(height*2);
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(await decode(serialize()),0,0,canvas.width,canvas.height);
    const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data;let left=canvas.width,top=canvas.height,right=0,bottom=0;
    for(let py=0;py<canvas.height;py++)for(let px=0;px<canvas.width;px++){const k=(py*canvas.width+px)*4;if(Math.min(rgba[k],rgba[k+1],rgba[k+2])<250){left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);}}
    if(right<=left||bottom<=top)throw Error('Empty axis '+cell+' '+part);
    const pad=8,box=[left/2-pad,top/2-pad,(right-left+1)/2+pad*2,(bottom-top+1)/2+pad*2];
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
