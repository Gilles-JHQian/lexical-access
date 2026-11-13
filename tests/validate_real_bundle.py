"""Independent checks of the shipped public summaries against their locked sources."""
import argparse,base64,hashlib,json,sys
from pathlib import Path
import numpy as np
import pandas as pd
from scipy.spatial import cKDTree
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--workspace',type=Path,required=True);p.add_argument('--viz',type=Path,required=True);p.add_argument('--recon',type=Path,required=True);a=p.parse_args()
sys.path.insert(0,str(a.viz));from plotters.surface_field import compute_surface_field
from plotters.surface_geom import _get_surface_cache
from plotters.density_config import DensityKernel
text=(a.output/'meta/real-data.js').read_text();data=json.loads(text.removeprefix('window.LexicalRealBundle=').removesuffix(';\n'));audit=json.loads((a.output/'meta/export-validation.json').read_text())
def decode(o):return np.frombuffer(base64.b64decode(o['data']),dtype=o['dtype']).reshape(o['shape'])
assert hashlib.sha256(text.encode()).hexdigest()==audit['bundle_sha256']
assert 'D0028' not in text and '/cwork/' not in text and '/hpc/' not in text
for source,expected in audit['source_hashes'].items():assert hashlib.sha256(Path(source).read_bytes()).hexdigest()==expected
act=a.workspace/'figs/lexical-access-poster/formal/figure-02/meta';con=a.workspace/'figs/lexical-access-poster/formal/figure-03/meta';group=a.workspace/'figs/lexical-access-paper/draft/contrast/task-average-union-preview/meta'
panels=json.loads((con/'figure-3_hga-contrast_group3.canvas.json').read_text())['scientific_details']['panels']
checks=[];spot=[]
for key,c in data['cells'].items():
 activation=c['metric']=='activation';phase='Stimulus' if c['align']=='onset' else 'Delay'
 if activation:
  z=np.load(act/'figure-2.2_hga-traces_horizontal_bipolar.npz');table=pd.read_csv(act/'figure-2.1_hga-activation_horizontal_bipolar.csv');table=table[table.cell=='act_'+phase]
 else:
  panelkey=f'group-3/{"stimuluslate" if c["align"]=="onset" else "offsetpost"}-{c["direction"]}';panel=next(q for q in panels if q['key']==panelkey)
  z=np.load(group/panelkey/'contour.npz');table=pd.read_csv(con/'figure-3_hga-contrast_group3.csv');table=table[table.panel==panelkey]
 for taskid,task in [('passive','Passive'),('decision','Decision'),('repeat','Repeat')]:
  if activation:names=z[f'{phase}_{task}_electrodes'].astype(str);v=z[f'{phase}_{task}_hga_z'];times=z[f'{phase}_{task}_times_s']
  else:
   names=z[task+'_names'].astype(str);rows=np.array([i for i,n in enumerate(names) if n in panel['task_sets'][task]]);names=names[rows];v=z[task+'_Nonword_values'][rows]-z[task+'_Word_values'][rows];times=z[task+'_times']
  source=table[table.condition==task].drop_duplicates('name').set_index('name').loc[names];coords=source[['x','y','z']].to_numpy();sample=audit['cells'][key][taskid]['frame_indices']
  np.testing.assert_allclose(c['times'],times[sample]*1000,atol=1e-6,rtol=0)
  for roi,labels in data['roiDefinitions'].items():
   mask=np.ones(len(names),bool) if roi=='all' else source.roi.isin(labels).to_numpy();curve=c['roiTraces'][taskid][roi]
   assert curve['n']==mask.sum()
   if mask.any():np.testing.assert_allclose(curve['mean'],v[mask][:,sample].mean(0),atol=5.1e-7,rtol=0)
   else:assert curve['mean']==[None]*len(sample)
  for hemi in ['lh','rh']:
   mask=coords[:,0]<0 if hemi=='lh' else coords[:,0]>0;assert c['counts'][taskid][hemi]==mask.sum()
   q=c['tasks'][taskid][hemi];f=decode(q['values'])*q['scale'];support=decode(q['support']).astype(bool)
   assert f.shape==(len(sample),len(support)) and np.isfinite(f).all();assert not np.any(f[:,~support])
   if task=='Repeat' and key in ['activation-onset','contrast-onset-wdnw','contrast-offset-nwwd']:
    mesh=_get_surface_cache(str(a.recon),'avg35','inflated',hemi);dist,ids=cKDTree(mesh['verts']).query(decode(data['geometries'][hemi]['positions']));assert dist.max()<1e-4
    j=len(sample)//2+1;field=compute_surface_field(str(a.recon),'avg35',hemi,coords[mask],v[mask][:,sample[j]],bandwidth=c['bandwidth'],max_distance=c['reach'],kernel=DensityKernel(method=c['kernel']))
    np.testing.assert_array_equal(support,field.support[ids]);error=float(np.max(np.abs(f[j]-field.values[ids])));assert error<=q['scale']*.501+1e-12
    spot.append(dict(cell=key,task=task,hemi=hemi,error=error,allowed=q['scale']*.501))
  checks.append(key+'/'+task+': native times, task membership, hemisphere counts, all four ROI curves, missingness and support pass')
report=dict(status='passed',checks=checks,surface_spot_checks=spot,source_hashes_verified=len(audit['source_hashes']),public_bundle_has_no_identifiers=True)
(a.output/'meta/independent-data-validation.json').write_text(json.dumps(report,indent=2)+'\n');print('INDEPENDENT DATA VALIDATION PASS',len(checks),'cells;',len(spot),'surface spot checks')
