/* Demand-loaded, checksum-verified aggregate frames; no individual-contact data. */
(function () {
  'use strict';
  const types={'<f4':Float32Array,'<u2':Uint16Array,'<i2':Int16Array,'|u1':Uint8Array};
  function unpack(buffer) {
    const length=new DataView(buffer).getUint32(0,true),base=4+length;
    const header=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,4,length)));
    function visit(v){
      if(v&&typeof v==='object'&&'offset' in v&&'dtype' in v){
        const Type=types[v.dtype];if(!Type||base+v.offset+v.bytes>buffer.byteLength)throw new Error('Invalid data block');
        return {shape:v.shape,dtype:v.dtype,array:new Type(buffer,base+v.offset,v.bytes/Type.BYTES_PER_ELEMENT)};
      }
      if(Array.isArray(v))return v.map(visit);
      if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,visit(x)]));
      return v;
    }
    return visit(header);
  }
  class DataLoader {
    constructor(bundle){
      this.bundle=bundle;this.lazy=bundle.schema===3;this.refs={...bundle.geometries};
      this.geometryReady=new Set();this.supports=new Map();this.windows=new Map();this.pending=new Map();
    }
    async resource(ref){
      if(this.pending.has(ref.url))return this.pending.get(ref.url);
      const promise=(async()=>{
        if(!window.DecompressionStream)throw new Error('This browser needs an update to load the interactive maps.');
        const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),20000);
        try{
          const response=await fetch(new URL(ref.url,document.baseURI),{signal:abort.signal});
          if(!response.ok)throw new Error('Could not download this view.');
          const compressed=await response.arrayBuffer();
          const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',compressed)),v=>v.toString(16).padStart(2,'0')).join('');
          if(hash!==ref.sha256)throw new Error('The downloaded view could not be verified.');
          const raw=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
          if(raw.byteLength!==ref.decodedBytes)throw new Error('Incomplete data block');
          return unpack(raw);
        }finally{clearTimeout(timeout);}
      })();
      this.pending.set(ref.url,promise);
      try{return await promise;}finally{this.pending.delete(ref.url);}
    }
    block(cell,hemi,index){return cell.streams[hemi].blocks[Math.floor(index/this.bundle.blockFrames)];}
    peek(cell,hemi,index){
      if(!this.lazy)return {cell,index};
      const ref=this.block(cell,hemi,index),cached=this.windows.get(ref.url);
      if(!cached||!this.geometryReady.has(hemi))return null;
      this.windows.delete(ref.url);this.windows.set(ref.url,cached);
      return {cell:cached,index:index-ref.start};
    }
    async ensure(cell,hemi,index){
      if(!this.lazy)return {cell,index};
      const ready=this.peek(cell,hemi,index);if(ready)return ready;
      const stream=cell.streams[hemi],ref=this.block(cell,hemi,index),key=cell.id+':'+hemi;
      const [geometry,support,values]=await Promise.all([
        this.geometryReady.has(hemi)?this.bundle.geometries[hemi]:this.resource(this.refs[hemi]).then(value=>{this.bundle.geometries[hemi]=value;this.geometryReady.add(hemi);return value;}),
        this.supports.get(key)||this.resource(stream.support).then(value=>{this.supports.set(key,value);return value;}),
        this.windows.has(ref.url)?null:this.resource(ref)
      ]);
      this.bundle.geometries[hemi]=geometry;this.geometryReady.add(hemi);this.supports.set(key,support);
      if(!this.windows.has(ref.url)){
        const tasks=Object.fromEntries(this.bundle.tasks.map(t=>[t.id,{[hemi]:{...support[t.id],values:values[t.id]}}]));
        this.windows.set(ref.url,{...cell,tasks});
      }
      while(this.windows.size>12)this.windows.delete(this.windows.keys().next().value);
      return this.peek(cell,hemi,index);
    }
    prefetch(cell,hemi,index){
      if(!this.lazy)return;
      const start=this.block(cell,hemi,index).start;
      for(const next of [start+this.bundle.blockFrames,start+2*this.bundle.blockFrames])
        if(next<cell.times.length)this.ensure(cell,hemi,next).catch(()=>{});
    }
  }
  window.LexicalDataLoader=DataLoader;
}());
