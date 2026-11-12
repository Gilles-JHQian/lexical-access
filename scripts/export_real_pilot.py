#!/usr/bin/env python3
"""Compose a static web visualization from accepted poster caches; no epoch reads."""
import argparse, base64, hashlib, json, os, sys, time
from pathlib import Path
import numpy as np
import pandas as pd


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def packed(values, dtype):
    a = np.ascontiguousarray(values, dtype=dtype)
    return dict(shape=list(a.shape), dtype=dtype, data=base64.b64encode(a.tobytes()).decode())

def export(args):
    root, out = args.workspace.resolve(), args.output.resolve()
    if out == Path(__file__).resolve().parents[1] or Path(__file__).resolve().parents[1] in out.parents:
        raise ValueError('Generated data must remain outside the code repository')
    (out/'figs').mkdir(parents=True, exist_ok=True); (out/'meta').mkdir(exist_ok=True)
    sys.path.insert(0, str(args.viz))
    from plotters.surface_field import compute_surface_field
    from plotters.surface_geom import _get_surface_cache, _get_surface_normals, curvature_rgb
    from plotters.density_config import DensityKernel
    from plotters.brain_config import default_cortex
    import pyvista as pv
    from scipy.spatial import cKDTree
    act = root/'figs/lexical-access-poster/formal/figure-02/meta'
    con = root/'figs/lexical-access-poster/formal/figure-03/meta'
    group = root/'figs/lexical-access-paper/draft/contrast/task-average-union-preview/meta'
    sources = [act/'figure-2.2_hga-traces_horizontal_bipolar.npz', act/'figure-2.1_hga-activation_horizontal_bipolar.csv',act/'bipolar-activation.validation.json', con/'figure-3_hga-contrast_group3.canvas.json', con/'figure-3_hga-contrast_group3.csv', con/'figure-3_hga-contrast_group3.validation.json', group/'prepared.json', group/'validation.json']
    act_validation=json.loads(sources[2].read_text()); assert act_validation['valid'] and not act_validation['statistics_rerun']
    panel_metadata=json.loads(sources[3].read_text())['scientific_details']['panels']
    cv=json.loads(sources[5].read_text())['output_sha256']
    for suffix in ['csv','canvas.json']:
        f=con/f'figure-3_hga-contrast_group3.{suffix}'
        assert sha(f)==cv[f'meta/{f.name}'], f'Stale contrast cache: {f}'
    assert json.loads((group/'prepared.json').read_text())['status']=='PASS'
    act_arrays=np.load(sources[0],allow_pickle=False)
    act_table=pd.read_csv(sources[1]); con_table=pd.read_csv(sources[4])
    snapshots={str(p):sha(p) for p in sources}
    audit=dict(source_hashes=snapshots, checks=[], cells={}, geometry={}, no_raw_epoch_reads=True, no_statistics_rerun=True)
    data=dict(schema=2, kind='real', dataset='UniquenessPoint', reference='bipolar', sourceDate='2026-11-11', template='avg35 / inflated', tasks=[dict(id=i,label=l,color=c) for i,l,c in [('passive','Passive','#397d58'),('decision','Decision','#a9373b'),('repeat','Repetition','#2369bd')]], geometries={}, cells={})
    # Decimation retains original inflated coordinates; field values use those same white vertex IDs.
    mesh_ids={}
    for hemi in ['lh','rh']:
        entry=_get_surface_cache(str(args.recon),'avg35','inflated',hemi)
        faces=entry['faces']; mesh=pv.PolyData(entry['verts'],np.column_stack((np.full(len(faces),3),faces)).ravel())
        reduced=mesh.decimate_pro(.92,preserve_topology=True)
        # Native-resolution area-weighted normals preserve the sulcal shape after display decimation.
        full_normals=_get_surface_normals(entry)
        assert np.isfinite(full_normals).all()
        distance,ids=cKDTree(entry['verts']).query(reduced.points)
        assert distance.max()<1e-4, 'Decimation moved vertices; cannot silently change white mapping'
        smallfaces=reduced.faces.reshape(-1,4)[:,1:]
        colors=curvature_rgb(str(args.recon),default_cortex('inflated'),'avg35',hemi)[ids]
        points=entry['verts'][ids]
        mesh_ids[hemi]=ids
        data['geometries'][hemi]=dict(positions=packed(points,'<f4'),faces=packed(smallfaces,'<u2'),normals=packed(full_normals[ids],'<f4'),colors=packed(np.round(colors*255),'|u1'))
        audit['geometry'][hemi]=dict(normal_source='full-resolution inflated surface',retained_fraction=.08,full_vertices=len(entry['verts']),vertices=len(ids),faces=len(smallfaces),max_vertex_displacement=float(distance.max()),white_vertex_ids_sha256=hashlib.sha256(ids.tobytes()).hexdigest())
        for path,*_ in entry['source_signature']:snapshots[str(path)]=sha(path)
        print('geometry',hemi,len(ids),len(smallfaces),flush=True)
    mapping_path=args.viz.parent/'final_figures/lexical_access/scripts/coarse_roi_mapping_v2.json'
    mapping=json.loads(mapping_path.read_text());snapshots[str(mapping_path)]=sha(mapping_path)
    group_rois={g['id']:set(g['rois']) for g in mapping['groups']}
    roi_sets={'all':None,'st':group_rois['superior_temporal'],'ventral':group_rois['ventral_temporal'],'frontal':group_rois['prefrontal']}
    # Established anatomical display groups; not the separate decoding ROI definition.
    data['roiDefinitions']={k:sorted(v) if v else 'all selected contacts' for k,v in roi_sets.items()}
    data['roiLabels']={'all':'All selected','st':'STG / STS','ventral':'Ventral group','frontal':'Frontal group'}
    specs=[('activation-onset','activation','onset',None),('activation-offset','activation','offset',None)]
    specs += [(f'contrast-{align}-{direction}','contrast',align,direction) for align in ['onset','offset'] for direction in ['nwwd','wdnw']]
    for cell_id, metric, align, direction in specs:
        phase='Stimulus' if align=='onset' else 'Delay'
        key=f'group-3/{"stimuluslate" if align=="onset" else "offsetpost"}-{direction}' if direction else None
        panel=next((p for p in panel_metadata if p['key']==key),None)
        if metric=='contrast':
            cache=group/key/'contour.npz'; sources.append(cache);snapshots[str(cache)]=sha(cache)
            arrays=np.load(cache,allow_pickle=False)
            # These are unstandardized HGA-z differences, NOT the poster d-prime display trace.
            table=con_table[con_table.panel==key]
        else: arrays=act_arrays;table=act_table[act_table.cell=='act_'+phase]
        cell=dict(metric=metric,align=align,direction=direction,units='HGA z' if metric=='activation' else 'Nonword − Word (ΔHGA z)',tasks={},roiTraces={},counts={},level=2.04 if metric=='activation' else .15,upper=5.1 if metric=='activation' else 1.0,selectionWindow=[0,.75] if phase=='Stimulus' else [0,.5],kernel='legacy' if metric=='activation' else 'tissue',bandwidth=7,reach=20 if metric=='activation' else 15)
        if panel:cell['selectionWindow']=panel['selection_window_s']
        caudit={}; shared={}
        for task_id,task in [('passive','Passive'),('decision','Decision'),('repeat','Repeat')]:
            if metric=='activation':
                prefix=f'{phase}_{task}'
                names=arrays[prefix+'_electrodes'].astype(str);times=arrays[prefix+'_times_s'];values=arrays[prefix+'_hga_z']
                selected=set(names)
            else:
                names=arrays[task+'_names'].astype(str);times=arrays[task+'_times'];values=arrays[task+'_Difference_values']
                np.testing.assert_allclose(values,arrays[task+'_Nonword_values']-arrays[task+'_Word_values'],rtol=1e-10,atol=1e-10,equal_nan=True)
                selected=set(panel['task_sets'][task])
            tasktable=table[table.condition==task].drop_duplicates('name').set_index('name')
            assert set(names)<=set(tasktable.index)
            index=np.array([i for i,n in enumerate(names) if n in selected])
            chosen_names=names[index];v=values[index]
            coords=tasktable.loc[chosen_names,['x','y','z']].to_numpy(float)
            rois=tasktable.loc[chosen_names,'roi'].astype(str).to_numpy()
            assert np.isfinite(v).all() and np.isfinite(coords).all()
            shared[task_id]=set(chosen_names)
            # Use exact native samples at 16 Hz, no synthetic resampling or onset/offset shifting.
            sample=np.arange(0,len(times),8)
            sample=sample[(times[sample]>=-.25-1e-9)&(times[sample]<= (1.25 if align=='onset' else .75)+1e-9)]
            webtimes=np.round(times[sample]*1000,6)
            if 'times' in cell:np.testing.assert_array_equal(cell['times'],webtimes)
            cell['times']=webtimes.tolist();cell['tasks'][task_id]={};cell['counts'][task_id]={}
            cell['roiTraces'][task_id]={}
            for roi,labels in roi_sets.items():
                rows=np.ones(len(rois),bool) if labels is None else np.isin(rois,list(labels))
                cell['roiTraces'][task_id][roi]=dict(n=int(rows.sum()),mean=np.round(v[rows][:,sample].mean(0),6).tolist() if rows.any() else [None]*len(sample))
            caudit[task_id]=dict(n=len(chosen_names),membership_sha256=hashlib.sha256('\n'.join(sorted(chosen_names)).encode()).hexdigest(),frame_indices=sample.tolist(),source_values_sha256=hashlib.sha256(v.tobytes()).hexdigest(),hemispheres={})
            for hemi in ['lh','rh']:
                mask=coords[:,0]<0 if hemi=='lh' else coords[:,0]>0
                xyz=coords[mask];vals=v[mask][:,sample];ids=mesh_ids[hemi]
                if panel: assert set(chosen_names[mask])==set(panel['task_contributors'][task][hemi])
                cell['counts'][task_id][hemi]=int(mask.sum())
                fields=[];support=None;started=time.monotonic();quant_err=0.
                for frame in range(len(sample)):
                    field=compute_surface_field(str(args.recon),'avg35',hemi,xyz,vals[:,frame],bandwidth=cell['bandwidth'],max_distance=cell['reach'],kernel=DensityKernel(method=cell['kernel']))
                    if support is None:support=field.support[ids]
                    else:np.testing.assert_array_equal(support,field.support[ids])
                    fields.append(field.values[ids])
                raw=np.array(fields);scale=max(float(np.max(np.abs(raw))),1e-9)/32760
                quant=np.round(raw/scale).astype('<i2');quant_err=float(np.max(np.abs(quant.astype(float)*scale-raw)))
                cell['tasks'][task_id][hemi]=dict(values=packed(quant,'<i2'),scale=scale,support=packed(support,'|u1'))
                caudit[task_id]['hemispheres'][hemi]=dict(n=int(mask.sum()),max_quantization_error=quant_err,scale=scale,kernel=field.provenance['identity']['kernel'],field_key=field.provenance.get('key'),seconds=round(time.monotonic()-started,2))
                print(cell_id,task,hemi,'n',int(mask.sum()),'frames',len(sample),'seconds',round(time.monotonic()-started,1),flush=True)
        cell['exactOverlapCounts']={scope:{h:len(set.intersection(*(shared[t] for t in taskids))) for h in ['both']} for scope,taskids in [('all',['passive','decision','repeat']),('active',['decision','repeat'])]}
        data['cells'][cell_id]=cell;audit['cells'][cell_id]=caudit
    for p,expected in snapshots.items():assert sha(p)==expected, f'Source changed during export: {p}'
    audit['checks']=['source validation flags accepted','contrast exported hashes match formal poster','source files unchanged across export','Nw−Wd equals source group means','selected task membership preserved','native sample times retained independently per alignment','finite values and geometry','decimated vertices retain exact white vertex correspondence','no identifiers or per-contact arrays in web bundle']
    audit['source_hashes']=snapshots
    serial=json.dumps(data,separators=(',',':'),allow_nan=False)
    assert not any(s in serial for s in ['D0028','/cwork/','/hpc/','electrodes'])
    (out/'meta/real-data.js').write_text('window.LexicalRealBundle='+serial+';\n')
    audit['bundle_bytes']=len(serial);audit['bundle_sha256']=sha(out/'meta/real-data.js')
    (out/'meta/export-validation.json').write_text(json.dumps(audit,indent=2)+'\n')
    print('EXPORT PASS',audit['bundle_bytes'],flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--workspace',type=Path,required=True);p.add_argument('--viz',type=Path,required=True);p.add_argument('--recon',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    export(p.parse_args())
