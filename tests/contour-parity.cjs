// Numerical cross-check against the existing viewer's independent isoline routine.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve(process.env.SITE_POSTER_OUTPUT||path.join(__dirname,'../../lexical_access_site_preview/mobile-mesh-v6'));
const reference=path.resolve(process.env.SITE_VIEWER_MATH||path.join(__dirname,'../../lexical_access/brain_viewer/viewer_react/src/preview/math.js'));
const ctx=vm.createContext({window:{}});vm.runInContext(fs.readFileSync(path.join(__dirname,'../surface-view.js'),'utf8'),ctx);
const implementation=ctx.window.LexicalSurfaceView.contourSegments;
const source=fs.readFileSync(reference,'utf8'),start=source.indexOf('export function contourSegments('),end=source.indexOf('\nfunction rgb',start);
assert.ok(start>=0&&end>start);vm.runInContext(source.slice(start,end).replace('export function','function'),ctx);const viewer=ctx.contourSegments;
const bundle=JSON.parse(fs.readFileSync(path.join(output,'meta/real-data.js'),'utf8').replace(/^window.LexicalRealBundle=/,'').replace(/;\s*$/,''));
const decode=o=>{const b=Buffer.from(o.data,'base64');const types={'<f4':Float32Array,'<u2':Uint16Array,'<i2':Int16Array,'|u1':Uint8Array};return new types[o.dtype](b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));};
function signature(array){const a=[];for(let i=0;i<array.length;i+=3)a.push(Array.from(array.slice(i,i+3),v=>Math.round(v*1e4)).join(','));return a.sort();}
const checks=[];
for(const hemi of ['lh','rh'])for(const key of ['activation-onset','contrast-onset-nwwd','contrast-offset-wdnw'])for(const sign of [1,-1]){
 const g=bundle.geometries[hemi],c=bundle.cells[key],f=c.tasks.repeat[hemi],index=Math.floor(c.times.length/2),n=f.values.shape[1];
 const p=decode(g.positions),norm=decode(g.normals),faces=decode(g.faces),support=decode(f.support),values=Float32Array.from(decode(f.values).subarray(index*n,(index+1)*n),v=>v*f.scale);
 const actual=implementation(p,norm,faces,values,support,sign*c.level),expected=viewer(p,norm,faces,values,support,sign*c.level);
 assert.deepEqual(signature(actual.segments),signature(expected),hemi+'/'+key+'/'+sign);
 const smoothed=ctx.window.LexicalSurfaceView.smoothContours(actual,1);assert.ok((smoothed.maxDisplacement||0)<=1+1e-6);
 assert.ok(Array.from(smoothed.segments).every(Number.isFinite));
 assert.equal(actual.distances.length,actual.segments.length/3);assert.ok(Array.from(actual.distances).every(Number.isFinite));
 checks.push({hemi,cell:key,sign,segments:actual.segments.length/6,viewer_endpoints_match_to_mm:0.0001});
}
// No contour may bridge a missing/unsupported triangle.
const toy=implementation(new Float32Array([0,0,0,1,0,0,0,1,0]),new Float32Array([0,0,1,0,0,1,0,0,1]),new Uint16Array([0,1,2]),new Float32Array([0,1,1]),new Uint8Array([1,0,1]),.5);
assert.equal(toy.segments.length,0);
fs.writeFileSync(path.join(output,'meta/contour-parity.json'),JSON.stringify({status:'passed',checks,unsupported_triangle_excluded:true,reference,notes:['Endpoint order may differ: strokes join by mesh edges for continuous negative-line dashes.','No morphological closing, field smoothing or new significance tests.']},null,2));console.log('CONTOUR PARITY PASS: '+checks.length+' signed hemisphere/cell comparisons; unsupported triangle excluded');
