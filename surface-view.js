/* Render only aggregate template fields; no participant/contact data enter the browser. */
(function () {
  'use strict';
  const decode = object => {
    const bytes=Uint8Array.from(atob(object.data), c=>c.charCodeAt(0));
    const Type={'<f4':Float32Array,'<u2':Uint16Array,'<i2':Int16Array,'|u1':Uint8Array}[object.dtype];
    return new Type(bytes.buffer);
  };
  const geometryCache = new Map();
  const fieldCache = new WeakMap();
  function geometry(bundle, hemi) {
    if (geometryCache.has(hemi)) return geometryCache.get(hemi);
    const source=bundle.geometries[hemi], positions=decode(source.positions), faces=decode(source.faces), colors=decode(source.colors);
    const p=[],sign=hemi==='lh'?-1:1;
    for(let i=0;i<positions.length;i+=3) p.push([sign*positions[i+1],-positions[i+2],sign*positions[i]]);
    const minx=Math.min(...p.map(v=>v[0])),maxx=Math.max(...p.map(v=>v[0]));
    const miny=Math.min(...p.map(v=>v[1])),maxy=Math.max(...p.map(v=>v[1]));
    const scale=Math.min(620/(maxx-minx),380/(maxy-miny));
    p.forEach(v=>{v[0]=(v[0]-(minx+maxx)/2)*scale+340;v[1]=(v[1]-(miny+maxy)/2)*scale+215;});
    const triangles=[];
    for(let i=0;i<faces.length;i+=3) {
      const ids=[faces[i],faces[i+1],faces[i+2]], points=ids.map(k=>p[k]);
      // Painter ordering respects lateral viewing depth. Curvature remains from the template.
      const gray=Math.round(ids.reduce((s,k)=>s+(colors[k*3]+colors[k*3+1]+colors[k*3+2])/3,0)/3);
      triangles.push({ids,points,depth:points.reduce((s,v)=>s+v[2],0)/3,gray});
    }
    triangles.sort((a,b)=>a.depth-b.depth);
    const result={p,triangles};geometryCache.set(hemi,result);return result;
  }
  function fields(cell,task,hemi) {
    const raw=cell.tasks[task][hemi];
    if (!fieldCache.has(raw)) fieldCache.set(raw,{values:decode(raw.values),support:decode(raw.support),scale:raw.scale,n:raw.values.shape[1]});
    return fieldCache.get(raw);
  }
  function polygon(ctx,points) {
    ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();
  }
  function clip(poly, task, sign, level) {
    const result=[];
    for(let i=0;i<poly.length;i++) {
      const a=poly[i],b=poly[(i+1)%poly.length],av=a.v[task]*sign-level,bv=b.v[task]*sign-level;
      if(av>=0)result.push(a);
      if((av>=0)!==(bv>=0)) {
        const t=av/(av-bv);
        result.push({p:[a.p[0]+t*(b.p[0]-a.p[0]),a.p[1]+t*(b.p[1]-a.p[1])],v:a.v.map((v,k)=>v+t*(b.v[k]-v))});
      }
    }
    return result;
  }
  class CanvasSurfaceView {
    constructor(canvas,bundle,hemi) {
      this.canvas=canvas;this.bundle=bundle;this.hemi=hemi;
      canvas.width=680;canvas.height=430;this.ctx=canvas.getContext('2d');
      this.mesh=geometry(bundle,hemi);
      const tile=document.createElement('canvas');tile.width=12;tile.height=12;const c=tile.getContext('2d');
      c.strokeStyle='rgba(16,45,73,.8)';c.lineWidth=2;c.beginPath();c.moveTo(0,12);c.lineTo(12,0);c.stroke();this.hatch=this.ctx.createPattern(tile,'repeat');
    }
    draw(cell,index,{task=null,scope='all'}={}) {
      const ctx=this.ctx;ctx.clearRect(0,0,680,430);
      const tasks=this.bundle.tasks, layers=tasks.map(t=>fields(cell,t.id,this.hemi));
      const chosen=task===null?null:tasks.findIndex(t=>t.id===task);
      const level=cell.level, upper=cell.upper;
      for(const tri of this.mesh.triangles) {
        const ids=tri.ids, pts=tri.points;
        const values=layers.map(f=>ids.map(id=>f.values[index*f.n+id]*f.scale));
        const supported=layers.map(f=>ids.every(id=>f.support[id]));
        polygon(ctx,pts);ctx.fillStyle=`rgb(${tri.gray},${tri.gray},${tri.gray})`;ctx.fill();
        // Tiny seam fill on gray anatomy only; no expansion of scientific contours.
        ctx.strokeStyle=`rgb(${tri.gray},${tri.gray},${tri.gray})`;ctx.lineWidth=.55;ctx.stroke();
        if(chosen!==null) {
          if(!supported[chosen])continue;
          const value=values[chosen].reduce((a,b)=>a+b,0)/3;
          const alpha=Math.min(.82,Math.pow(Math.abs(value)/upper,.75)*.7);
          ctx.fillStyle=value>=0?`rgba(194,70,32,${alpha})`:`rgba(35,104,162,${alpha})`;ctx.fill();
        } else {
          const selected=scope==='active'?[1,2]:[0,1,2];
          for(const sign of [1,-1]) {
            if(scope!=='none'&&selected.every(t=>supported[t])) {
              let poly=ids.map((id,k)=>({p:pts[k],v:values.map(v=>v[k])}));
              for(const t of selected) {poly=clip(poly,t,sign,level);if(poly.length<3)break;}
              if(poly.length>=3) {polygon(ctx,poly.map(v=>v.p));ctx.fillStyle=this.hatch;ctx.fill();}
            }
            tasks.forEach((t,j)=>{
              if(!supported[j])return;
              const crossings=[];
              for(let e=0;e<3;e++){
                const next=(e+1)%3,a=sign*values[j][e]-level,b=sign*values[j][next]-level;
                if((a>=0)!==(b>=0)) {const f=a/(a-b);crossings.push([pts[e][0]+f*(pts[next][0]-pts[e][0]),pts[e][1]+f*(pts[next][1]-pts[e][1])]);}
              }
              if(crossings.length===2){ctx.beginPath();ctx.moveTo(...crossings[0]);ctx.lineTo(...crossings[1]);ctx.lineWidth=2.8;ctx.strokeStyle=t.color;ctx.setLineDash(sign<0?[4,3]:[]);ctx.stroke();ctx.setLineDash([]);}
            });
          }
        }
      }
    }
  }
  class SurfaceView {
    constructor(canvas,bundle,hemi) {
      const gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:true});
      if(!gl) return new CanvasSurfaceView(canvas,bundle,hemi);
      if(!gl.getExtension('OES_standard_derivatives')) throw new Error('Surface contours require standard derivatives.');
      this.gl=gl;this.bundle=bundle;this.hemi=hemi;canvas.width=680;canvas.height=430;canvas.dataset.renderer='webgl';
      const mesh=geometry(bundle,hemi),raw=bundle.geometries[hemi],faces=decode(raw.faces),positions=decode(raw.positions);
      const normals=new Float32Array(positions.length);
      for(let f=0;f<faces.length;f+=3){
        const a=faces[f]*3,b=faces[f+1]*3,c=faces[f+2]*3;
        const u=[0,1,2].map(i=>positions[b+i]-positions[a+i]),v=[0,1,2].map(i=>positions[c+i]-positions[a+i]);
        const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
        for(const k of [a,b,c])for(let i=0;i<3;i++)normals[k+i]+=n[i];
      }
      const depth=mesh.p.map(p=>p[2]),low=Math.min(...depth),high=Math.max(...depth),sign=hemi==='lh'?-1:1;
      const projected=new Float32Array(positions.length),smoothNormals=new Float32Array(positions.length);
      mesh.p.forEach((p,i)=>{projected.set([p[0]/340-1,1-p[1]/215,.9-1.8*(p[2]-low)/(high-low)],i*3);const n=normals.subarray(i*3,i*3+3),length=Math.hypot(...n)||1;smoothNormals.set([sign*n[1]/length,-n[2]/length,sign*n[0]/length],i*3);});
      const vertex=`attribute vec3 position;attribute vec3 normal;attribute vec3 color;attribute vec3 value;attribute vec3 support;
        varying vec3 vColor;varying vec3 vNormal;varying vec3 vValue;varying vec3 vSupport;
        void main(){gl_Position=vec4(position,1.0);vColor=color;vNormal=normal;vValue=value;vSupport=support;}`;
      const fragment=`#extension GL_OES_standard_derivatives : enable
        precision highp float;varying vec3 vColor;varying vec3 vNormal;varying vec3 vValue;varying vec3 vSupport;
        uniform float upper;uniform float level;uniform int task;uniform int scope;
        void main(){
          float light=.76+.24*max(0.0,dot(normalize(vNormal),normalize(vec3(-.3,-.5,1.0))));
          vec3 base=vColor*light;vec3 result=base;
          if(task>=0){
            float v=task==0?vValue.x:(task==1?vValue.y:vValue.z);float s=task==0?vSupport.x:(task==1?vSupport.y:vSupport.z);
            if(s>.999){vec3 ink=v>=0.0?vec3(.76,.27,.12):vec3(.14,.41,.64);float a=min(.85,pow(abs(v)/upper,.75)*.8);result=mix(base,ink,a);}
          }else{
            bool positive=vValue.y>=level&&vValue.z>=level&&vSupport.y>.999&&vSupport.z>.999;
            bool negative=vValue.y<=-level&&vValue.z<=-level&&vSupport.y>.999&&vSupport.z>.999;
            if(scope==1){positive=positive&&vValue.x>=level&&vSupport.x>.999;negative=negative&&vValue.x<=-level&&vSupport.x>.999;}
            if(scope>0&&(positive||negative)){float stripe=step(mod(gl_FragCoord.x+gl_FragCoord.y,11.0),2.6);result=mix(result,vec3(.06,.18,.29),.65*stripe);}
            vec3 w=max(fwidth(vValue),vec3(.00001));vec3 lines=vec3(1.0)-smoothstep(w*.8,w*1.9,abs(abs(vValue)-vec3(level)));
            lines*=step(vec3(.999),vSupport);
            float dash=step(4.0,mod(gl_FragCoord.x+gl_FragCoord.y,12.0));
            if(vValue.x<0.0)lines.x*=dash;if(vValue.y<0.0)lines.y*=dash;if(vValue.z<0.0)lines.z*=dash;
            result=mix(result,vec3(.22,.49,.35),lines.x);result=mix(result,vec3(.66,.22,.23),lines.y);result=mix(result,vec3(.14,.41,.74),lines.z);
          }
          gl_FragColor=vec4(result,1.0);
        }`;
      const shader=(type,code)=>{const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
      const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);this.program=program;this.buffers={};
      const attr=(name,array)=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,array,gl.DYNAMIC_DRAW);const location=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,3,gl.FLOAT,false,0,0);this.buffers[name]=b;};
      attr('position',projected);attr('normal',smoothNormals);attr('color',Float32Array.from(decode(raw.colors),v=>v/255));attr('value',new Float32Array(positions.length));attr('support',new Float32Array(positions.length));
      const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,faces,gl.STATIC_DRAW);this.count=faces.length;this.n=positions.length/3;this.values=new Float32Array(positions.length);this.supports=new Float32Array(positions.length);
      this.uniforms=Object.fromEntries(['upper','level','task','scope'].map(k=>[k,gl.getUniformLocation(program,k)]));
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0,0,0,0);gl.viewport(0,0,680,430);
    }
    draw(cell,index,{task=null,scope='all'}={}){
      const gl=this.gl,layers=this.bundle.tasks.map(t=>fields(cell,t.id,this.hemi));
      for(let i=0;i<this.n;i++)for(let t=0;t<3;t++){this.values[i*3+t]=layers[t].values[index*this.n+i]*layers[t].scale;this.supports[i*3+t]=layers[t].support[i];}
      gl.useProgram(this.program);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffers.value);gl.bufferSubData(gl.ARRAY_BUFFER,0,this.values);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffers.support);gl.bufferSubData(gl.ARRAY_BUFFER,0,this.supports);
      gl.uniform1f(this.uniforms.upper,cell.upper);gl.uniform1f(this.uniforms.level,cell.level);gl.uniform1i(this.uniforms.task,task===null?-1:this.bundle.tasks.findIndex(t=>t.id===task));gl.uniform1i(this.uniforms.scope,scope==='none'?0:scope==='all'?1:2);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.drawElements(gl.TRIANGLES,this.count,gl.UNSIGNED_SHORT,0);
    }
    destroy(){if(this.gl){const extension=this.gl.getExtension('WEBGL_lose_context');if(extension)extension.loseContext();}}
  }
  window.LexicalSurfaceView=SurfaceView;
}());
