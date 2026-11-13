#!/usr/bin/env python3
"""Compose display variants from accepted summaries and published SDR1 masks."""
import argparse
import copy
import hashlib
import json
import sys
from pathlib import Path
import h5py
import numpy as np
import pandas as pd
from scipy.spatial import cKDTree
from export_real_pilot import packed, sha

PREFIX = 'window.LexicalRealBundle='


def unpack(a):
    import base64
    return np.frombuffer(base64.b64decode(a['data']), dtype=a['dtype']).reshape(a['shape'])


def export(a):
    out = a.output.resolve(); repo = Path(__file__).resolve().parents[1]
    if out.is_relative_to(repo): raise ValueError('Generated summaries belong outside Git')
    (out/'figs').mkdir(parents=True, exist_ok=True); (out/'meta').mkdir(exist_ok=True)
    if (out/'meta/real-data.js').exists(): raise ValueError('Use a fresh output bundle')
    sys.path[:0] = [str(a.workspace/'brain_viewer'), str(a.viz)]
    from preview_temporal import directional_masks
    from preview_data import align_mask, validate_sdr1p05
    from plotters.surface_field import compute_surface_field
    from plotters.surface_geom import _get_surface_cache
    from plotters.density_config import DensityKernel
    from plotters.trace_render import _smooth
    audit = json.loads(a.base_audit.read_text())
    assert sha(a.base_bundle) == audit['bundle_sha256']
    for path, expected in audit['source_hashes'].items(): assert sha(path) == expected, path
    data = json.loads(a.base_bundle.read_text()[len(PREFIX):].strip().removesuffix(';'))
    original_cells = copy.deepcopy(data['cells'])
    pins = dict(audit['source_hashes'])
    def pin(path, expected=None):
        path = Path(path); digest = sha(path)
        if expected: assert digest == expected, str(path)
        pins[str(path)] = digest
        return path
    receipt_path = pin(a.bids/'results/statistics-runs/jia213-235-up-sdr1p05-20261015/full/published.json')
    receipt = json.loads(receipt_path.read_text()); assert receipt['status'] == 'PASS'
    plan = json.loads(pin(receipt['plan'], receipt['plan_sha256']).read_text())
    complete = receipt['provenance']['validated_full_run']['complete']
    accepted = json.loads(pin(complete['path'],complete['sha256']).read_text())
    assert accepted['status'] == 'PASS' and accepted['method_version'] == 'temporal_cluster_v1'
    generation = receipt['publication_generation']
    assert plan['publication_generation'] == accepted['publication_generation'] == generation
    assert Path(plan['bids_root']).resolve() == a.bids.resolve()
    targets = {str((a.bids/t['target']).resolve()):t['sha256'] for t in receipt['targets'] if t['state']=='present'}
    guard = a.bids/'results/statistics-runs/contrast-sdr1p05-bipolar/PUBLISHING.json'
    assert not guard.exists(), 'Statistics publication is in progress'
    for module in ['preview_temporal.py','preview_data.py']: pin(a.workspace/'brain_viewer'/module)
    for module in ['surface_field.py','trace_render.py']: pin(a.viz/'plotters'/module)
    ids = {}
    for hemi in ('lh','rh'):
        native = _get_surface_cache(str(a.recon),'avg35','inflated',hemi)['verts']
        distance, ids[hemi] = cKDTree(native).query(unpack(data['geometries'][hemi]['positions']))
        assert distance.max() < 1e-4
        assert hashlib.sha256(ids[hemi].tobytes()).hexdigest() == audit['geometry'][hemi]['white_vertex_ids_sha256']
    con = a.workspace/'figs/lexical-access-poster/formal/figure-03/meta'
    panels = json.loads((con/'figure-3_hga-contrast_group3.canvas.json').read_text())['scientific_details']['panels']
    table = pd.read_csv(con/'figure-3_hga-contrast_group3.csv')
    groups = a.workspace/'figs/lexical-access-paper/draft/contrast/task-average-union-preview/meta'
    mask_cache = {}; records = {}; numerical = []
    def masks(subject, phase, task, direction, times):
        key = (subject,phase,task,direction)
        if key in mask_cache: return mask_cache[key]
        name = f'sub-{subject}_task-UniquenessPoint_proc-{phase}_space-{direction}_rec-stimType_desc-{task}_highgamma.h5'
        path = a.bids/'derivatives/statistics'/f'sub-{subject}'/'bipolar(diff)(sdr1p05)'/name
        pin(path, targets[str(path.resolve())])
        with h5py.File(path) as f:
            attrs = dict(f.attrs); validate_sdr1p05(attrs,phase,'bipolar',subject,direction)
            assert attrs['method_version']=='temporal_cluster_v1' and attrs['publication_generation']==generation
            assert attrs['subject']==subject and attrs['condition']==task
            view = {k:f[k][:] for k in ('times','mask','pvals')}
            view.update({k:f[k].asstr()[:].tolist() for k in ('ch_names','sig_ch_names')})
        audit_path = pin(attrs['audit_path'],attrs['audit_sha256'])
        with h5py.File(audit_path) as f:
            for k,v in f.attrs.items():
                if k in attrs: assert np.array_equal(v,attrs[k]), k
            raw = {k:f[k][:] for k in ('times','strict_mask','extent_mask','observed_valid','point_pvalues','statistic','window_indices')}
            raw.update(ch_names=f['ch_names'].asstr()[:].tolist(),window=attrs['strict_region_seconds'])
        formal, extent, tested = directional_masks(view,raw,direction,.05)
        formal &= np.isin(raw['ch_names'],view['sig_ch_names'])[:,None]
        aligned = align_mask(times, raw['times'], formal)
        names = [n if n.startswith(subject+'_') else subject+'_'+n for n in raw['ch_names']]
        mask_cache[key] = dict(zip(names,aligned))
        return mask_cache[key]
    for cell_id, original in original_cells.items():
        if original['metric'] != 'contrast': continue
        align, direction = original['align'], original['direction']
        phase = 'Stimulus' if align=='onset' else 'Delay'
        panel_key = f'group-3/{"stimuluslate" if align=="onset" else "offsetpost"}-{direction}'
        panel = next(p for p in panels if p['key']==panel_key)
        arrays = np.load(pin(groups/panel_key/'contour.npz'),allow_pickle=False)
        result = {}
        for variant in ('smooth','cluster'):
            cell = copy.deepcopy(original);cell.pop('roiTraces',None);cell['processing']=variant
            cell['processingLabel']='Gaussian smoothing · σ 50 ms' if variant=='smooth' else 'SDR1 cluster mask'
            if variant=='smooth': cell['temporalSmoothing']={'method':'centered Gaussian','sigmaMs':50,'sourceRateHz':128,'edgeMode':'reflect','truncateSigma':4}
            else: cell['inferenceWindow']=[0,1] if align=='onset' else [-.5,.5];cell['activeCounts']={};cell['maskSource']='sdr1p05 · temporal_cluster_v1 · formal directional mask'
            result[variant]=cell
        records[cell_id]={}
        for task_id, task in [('passive','Passive'),('decision','Decision'),('repeat','Repeat')]:
            allnames=arrays[task+'_names'].astype(str); times=arrays[task+'_times']
            indices=np.flatnonzero(np.isin(allnames,panel['task_sets'][task])); names=allnames[indices]
            values=arrays[task+'_Difference_values'][indices]
            assert np.isfinite(values).all();np.testing.assert_allclose(np.diff(times),1/128,rtol=0,atol=1e-9)
            rows=table[(table.panel==panel_key)&(table.condition==task)].drop_duplicates('name').set_index('name').loc[names]
            coords=rows[['x','y','z']].to_numpy(float)
            sample=np.array(audit['cells'][cell_id][task_id]['frame_indices'])
            np.testing.assert_allclose(times[sample]*1000,original['times'],rtol=0,atol=1e-6)
            mask=np.zeros(values.shape,bool)
            for i,name in enumerate(names):
                mapping=masks(name.split('_')[0],phase,task,'NwWd' if direction=='nwwd' else 'WdNw',times)
                if name not in mapping: raise ValueError('Poster source contact missing from certified SDR1 channel axis')
                mask[i]=mapping[name]
            transformed={'smooth':_smooth(values, .05*128), 'cluster':np.where(mask,values,0.)}
            record={'n':len(names),'sample_count':int(mask.size),'significant_samples':int(mask.sum()),'hemispheres':{}}
            result['cluster']['activeCounts'][task_id]={}
            for hemi in ('lh','rh'):
                keep=coords[:,0]<0 if hemi=='lh' else coords[:,0]>0;xyz=coords[keep]
                assert int(keep.sum())==original['counts'][task_id][hemi]
                result['cluster']['activeCounts'][task_id][hemi]=mask[keep][:,sample].sum(0).tolist()
                record['hemispheres'][hemi]={}
                # Independent old-field checks certify exact geometry/pool/kernel reuse.
                old=original['tasks'][task_id][hemi];old_values=unpack(old['values'])*old['scale']
                for fi in (0,len(sample)//2,len(sample)-1):
                    raw=compute_surface_field(str(a.recon),'avg35',hemi,xyz,values[keep,sample[fi]],bandwidth=7,max_distance=15,kernel=DensityKernel(method='tissue'))
                    error=float(np.max(np.abs(raw.values[ids[hemi]]-old_values[fi])))
                    assert error<=old['scale']*.501+1e-8
                    np.testing.assert_array_equal(raw.support[ids[hemi]],unpack(old['support']))
                    numerical.append({'cell':cell_id,'task':task_id,'hemi':hemi,'frame':fi,'error':error})
                for variant, signal in transformed.items():
                    frames=[]
                    for index in sample:
                        field=compute_surface_field(str(a.recon),'avg35',hemi,xyz,signal[keep,index],bandwidth=7,max_distance=15,kernel=DensityKernel(method='tissue'))
                        frames.append(field.values[ids[hemi]])
                    raw=np.array(frames);scale=max(float(np.max(np.abs(raw))),1e-9)/32760
                    quant=np.round(raw/scale).astype('<i2');error=float(np.max(np.abs(quant*scale-raw)))
                    result[variant]['tasks'][task_id][hemi]={'values':packed(quant,'<i2'),'scale':scale,'support':old['support']}
                    record['hemispheres'][hemi][variant]={'scale':scale,'max_quantization_error':error}
                print(cell_id,task_id,hemi,'PASS',flush=True)
            records[cell_id][task_id]=record
        for variant, cell in result.items(): data['cells'][cell_id+'-'+variant]=cell
    for key,cell in original_cells.items(): assert data['cells'][key]==cell
    for path,expected in pins.items(): assert sha(path)==expected, 'Source changed during export'
    assert not guard.exists()
    content=PREFIX+json.dumps(data,separators=(',',':'),allow_nan=False)+';\n'
    assert not any(x in content for x in ('/hpc/','/cwork/','D0028','electrodes'))
    (out/'meta/real-data.js').write_text(content)
    audit.update(bundle_sha256=sha(out/'meta/real-data.js'),bundle_bytes=len(content),source_hashes=pins)
    audit['contrast_variants']={'base_bundle_sha256':sha(a.base_bundle),'publication_generation':generation,'sigma_ms':50,'records':records,'original_field_checks':numerical,'source_rate_hz':128,'formal_only':True,'source_pools_unchanged':True,'no_raw_epoch_reads':True,'no_statistics_rerun':True}
    (out/'meta/export-validation.json').write_text(json.dumps(audit,indent=2)+'\n')
    print('VARIANTS PASS',audit['bundle_sha256'],len(content),flush=True)


if __name__=='__main__':
    p=argparse.ArgumentParser()
    for name in ('workspace','viz','recon','bids','base-bundle','base-audit','output'): p.add_argument('--'+name,type=Path,required=True)
    export(p.parse_args())
