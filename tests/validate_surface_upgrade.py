"""Check denser anatomy against native normals and preserve the published science."""
import argparse,base64,hashlib,json,sys
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree
p=argparse.ArgumentParser()
for name in ['baseline','output','viz','recon']:p.add_argument('--'+name,type=Path,required=True)
a=p.parse_args();sys.path.insert(0,str(a.viz))
from plotters.surface_geom import _get_surface_cache,_get_surface_normals

def bundle(root):
    return json.loads((root/'meta/real-data.js').read_text().removeprefix('window.LexicalRealBundle=').removesuffix(';\n'))
def decode(o):return np.frombuffer(base64.b64decode(o['data']),dtype=o['dtype']).reshape(o['shape'])
before,after=bundle(a.baseline),bundle(a.output)
assert {k:v for k,v in before.items() if k not in ['cells','geometries']}=={k:v for k,v in after.items() if k not in ['cells','geometries']}
report={'status':'passed','anatomy':{},'preserved_cells':[],'common_vertex_field_checks':0}
common={}
for hemi in ['lh','rh']:
    old,new=before['geometries'][hemi],after['geometries'][hemi]
    positions,faces,normals=map(decode,[new['positions'],new['faces'],new['normals']])
    assert 20000<len(faces)<65536 and len(positions)<65536
    assert np.isfinite(positions).all() and np.isfinite(normals).all()
    assert faces.min()>=0 and faces.max()<len(positions)
    np.testing.assert_allclose(np.linalg.norm(normals,axis=1),1,atol=1e-6)
    native=_get_surface_cache(str(a.recon),'avg35','inflated',hemi)
    distance,ids=cKDTree(native['verts']).query(positions)
    assert distance.max()<1e-4
    np.testing.assert_allclose(normals,_get_surface_normals(native)[ids],atol=3e-8,rtol=1e-7)
    distance,indices=cKDTree(positions).query(decode(old['positions']))
    keep=distance<1e-4;assert keep.sum()>1000
    common[hemi]=(np.flatnonzero(keep),indices[keep])
    report['anatomy'][hemi]={'vertices':len(positions),'faces':len(faces),'common_vertices':int(keep.sum()),'native_coordinate_error':float(distance[keep].max()),'native_normals_verified':True}
for key,old in before['cells'].items():
    new=after['cells'][key]
    assert {k:v for k,v in old.items() if k!='tasks'}=={k:v for k,v in new.items() if k!='tasks'},key
    for task in old['tasks']:
        for hemi,(oi,ni) in common.items():
            ov,nv=old['tasks'][task][hemi],new['tasks'][task][hemi]
            np.testing.assert_array_equal(decode(ov['support'])[oi],decode(nv['support'])[ni])
            np.testing.assert_allclose(decode(ov['values'])[:,oi]*ov['scale'],decode(nv['values'])[:,ni]*nv['scale'],rtol=0,atol=(ov['scale']+nv['scale'])/2+1e-9)
            report['common_vertex_field_checks']+=1
    report['preserved_cells'].append(key)
report['bundle_sha256']=hashlib.sha256((a.output/'meta/real-data.js').read_bytes()).hexdigest()
(a.output/'meta/surface-upgrade-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
