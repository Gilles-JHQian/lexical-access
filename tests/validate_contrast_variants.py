#!/usr/bin/env python3
"""Independent temporal/mask checks and complete lossless chunk reconstruction."""
import argparse,base64,gzip,hashlib,json,struct,sys
from pathlib import Path
import h5py
import numpy as np
import pandas as pd
from scipy.spatial import cKDTree
p=argparse.ArgumentParser()
for name in ('output','baseline','workspace','viz','recon','bids','site'):p.add_argument('--'+name,type=Path,required=True)
a=p.parse_args();sys.path.insert(0,str(a.viz))
from plotters.surface_field import compute_surface_field
from plotters.surface_geom import _get_surface_cache
from plotters.density_config import DensityKernel

def bundle(path):return json.loads(path.read_text().removeprefix('window.LexicalRealBundle=').strip().removesuffix(';'))
def unpack(v):return np.frombuffer(base64.b64decode(v['data']),dtype=v['dtype']).reshape(v['shape'])
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
data=bundle(a.output/'meta/real-data.js');base=bundle(a.baseline/'meta/real-data.js');manifest=bundle(a.site/'real-data.js')
assert data['geometries']==base['geometries']
for key,value in base['cells'].items():assert data['cells'][key]==value
assert len(data['cells'])==14
resources=set()
def load(ref):
 path=a.site/ref['url'].removeprefix('./');compressed=path.read_bytes();assert digest(path)==ref['sha256'] and len(compressed)==ref['bytes'];resources.add(path)
 raw=gzip.decompress(compressed);assert len(raw)==ref['decodedBytes'];size=struct.unpack('<I',raw[:4])[0];header=json.loads(raw[4:4+size]);arrays=raw[4+size:]
 def visit(v):
  if isinstance(v,dict) and 'offset' in v:return np.frombuffer(arrays[v['offset']:v['offset']+v['bytes']],dtype=v['dtype']).reshape(v['shape'])
  if isinstance(v,dict):return {k:visit(x) for k,x in v.items()}
  if isinstance(v,list):return [visit(x) for x in v]
  return v
 return visit(header)
for h in ('lh','rh'):
 g=load(manifest['geometries'][h])
 for k,v in data['geometries'][h].items():np.testing.assert_array_equal(g[k],unpack(v))
for key,c in data['cells'].items():
 for h in ('lh','rh'):
  stream=manifest['cells'][key]['streams'][h];support=load(stream['support']);blocks=[load(r) for r in stream['blocks']]
  for t,hemis in c['tasks'].items():
   np.testing.assert_array_equal(support[t]['support'],unpack(hemis[h]['support']));assert support[t]['scale']==hemis[h]['scale']
   np.testing.assert_array_equal(np.concatenate([b[t] for b in blocks]),unpack(hemis[h]['values']))
# Explicit native-sample convolution does not call the export smoothing helper.
sigma=.05*128;radius=int(4*sigma+.5);x=np.arange(-radius,radius+1);weights=np.exp(-.5*(x/sigma)**2);weights/=weights.sum()
con=a.workspace/'figs/lexical-access-poster/formal/figure-03/meta';table=pd.read_csv(con/'figure-3_hga-contrast_group3.csv')
panels=json.loads((con/'figure-3_hga-contrast_group3.canvas.json').read_text())['scientific_details']['panels']
record=json.loads((a.output/'meta/export-validation.json').read_text());checks=[];motion=[]
ids={h:cKDTree(_get_surface_cache(str(a.recon),'avg35','inflated',h)['verts']).query(unpack(data['geometries'][h]['positions']))[1] for h in ('lh','rh')}
for key,c in base['cells'].items():
 if c['metric']!='contrast':continue
 phase='Stimulus' if c['align']=='onset' else 'Delay';direction='NwWd' if c['direction']=='nwwd' else 'WdNw'
 panelkey=f'group-3/{"stimuluslate" if c["align"]=="onset" else "offsetpost"}-{c["direction"]}';panel=next(p for p in panels if p['key']==panelkey)
 arrays=np.load(a.workspace/'figs/lexical-access-paper/draft/contrast/task-average-union-preview/meta'/panelkey/'contour.npz')
 for task_id,task in [('passive','Passive'),('decision','Decision'),('repeat','Repeat')]:
  allnames=arrays[task+'_names'].astype(str);keep=np.isin(allnames,panel['task_sets'][task]);names=allnames[keep];v=arrays[task+'_Difference_values'][keep];times=arrays[task+'_times']
  coords=table[(table.panel==panelkey)&(table.condition==task)].drop_duplicates('name').set_index('name').loc[names,['x','y','z']].to_numpy(float)
  mask=np.zeros(v.shape,bool)
  for subject in sorted({n.split('_')[0] for n in names}):
   path=a.bids/'derivatives/statistics'/f'sub-{subject}'/'bipolar(diff)(sdr1p05)'/f'sub-{subject}_task-UniquenessPoint_proc-{phase}_space-{direction}_rec-stimType_desc-{task}_highgamma.h5'
   with h5py.File(path) as f: audit_path=f.attrs['audit_path'];sig=set(f['sig_ch_names'].asstr()[:]);window=f.attrs['strict_region_seconds']
   with h5py.File(audit_path) as f:
    np.testing.assert_allclose(f['times'][:],times,rtol=0,atol=1e-9)
    raw_names=f['ch_names'].asstr()[:];strict=f['strict_mask'][:];stat=f['statistic'][:];valid=f['observed_valid'][:]
   lookup={n if n.startswith(subject+'_') else subject+'_'+n:i for i,n in enumerate(raw_names)}
   for row,n in enumerate(names):
    if n.split('_')[0]!=subject:continue
    i=lookup[n];mask[row]=strict[i] & (stat[i]>0 if direction=='NwWd' else stat[i]<0) & valid[i] & (raw_names[i] in sig)
  sample=np.array(record['cells'][key][task_id]['frame_indices']);fi=int(np.argmax(mask[:,sample].sum(0)))
  for hemi in ('lh','rh'):
   rows=coords[:,0]<0 if hemi=='lh' else coords[:,0]>0
   np.testing.assert_array_equal(mask[rows][:,sample].sum(0),data['cells'][key+'-cluster']['activeCounts'][task_id][hemi])
   raw=unpack(c['tasks'][task_id][hemi]['values'])*c['tasks'][task_id][hemi]['scale']
   smooth_task=data['cells'][key+'-smooth']['tasks'][task_id][hemi];smooth=unpack(smooth_task['values'])*smooth_task['scale']
   motion.append({'cell':key,'task':task_id,'hemi':hemi,'raw_change':float(np.abs(np.diff(raw,axis=0)).mean()),'smoothed_change':float(np.abs(np.diff(smooth,axis=0)).mean())})
   # All tested frames in the web window have a full native convolution kernel.
   j=sample[fi];assert j>=radius and j+radius<len(times)
   for variant,values in [('smooth',v[:,j-radius:j+radius+1]@weights),('cluster',np.where(mask[:,j],v[:,j],0))]:
    target=data['cells'][key+'-'+variant]['tasks'][task_id][hemi]
    computed=compute_surface_field(str(a.recon),'avg35',hemi,coords[rows],values[rows],bandwidth=7,max_distance=15,kernel=DensityKernel(method='tissue')).values[ids[hemi]]
    error=float(np.max(np.abs(computed-unpack(target['values'])[fi]*target['scale'])))
    assert error<=target['scale']*.501+1e-8
    if variant=='cluster':
     outside=(np.array(c['times'])<window[0]*1000)|(np.array(c['times'])>window[1]*1000)
     assert not unpack(target['values'])[outside].any()
    checks.append({'cell':key,'task':task_id,'hemi':hemi,'variant':variant,'frame':fi,'error':error})
assert all(m['smoothed_change']<=m['raw_change']+1e-9 for m in motion)
report={'status':'passed','original_cells_unchanged':6,'new_cells':8,'chunks_verified':len(resources),'field_checks':checks,'motion':motion,'median_temporal_change_ratio':float(np.median([m['smoothed_change']/m['raw_change'] for m in motion if m['raw_change']>0])),'formal_mask_outside_window_zero':True,'masked_contact_counts_exact':True,'all_stream_arrays_lossless':True}
(a.output/'meta/contrast-variant-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ('field_checks','motion')},indent=2))
