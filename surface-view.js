/* Aggregate template geometry and fields only; all explorer panels share a camera. */
(function () {
  'use strict';
  const ASPECT=680/430;
  const decode=object=>{
    const bytes=Uint8Array.from(atob(object.data),c=>c.charCodeAt(0));
    const Type={'<f4':Float32Array,'<u2':Uint16Array,'<i2':Int16Array,'|u1':Uint8Array}[object.dtype];
    return new Type(bytes.buffer);
  };
  const geometryCache=new WeakMap(),fieldCache=new WeakMap();
  function softenAnatomyColors(colors,faces){
    // Two local half-steps antialias the binary curvature backdrop only.
    // Neural fields, support and contour levels never enter this operation.
    const sums=new Float32Array(colors.length),degree=new Uint16Array(colors.length/3);
    for(const id of faces)degree[id]+=2;
    for(let pass=0;pass<2;pass++){
      sums.fill(0);
      for(let f=0;f<faces.length;f+=3)for(let j=0;j<3;j++){
        const a=faces[f+j],b=faces[f+(j+1)%3],c=faces[f+(j+2)%3];
        for(let k=0;k<3;k++)sums[a*3+k]+=colors[b*3+k]+colors[c*3+k];
      }
      for(let i=0;i<colors.length;i++)if(degree[Math.floor(i/3)])colors[i]=.5*colors[i]+.5*sums[i]/degree[Math.floor(i/3)];
    }
    return colors;
  }
  function geometry(bundle,hemi){
    if(!geometryCache.has(bundle))geometryCache.set(bundle,new Map());
    const cache=geometryCache.get(bundle);if(cache.has(hemi))return cache.get(hemi);
    const raw=bundle.geometries[hemi],source=decode(raw.positions),faces=decode(raw.faces);
    let normals=raw.normals?decode(raw.normals):new Float32Array(source.length);
    if(!raw.normals){
      for(let f=0;f<faces.length;f+=3){
        const a=faces[f]*3,b=faces[f+1]*3,c=faces[f+2]*3;
        const u=[0,1,2].map(i=>source[b+i]-source[a+i]),v=[0,1,2].map(i=>source[c+i]-source[a+i]);
        const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
        for(const k of [a,b,c])for(let j=0;j<3;j++)normals[k+j]+=n[j];
      }
    }
    const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
    for(let i=0;i<source.length;i++) {lo[i%3]=Math.min(lo[i%3],source[i]);hi[i%3]=Math.max(hi[i%3],source[i]);}
    const center=lo.map((v,i)=>(v+hi[i])/2),sign=hemi==='lh'?-1:1;
    const positions=new Float32Array(source.length),viewNormals=new Float32Array(source.length);let radius=0;
    for(let i=0;i<source.length;i+=3){
      const xyz=[sign*(source[i+1]-center[1]),source[i+2]-center[2],sign*(source[i]-center[0])];
      positions.set(xyz,i);radius=Math.max(radius,Math.hypot(...xyz));
      const length=Math.hypot(normals[i],normals[i+1],normals[i+2])||1;
      // Position and normal use the SAME right-handed transform, including superior +Y.
      viewNormals.set([sign*normals[i+1]/length,normals[i+2]/length,sign*normals[i]/length],i);
    }
    const mesh={positions,normals:viewNormals,faces,colors:softenAnatomyColors(Float32Array.from(decode(raw.colors),v=>v/255),faces),radius};
    cache.set(hemi,mesh);return mesh;
  }
  function cameraFrame(mesh,camera={yaw:0,pitch:0}){
    const key=`${camera.yaw}:${camera.pitch}`;if(mesh.frame?.key===key)return mesh.frame;
    const y=camera.yaw*Math.PI/180,p=camera.pitch*Math.PI/180,cy=Math.cos(y),sy=Math.sin(y),cp=Math.cos(p),sp=Math.sin(p);
    // Column-major Rx(pitch) * Ry(yaw), in the default lateral camera coordinates.
    const rotation=new Float32Array([cy,sp*sy,-cp*sy,0,cp,sp,sy,-sp*cy,cp*cy]);
    let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;
    for(let i=0;i<mesh.positions.length;i+=3){
      const x=mesh.positions[i],v=mesh.positions[i+1],z=mesh.positions[i+2];
      const xx=rotation[0]*x+rotation[3]*v+rotation[6]*z,yy=rotation[1]*x+rotation[4]*v+rotation[7]*z;
      left=Math.min(left,xx);right=Math.max(right,xx);bottom=Math.min(bottom,yy);top=Math.max(top,yy);
    }
    const halfHeight=Math.max((top-bottom)/2,(right-left)/2/ASPECT)/.90;
    mesh.frame={key,rotation,scale:new Float32Array([1/(halfHeight*ASPECT),1/halfHeight,1/(mesh.radius*1.15)]),offset:new Float32Array([(left+right)/2,(bottom+top)/2])};
    return mesh.frame;
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
    constructor(canvas,bundle,hemi){
      this.canvas=canvas;this.bundle=bundle;this.hemi=hemi;this.mesh=geometry(bundle,hemi);
      canvas.width=680;canvas.height=430;canvas.dataset.renderer='canvas2d';this.ctx=canvas.getContext('2d');
      const tile=document.createElement('canvas');tile.width=12;tile.height=12;const c=tile.getContext('2d');
      c.strokeStyle='rgba(16,45,73,.8)';c.lineWidth=2;c.beginPath();c.moveTo(0,12);c.lineTo(12,0);c.stroke();this.hatch=this.ctx.createPattern(tile,'repeat');
    }
    draw(cell,index,{task=null,scope='all',camera={yaw:0,pitch:0}}={}){
      const frame=cameraFrame(this.mesh,camera),m=frame.rotation,ctx=this.ctx;ctx.clearRect(0,0,680,430);
      this.canvas.dataset.camera=frame.key;
      if(this.projectedKey!==frame.key){
        const points=[];for(let i=0;i<this.mesh.positions.length;i+=3){
          const v=this.mesh.positions.subarray(i,i+3),q=[0,1,2].map(j=>m[j]*v[0]+m[j+3]*v[1]+m[j+6]*v[2]);
          points.push([(q[0]-frame.offset[0])*frame.scale[0]*340+340,215-(q[1]-frame.offset[1])*frame.scale[1]*215,q[2]]);
        }
        this.triangles=[];for(let f=0;f<this.mesh.faces.length;f+=3){
          const ids=Array.from(this.mesh.faces.subarray(f,f+3)),pts=ids.map(k=>points[k]);
          const gray=ids.reduce((sum,k)=>sum+this.mesh.colors[k*3],0)/3;
          this.triangles.push({ids,pts,depth:pts.reduce((sum,v)=>sum+v[2],0)/3,gray});
        }
        this.triangles.sort((a,b)=>a.depth-b.depth);this.projectedKey=frame.key;
      }
      const tasks=this.bundle.tasks,layers=tasks.map(t=>fields(cell,t.id,this.hemi)),chosen=task===null?null:tasks.findIndex(t=>t.id===task);
      for(const {ids,pts,gray} of this.triangles){
        const values=layers.map(f=>ids.map(id=>f.values[index*f.n+id]*f.scale)),supported=layers.map(f=>ids.every(id=>f.support[id]));
        const shade=Math.round((.66*.26+gray*.74)*.91*255);
        polygon(ctx,pts);ctx.fillStyle=`rgb(${shade},${shade},${shade})`;ctx.fill();ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=.4;ctx.stroke();
        if(chosen!==null){
          if(!supported[chosen])continue;const value=values[chosen].reduce((a,b)=>a+b,0)/3,alpha=Math.min(.85,Math.pow(Math.abs(value)/cell.upper,.75)*.8);
          ctx.fillStyle=value>=0?`rgba(194,70,32,${alpha})`:`rgba(35,104,162,${alpha})`;ctx.fill();
        }else{
          const selected=scope==='active'?[1,2]:[0,1,2];
          for(const sign of [1,-1]){
            if(scope!=='none'&&selected.every(t=>supported[t])){
              let poly=ids.map((id,k)=>({p:pts[k],v:values.map(v=>v[k])}));
              for(const t of selected){poly=clip(poly,t,sign,cell.level);if(poly.length<3)break;}
              if(poly.length>=3){polygon(ctx,poly.map(v=>v.p));ctx.fillStyle=this.hatch;ctx.fill();}
            }
            tasks.forEach((t,j)=>{
              if(!supported[j])return;const crossings=[];
              for(let e=0;e<3;e++){const next=(e+1)%3,a=sign*values[j][e]-cell.level,b=sign*values[j][next]-cell.level;
                if((a>=0)!==(b>=0)){const f=a/(a-b);crossings.push([pts[e][0]+f*(pts[next][0]-pts[e][0]),pts[e][1]+f*(pts[next][1]-pts[e][1])]);}}
              if(crossings.length===2){ctx.beginPath();ctx.moveTo(...crossings[0]);ctx.lineTo(...crossings[1]);ctx.lineWidth=2.8;ctx.strokeStyle=t.color;ctx.setLineDash(sign<0?[4,3]:[]);ctx.stroke();ctx.setLineDash([]);}
            });
          }
        }
      }
    }
    destroy(){}
  }
  class SurfaceView {
    constructor(canvas,bundle,hemi){
      const gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:true});
      if(!gl)return new CanvasSurfaceView(canvas,bundle,hemi);
      if(!gl.getExtension('OES_standard_derivatives'))throw new Error('Surface contours require standard derivatives.');
      this.gl=gl;this.canvas=canvas;this.bundle=bundle;this.hemi=hemi;this.mesh=geometry(bundle,hemi);
      canvas.dataset.renderer='webgl';canvas.dataset.faces=String(this.mesh.faces.length/3);
      const vertex=`attribute vec3 position;attribute vec3 normal;attribute vec3 color;attribute vec3 value;attribute vec3 support;
        uniform mat3 rotation;uniform vec3 scale;uniform vec2 offset;
        varying vec3 vColor;varying vec3 vNormal;varying vec3 vValue;varying vec3 vSupport;
        void main(){vec3 p=rotation*position;gl_Position=vec4((p.xy-offset)*scale.xy,-p.z*scale.z,1.0);vColor=color;vNormal=rotation*normal;vValue=value;vSupport=support;}`;
      const fragment=`#extension GL_OES_standard_derivatives : enable
        precision highp float;varying vec3 vColor;varying vec3 vNormal;varying vec3 vValue;varying vec3 vSupport;
        uniform float upper;uniform float level;uniform int task;uniform int scope;
        void main(){
          vec3 n=normalize(vNormal);
          float light=.62+.28*max(0.0,dot(n,normalize(vec3(-.35,.55,1.0))))+.10*max(0.0,dot(n,normalize(vec3(.6,.2,.75))));
          vec3 base=mix(vec3(.66,.68,.69),vColor,.74)*light;vec3 result=base;
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
      const attr=(name,array,usage=gl.STATIC_DRAW)=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,array,usage);const location=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,3,gl.FLOAT,false,0,0);this.buffers[name]=b;};
      attr('position',this.mesh.positions);attr('normal',this.mesh.normals);attr('color',this.mesh.colors);
      this.n=this.mesh.positions.length/3;this.values=new Float32Array(this.n*3);this.supports=new Float32Array(this.n*3);
      attr('value',this.values,gl.DYNAMIC_DRAW);attr('support',this.supports,gl.DYNAMIC_DRAW);
      const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,this.mesh.faces,gl.STATIC_DRAW);this.count=this.mesh.faces.length;
      this.uniforms=Object.fromEntries(['upper','level','task','scope','rotation','scale','offset'].map(k=>[k,gl.getUniformLocation(program,k)]));
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0,0,0,0);
    }
    draw(cell,index,{task=null,scope='all',camera={yaw:0,pitch:0}}={}){
      const gl=this.gl,frame=cameraFrame(this.mesh,camera);
      const rect=this.canvas.getBoundingClientRect(),visibleWidth=Math.min(rect.width||680,(rect.height||430)*ASPECT);
      const width=Math.max(320,Math.min(1440,Math.round(visibleWidth*Math.min(window.devicePixelRatio||1,2))));
      if(this.canvas.width!==width){this.canvas.width=width;this.canvas.height=Math.round(width/ASPECT);}
      gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.useProgram(this.program);
      // Dragging changes only camera uniforms; keep neural frame/support buffers on the GPU.
      if(this.lastCell!==cell||this.lastIndex!==index){
        const layers=this.bundle.tasks.map(t=>fields(cell,t.id,this.hemi));
        for(let i=0;i<this.n;i++)for(let t=0;t<3;t++)this.values[i*3+t]=layers[t].values[index*this.n+i]*layers[t].scale;
        gl.bindBuffer(gl.ARRAY_BUFFER,this.buffers.value);gl.bufferSubData(gl.ARRAY_BUFFER,0,this.values);
        if(this.lastCell!==cell){
          for(let i=0;i<this.n;i++)for(let t=0;t<3;t++)this.supports[i*3+t]=layers[t].support[i];
          gl.bindBuffer(gl.ARRAY_BUFFER,this.buffers.support);gl.bufferSubData(gl.ARRAY_BUFFER,0,this.supports);
        }
        this.lastCell=cell;this.lastIndex=index;
      }
      gl.uniformMatrix3fv(this.uniforms.rotation,false,frame.rotation);gl.uniform3fv(this.uniforms.scale,frame.scale);gl.uniform2fv(this.uniforms.offset,frame.offset);
      gl.uniform1f(this.uniforms.upper,cell.upper);gl.uniform1f(this.uniforms.level,cell.level);gl.uniform1i(this.uniforms.task,task===null?-1:this.bundle.tasks.findIndex(t=>t.id===task));gl.uniform1i(this.uniforms.scope,scope==='none'?0:scope==='all'?1:2);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.drawElements(gl.TRIANGLES,this.count,gl.UNSIGNED_SHORT,0);
      this.canvas.dataset.camera=frame.key;
    }
    destroy(){const extension=this.gl?.getExtension('WEBGL_lose_context');if(extension)extension.loseContext();}
  }
  window.LexicalSurfaceView=SurfaceView;
}());
