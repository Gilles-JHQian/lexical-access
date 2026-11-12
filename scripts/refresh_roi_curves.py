"""Refresh only compact ROI summaries; preserve all rendered field bytes."""
import argparse,json,hashlib
from pathlib import Path
import numpy as np
import pandas as pd
from export_real_pilot import sha
p=argparse.ArgumentParser();p.add_argument('--workspace',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--mapping',type=Path,required=True);a=p.parse_args()
bundle=a.output/'meta/real-data.js';s=bundle.read_text();data=json.loads(s.removeprefix('window.LexicalRealBundle=').removesuffix(';\n'))
audit_path=a.output/'meta/export-validation.json';audit=json.loads(audit_path.read_text())
for source,expected in audit['source_hashes'].items():assert sha(source)==expected
mapping=json.loads(a.mapping.read_text());groups={g['id']:g['rois'] for g in mapping['groups']};rois={'all':None,'st':groups['superior_temporal'],'ventral':groups['ventral_temporal'],'frontal':groups['prefrontal']}
data['roiDefinitions']={k:sorted(v) if v else 'all selected contacts' for k,v in rois.items()}
act=a.workspace/'figs/lexical-access-poster/formal/figure-02/meta';con=a.workspace/'figs/lexical-access-poster/formal/figure-03/meta';group=a.workspace/'figs/lexical-access-paper/draft/contrast/task-average-union-preview/meta'
metadata=json.loads((con/'figure-3_hga-contrast_group3.canvas.json').read_text())['scientific_details']['panels']
fields_before=sha(bundle)
for key,cell in data['cells'].items():
 phase='Stimulus' if cell['align']=='onset' else 'Delay';activation=cell['metric']=='activation'
 if activation:
  z=np.load(act/'figure-2.2_hga-traces_horizontal_bipolar.npz');table=pd.read_csv(act/'figure-2.1_hga-activation_horizontal_bipolar.csv');table=table[table.cell=='act_'+phase]
 else:
  panelkey=f'group-3/{"stimuluslate" if cell["align"]=="onset" else "offsetpost"}-{cell["direction"]}'
  panel=next(p for p in metadata if p['key']==panelkey);z=np.load(group/panelkey/'contour.npz');table=pd.read_csv(con/'figure-3_hga-contrast_group3.csv');table=table[table.panel==panelkey]
 for taskid,task in [('passive','Passive'),('decision','Decision'),('repeat','Repeat')]:
  if activation:names=z[f'{phase}_{task}_electrodes'].astype(str);v=z[f'{phase}_{task}_hga_z']
  else:
   allnames=z[task+'_names'].astype(str);rows=np.array([i for i,n in enumerate(allnames) if n in panel['task_sets'][task]]);names=allnames[rows];v=z[task+'_Difference_values'][rows]
  labels=table[table.condition==task].drop_duplicates('name').set_index('name').loc[names,'roi'].to_numpy()
  sample=audit['cells'][key][taskid]['frame_indices']
  assert hashlib.sha256(v.tobytes()).hexdigest()==audit['cells'][key][taskid]['source_values_sha256']
  for roi,group_rois in rois.items():
   mask=np.ones(len(labels),bool) if group_rois is None else np.isin(labels,group_rois)
   cell['roiTraces'][taskid][roi]=dict(n=int(mask.sum()),mean=np.round(v[mask][:,sample].mean(0),6).tolist() if mask.any() else [None]*len(sample))
serial=json.dumps(data,separators=(',',':'),allow_nan=False);bundle.write_text('window.LexicalRealBundle='+serial+';\n')
audit['roi_mapping']=str(a.mapping);audit['source_hashes'][str(a.mapping)]=sha(a.mapping);audit['bundle_sha256']=sha(bundle);audit['bundle_bytes']=len(serial)
audit['checks'].append('ROI curves independently rebuilt from canonical coarse_roi_mapping_v2; source values verified; surfaces unchanged')
audit_path.write_text(json.dumps(audit,indent=2)+'\n');print('ROI REFRESH PASS')
