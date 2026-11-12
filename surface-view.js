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
  const DEFAULT_STYLE = {brightness:.97, curvature:.12, fillOpacity:.18, lineWidth:1.7, smoothing:1, overlap:'hatch'};
  const rgb = hex => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255);

  // Same supported-triangle, interpolated-edge and 0.6 mm normal lift as viewer's
  // preview/math.js contourSegments. Joining by mesh edge gives continuous dash phase.
  function contourSegments(positions,normals,faces,values,support,level,offset=.6) {
    const nodes=new Map(),edges=[];
    function crossing(a,b){
      const t=(level-values[a])/(values[b]-values[a]);
      const key=t===0?`v${a}`:t===1?`v${b}`:a<b?`${a}:${b}`:`${b}:${a}`;
      if(!nodes.has(key)){
        const n=[0,1,2].map(k=>normals[a*3+k]*(1-t)+normals[b*3+k]*t),length=Math.hypot(...n)||1;
        nodes.set(key,{p:[0,1,2].map(k=>positions[a*3+k]*(1-t)+positions[b*3+k]*t+offset*n[k]/length),edges:[]});
      }
      return key;
    }
    for(let f=0;f<faces.length;f+=3){
      const ids=[faces[f],faces[f+1],faces[f+2]];
      if(!ids.every(i=>support[i]&&Number.isFinite(values[i])))continue;
      const hits=[];
      for(let e=0;e<3;e++){const a=ids[e],b=ids[(e+1)%3];if((values[a]<level)!==(values[b]<level))hits.push(crossing(a,b));}
      if(hits.length===2&&hits[0]!==hits[1]){const id=edges.length;edges.push(hits);for(const k of hits)nodes.get(k).edges.push(id);}
    }
    const segments=[],distances=[],used=new Set();
    function walk(start,first){
      let key=start,id=first,distance=0;
      while(id!==undefined&&!used.has(id)){
        used.add(id);const edge=edges[id],next=edge[0]===key?edge[1]:edge[0],a=nodes.get(key).p,b=nodes.get(next).p;
        const length=Math.hypot(...a.map((v,k)=>v-b[k]));segments.push(...a,...b);distances.push(distance,length);distance+=length;
        key=next;id=nodes.get(key).edges.find(i=>!used.has(i));
      }
    }
    for(const [key,node] of nodes)if(node.edges.length!==2)for(const id of node.edges)if(!used.has(id))walk(key,id);
    edges.forEach((edge,id)=>{if(!used.has(id))walk(edge[0],id);});
    return {segments:new Float32Array(segments),distances:new Float32Array(distances)};
  }
  // Display-only regularization: resample connected isolines by arc length, then
  // smooth within a hard displacement bound. Raw HGA fields/support stay untouched.
  function smoothContours(lines,radius){
    if(!(radius>0)||!lines.segments.length)return lines;
    const paths=[];let path=null;
    for(let i=0;i<lines.segments.length/6;i++){
      if(!path||lines.distances[i*2]===0){path=[Array.from(lines.segments.subarray(i*6,i*6+3))];paths.push(path);}
      path.push(Array.from(lines.segments.subarray(i*6+3,i*6+6)));
    }
    const segments=[],distances=[];let maxDisplacement=0;
    for(const original of paths){
      const cumulative=[0];for(let i=1;i<original.length;i++)cumulative.push(cumulative.at(-1)+Math.hypot(...original[i].map((v,k)=>v-original[i-1][k])));
      const total=cumulative.at(-1);if(!total)continue;
      const closed=Math.hypot(...original[0].map((v,k)=>v-original.at(-1)[k]))<1e-5;
      const count=Math.max(closed?4:2,Math.ceil(total/.4)),sample=[];let at=1;
      for(let i=0;i<=(closed?count-1:count);i++){
        const distance=i/count*total;while(at<cumulative.length-1&&cumulative[at]<distance)at++;
        const t=(distance-cumulative[at-1])/Math.max(1e-9,cumulative[at]-cumulative[at-1]);sample.push(original[at].map((v,k)=>original[at-1][k]*(1-t)+v*t));
      }
      let points=sample;const passes=Math.max(1,Math.ceil((radius/.4)**2));
      for(let pass=0;pass<passes;pass++)points=points.map((p,i)=>{
        if(!closed&&(i===0||i===points.length-1))return p;
        const a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length];
        const q=p.map((v,k)=>.5*v+.25*a[k]+.25*b[k]),delta=q.map((v,k)=>v-sample[i][k]),length=Math.hypot(...delta),factor=length>radius?radius/length:1;
        return sample[i].map((v,k)=>v+delta[k]*factor);
      });
      points.forEach((p,i)=>maxDisplacement=Math.max(maxDisplacement,Math.hypot(...p.map((v,k)=>v-sample[i][k]))));
      if(closed)points.push(points[0]);let phase=0;
      for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],length=Math.hypot(...a.map((v,k)=>v-b[k]));segments.push(...a,...b);distances.push(phase,length);phase+=length;}
    }
    return {segments:new Float32Array(segments),distances:new Float32Array(distances),maxDisplacement};
  }

  function programFor(gl,vertex,fragment){
    const program=gl.createProgram();
    for(const [type,code] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
      const shader=gl.createShader(type);gl.shaderSource(shader,code);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program,shader);gl.deleteShader(shader);
    }
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));return program;
  }
  class ContourStrokes {
    constructor(gl,mesh,tasks){
      this.gl=gl;this.mesh=mesh;this.tasks=tasks;
      this.program=programFor(gl,`
        attribute vec3 start;attribute vec3 end;attribute vec2 corner;attribute vec2 phase;
        uniform mat3 rotation;uniform vec3 scale;uniform vec2 offset;uniform vec2 viewport;uniform float width;
        varying vec2 local;varying float lengthPx;varying float distanceMm;
        void main(){
          vec3 a=rotation*start,b=rotation*end;
          vec2 ac=(a.xy-offset)*scale.xy,bc=(b.xy-offset)*scale.xy;
          vec2 delta=(bc-ac)*viewport*.5;float len=max(length(delta),.001);vec2 tangent=delta/len;
          float halfWidth=width*.5+1.0;
          vec2 shift=tangent*(corner.x*2.0-1.0)*halfWidth+vec2(-tangent.y,tangent.x)*corner.y*halfWidth;
          vec3 p=mix(a,b,corner.x);gl_Position=vec4(mix(ac,bc,corner.x)+shift*2.0/viewport,-p.z*scale.z,1.0);
          local=vec2(corner.x*(len+2.0*halfWidth)-halfWidth,corner.y*halfWidth);lengthPx=len;
          distanceMm=phase.x+(local.x/len)*phase.y;
        }`,`
        precision highp float;uniform vec3 ink;uniform float width;uniform bool dashed;
        varying vec2 local;varying float lengthPx;varying float distanceMm;
        void main(){
          float edge=length(vec2(max(max(-local.x,local.x-lengthPx),0.0),local.y));
          float alpha=1.0-smoothstep(width*.5-.5,width*.5+.5,edge);
          if(dashed&&mod(distanceMm,3.5)>2.0)discard;
          if(alpha<=0.0)discard;gl_FragColor=vec4(ink,alpha);
        }`);
      this.uniforms=Object.fromEntries(['rotation','scale','offset','viewport','width','ink','dashed'].map(k=>[k,gl.getUniformLocation(this.program,k)]));
      this.attributes=Object.fromEntries(['start','end','corner','phase'].map(k=>[k,gl.getAttribLocation(this.program,k)]));
      this.layers=[];
    }
    update(cell,index,hemi,bundle,smoothing){
      if(this.cell===cell&&this.index===index&&this.smoothing===smoothing)return;
      const gl=this.gl,corners=[[0,-1],[1,-1],[1,1],[0,-1],[1,1],[0,1]];
      let layerIndex=0,total=0;
      for(const task of bundle.tasks)for(const sign of [1,-1]){
        const f=fields(cell,task.id,hemi),values=f.values.subarray(index*f.n,(index+1)*f.n);
        const lines=smoothContours(contourSegments(this.mesh.positions,this.mesh.normals,this.mesh.faces,values,f.support,sign*cell.level/f.scale),smoothing);
        const data=new Float32Array(lines.segments.length/6*60);
        for(let i=0;i<lines.segments.length/6;i++)for(let v=0;v<6;v++){
          const at=i*60+v*10;data.set(lines.segments.subarray(i*6,i*6+6),at);data.set(corners[v],at+6);data.set(lines.distances.subarray(i*2,i*2+2),at+8);
        }
        const layer=this.layers[layerIndex]||{buffer:gl.createBuffer()};
        layer.count=data.length/10;layer.color=rgb(task.color);layer.dashed=sign<0;
        gl.bindBuffer(gl.ARRAY_BUFFER,layer.buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);this.layers[layerIndex++]=layer;total+=lines.segments.length/6;
      }
      this.cell=cell;this.index=index;this.smoothing=smoothing;this.segmentCount=total;
    }
    draw(frame,width,height,lineWidth){
      const gl=this.gl,u=this.uniforms;gl.useProgram(this.program);
      gl.uniformMatrix3fv(u.rotation,false,frame.rotation);gl.uniform3fv(u.scale,frame.scale);gl.uniform2fv(u.offset,frame.offset);
      gl.uniform2f(u.viewport,width,height);gl.uniform1f(u.width,lineWidth);
      gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
      for(const layer of this.layers){
        gl.bindBuffer(gl.ARRAY_BUFFER,layer.buffer);
        for(const [name,size,offset] of [['start',3,0],['end',3,12],['corner',2,24],['phase',2,32]]){const a=this.attributes[name];gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,40,offset);}
        gl.uniform3fv(u.ink,layer.color);gl.uniform1i(u.dashed,layer.dashed?1:0);gl.drawArrays(gl.TRIANGLES,0,layer.count);
      }
      gl.depthMask(true);gl.disable(gl.BLEND);
    }
  }

  class CanvasSurfaceView {
    constructor(canvas,bundle,hemi){
      this.canvas=canvas;this.bundle=bundle;this.hemi=hemi;this.mesh=geometry(bundle,hemi);
      canvas.width=680;canvas.height=430;canvas.dataset.renderer='canvas2d';this.ctx=canvas.getContext('2d');
      const tile=document.createElement('canvas');tile.width=12;tile.height=12;const c=tile.getContext('2d');
      c.strokeStyle='rgba(16,45,73,.8)';c.lineWidth=2;c.beginPath();c.moveTo(0,12);c.lineTo(12,0);c.stroke();this.hatch=this.ctx.createPattern(tile,'repeat');
    }
    draw(cell,index,{task=null,scope='all',camera={yaw:0,pitch:0},style=DEFAULT_STYLE}={}){
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
        const shade=Math.round((style.brightness-style.curvature*(1-Math.max(0,Math.min(1,(gray-214/255)/(23/255)))))*.97*255);
        polygon(ctx,pts);ctx.fillStyle=`rgb(${shade},${shade},${shade})`;ctx.fill();ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=.4;ctx.stroke();
        if(chosen!==null){
          if(!supported[chosen])continue;const value=values[chosen].reduce((a,b)=>a+b,0)/3,alpha=Math.min(.85,Math.pow(Math.abs(value)/cell.upper,.75)*.8);
          ctx.fillStyle=value>=0?`rgba(194,70,32,${alpha})`:`rgba(35,104,162,${alpha})`;ctx.fill();
        }else{
          const selected=scope==='active'?[1,2]:[0,1,2];
          for(const sign of [1,-1]){
            if(scope!=='none'&&style.overlap!=='none'&&selected.every(t=>supported[t])){
              let poly=ids.map((id,k)=>({p:pts[k],v:values.map(v=>v[k])}));
              for(const t of selected){poly=clip(poly,t,sign,cell.level);if(poly.length<3)break;}
              if(poly.length>=3){polygon(ctx,poly.map(v=>v.p));ctx.fillStyle=style.overlap==='tint'?'rgba(30,62,92,.13)':this.hatch;ctx.fill();}
            }
            tasks.forEach((t,j)=>{
              if(!supported[j])return;
              let fill=clip(ids.map((id,k)=>({p:pts[k],v:values.map(v=>v[k])})),j,sign,cell.level);
              if(fill.length>=3){polygon(ctx,fill.map(v=>v.p));ctx.fillStyle=t.color;ctx.globalAlpha=style.fillOpacity;ctx.fill();ctx.globalAlpha=1;}
              const crossings=[];
              for(let e=0;e<3;e++){const next=(e+1)%3,a=sign*values[j][e]-cell.level,b=sign*values[j][next]-cell.level;
                if((a>=0)!==(b>=0)){const f=a/(a-b);crossings.push([pts[e][0]+f*(pts[next][0]-pts[e][0]),pts[e][1]+f*(pts[next][1]-pts[e][1])]);}}
              if(crossings.length===2){ctx.beginPath();ctx.moveTo(...crossings[0]);ctx.lineTo(...crossings[1]);ctx.lineWidth=style.lineWidth*1.6;ctx.strokeStyle=t.color;ctx.setLineDash(sign<0?[4,3]:[]);ctx.stroke();ctx.setLineDash([]);}
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
      this.gl=gl;this.canvas=canvas;this.bundle=bundle;this.hemi=hemi;this.mesh=geometry(bundle,hemi);
      canvas.dataset.renderer='webgl';canvas.dataset.faces=String(this.mesh.faces.length/3);
      const vertex=`attribute vec3 position;attribute vec3 normal;attribute vec3 color;attribute vec3 value;attribute vec3 support;
        uniform mat3 rotation;uniform vec3 scale;uniform vec2 offset;
        varying vec3 vColor;varying vec3 vNormal;varying vec3 vValue;varying vec3 vSupport;
        void main(){vec3 p=rotation*position;gl_Position=vec4((p.xy-offset)*scale.xy,-p.z*scale.z,1.0);vColor=color;vNormal=rotation*normal;vValue=value;vSupport=support;}`;
      const fragment=`
        precision highp float;varying vec3 vColor;varying vec3 vNormal;varying vec3 vValue;varying vec3 vSupport;
        uniform float upper;uniform float level;uniform int task;uniform int scope;uniform float brightness;uniform float curvature;uniform float fillOpacity;uniform int overlap;
        void main(){
          vec3 n=normalize(vNormal);
          float light=.88+.09*max(0.0,dot(n,normalize(vec3(-.35,.55,1.0))))+.03*max(0.0,dot(n,normalize(vec3(.6,.2,.75))));
          float fold=clamp((vColor.r-214.0/255.0)/(23.0/255.0),0.0,1.0);
          vec3 base=vec3(brightness-curvature*(1.0-fold))*light;vec3 result=base;
          if(task>=0){
            float v=task==0?vValue.x:(task==1?vValue.y:vValue.z);float s=task==0?vSupport.x:(task==1?vSupport.y:vSupport.z);
            if(s>.999){vec3 ink=v>=0.0?vec3(.76,.27,.12):vec3(.14,.41,.64);float a=min(.85,pow(abs(v)/upper,.75)*.8);result=mix(base,ink,a);}
          }else{
            bool positive=vValue.y>=level&&vValue.z>=level&&vSupport.y>.999&&vSupport.z>.999;
            bool negative=vValue.y<=-level&&vValue.z<=-level&&vSupport.y>.999&&vSupport.z>.999;
            if(scope==1){positive=positive&&vValue.x>=level&&vSupport.x>.999;negative=negative&&vValue.x<=-level&&vSupport.x>.999;}
            vec3 strengths=clamp((abs(vValue)-vec3(level))/max(.00001,upper-level),0.0,1.0)*step(vec3(.999),vSupport);
            float total=strengths.x+strengths.y+strengths.z;
            if(total>0.0){vec3 color=(strengths.x*vec3(.22,.49,.35)+strengths.y*vec3(.66,.22,.23)+strengths.z*vec3(.14,.41,.74))/total;result=mix(result,color,fillOpacity);}
            if(scope>0&&overlap>0&&(positive||negative)){
              float alpha=overlap==1?.24*step(mod(gl_FragCoord.x+gl_FragCoord.y,14.0),1.5):.12;
              result=mix(result,vec3(.12,.24,.36),alpha);
            }
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
      this.uniforms=Object.fromEntries(['upper','level','task','scope','rotation','scale','offset','brightness','curvature','fillOpacity','overlap'].map(k=>[k,gl.getUniformLocation(program,k)]));
      this.strokes=new ContourStrokes(gl,this.mesh,bundle.tasks);
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0,0,0,0);
    }
    draw(cell,index,{task=null,scope='all',camera={yaw:0,pitch:0},style=DEFAULT_STYLE}={}){
      const gl=this.gl,frame=cameraFrame(this.mesh,camera);
      const rect=this.canvas.getBoundingClientRect(),visibleWidth=Math.min(rect.width||680,(rect.height||430)*ASPECT);
      const width=Math.max(320,Math.min(1920,Math.round(visibleWidth*Math.min(window.devicePixelRatio||1,3)*1.5)));
      if(this.canvas.width!==width){this.canvas.width=width;this.canvas.height=Math.round(width/ASPECT);}
      gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.useProgram(this.program);
      for(const [name,buffer] of Object.entries(this.buffers)){const location=gl.getAttribLocation(this.program,name);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,3,gl.FLOAT,false,0,0);}
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
      gl.uniform1f(this.uniforms.brightness,style.brightness);gl.uniform1f(this.uniforms.curvature,style.curvature);gl.uniform1f(this.uniforms.fillOpacity,style.fillOpacity);gl.uniform1i(this.uniforms.overlap,style.overlap==='hatch'?1:style.overlap==='tint'?2:0);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.drawElements(gl.TRIANGLES,this.count,gl.UNSIGNED_SHORT,0);
      if(task===null){this.strokes.update(cell,index,this.hemi,this.bundle,style.smoothing);this.strokes.draw(frame,this.canvas.width,this.canvas.height,style.lineWidth*this.canvas.width/Math.max(1,visibleWidth));this.canvas.dataset.segments=this.strokes.segmentCount;}
      this.canvas.dataset.fillOpacity=style.fillOpacity;
      this.canvas.dataset.camera=frame.key;
    }
    destroy(){const extension=this.gl?.getExtension('WEBGL_lose_context');if(extension)extension.loseContext();}
  }
  SurfaceView.contourSegments=contourSegments;
  SurfaceView.smoothContours=smoothContours;
  SurfaceView.defaults=DEFAULT_STYLE;
  window.LexicalSurfaceView=SurfaceView;
}());
