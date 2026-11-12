"""Independently reconstruct every public block and check the 16→32 Hz transition."""
import argparse, base64, gzip, hashlib, json, struct
from pathlib import Path
import numpy as np
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--baseline',type=Path,required=True);p.add_argument('--site',type=Path,required=True);a=p.parse_args()
def bundle(p): return json.loads(p.read_text().removeprefix('window.LexicalRealBundle=').strip().removesuffix(';'))
def decode(o): return np.frombuffer(base64.b64decode(o['data']),dtype=o['dtype']).reshape(o['shape'])
source=bundle(a.output/'meta/real-data.js'); old=bundle(a.baseline/'meta/real-data.js'); manifest=bundle(a.site/'real-data.js'); resources=set()
def load(ref):
 path=a.site/ref['url'].removeprefix('./');compressed=path.read_bytes();assert hashlib.sha256(compressed).hexdigest()==ref['sha256'];assert len(compressed)==ref['bytes'];resources.add(path)
 raw=gzip.decompress(compressed);assert len(raw)==ref['decodedBytes'];n=struct.unpack('<I',raw[:4])[0];header=json.loads(raw[4:4+n]);payload=raw[4+n:]
 def restore(o):
  if isinstance(o,dict) and 'offset' in o:return np.frombuffer(payload[o['offset']:o['offset']+o['bytes']],dtype=o['dtype']).reshape(o['shape'])
  if isinstance(o,dict):return {k:restore(v) for k,v in o.items()}
  return o
 return restore(header)
for hemi in ('lh','rh'):
 actual=load(manifest['geometries'][hemi])
 for key,value in source['geometries'][hemi].items():
  np.testing.assert_array_equal(actual[key],decode(value));np.testing.assert_array_equal(actual[key],decode(old['geometries'][hemi][key]))
checks=[]
for key,c in source['cells'].items():
 previous=old['cells'][key];np.testing.assert_array_equal(c['times'][::2],previous['times']);np.testing.assert_allclose(np.diff(c['times']),31.25,rtol=0,atol=1e-6)
 for name in ['counts','level','upper','selectionWindow','kernel','bandwidth','reach','exactOverlapCounts']:assert c[name]==previous[name],(key,name)
 for task,rois in c['roiTraces'].items():
  for roi,curve in rois.items():assert curve['n']==previous['roiTraces'][task][roi]['n'];assert curve['mean'][::2]==previous['roiTraces'][task][roi]['mean']
 for hemi in ('lh','rh'):
  stream=manifest['cells'][key]['streams'][hemi];support=load(stream['support']);blocks=[load(ref) for ref in stream['blocks']]
  assert [ref['start'] for ref in stream['blocks']]==list(range(0,len(c['times']),8))
  for task,layers in c['tasks'].items():
   actual=np.concatenate([block[task] for block in blocks]);np.testing.assert_array_equal(actual,decode(layers[hemi]['values']));np.testing.assert_array_equal(support[task]['support'],decode(layers[hemi]['support']));assert support[task]['scale']==layers[hemi]['scale']
   prior=previous['tasks'][task][hemi];np.testing.assert_allclose(actual[::2]*layers[hemi]['scale'],decode(prior['values'])*prior['scale'],atol=(layers[hemi]['scale']+prior['scale'])*.501,rtol=0)
   checks.append(key+'/'+task+'/'+hemi)
report={'status':'passed','field_comparisons':len(checks),'chunks_verified':len(resources),'native_step_ms':31.25,'old_times_and_curves_preserved':True,'chunk_arrays_lossless':True,'manifest_bytes':(a.site/'real-data.js').stat().st_size,'all_chunk_bytes':sum(p.stat().st_size for p in resources),'notes':['Original geometry is byte-identical after decoding.','Shared frames differ only within the combined int16 quantization bounds.']}
(a.output/'meta/stream-validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
