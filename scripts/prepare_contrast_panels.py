#!/usr/bin/env python3
"""Package accepted poster components for responsive reading, without analysis."""
import argparse
import base64
import copy
import hashlib
import json
import re
from pathlib import Path
import subprocess
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
FIGURE_SHA = '8be83781059a53f023915fcba63efe3aeebc1276daad6c9d188c9932b8a681e2'
POSTER_SHA = '78825191f0deec54f3df8c45f29a412dd3605a9005091db2b21bd2b3a181e84d'
OLD_MEDIA_SHA = 'b26d4daa788e0e6e9234f3a609352c2a2879caeca4438e0dd9d98292520d4f9d'
sha = lambda b: hashlib.sha256(b).hexdigest()


def rasters(svg):
    return [sha(base64.b64decode(e.get('{http://www.w3.org/1999/xlink}href').split(',')[1]))
            for e in ET.fromstring(svg).iter() if e.tag.endswith('}image')]


def plot_signature(group):
    """Exact geometry/styles plus literal labels; ignore only text presentation."""
    group = copy.deepcopy(group)
    labels = []
    for text in group.iter('{http://www.w3.org/2000/svg}text'):
        labels.append(''.join(text.itertext()))
        text.set('style', re.sub(r'font-size:\s*[\d.]+px', 'font-size: WEB', text.get('style')))
        for attr in ('x', 'y', 'transform'):
            text.attrib.pop(attr, None)
    return ET.canonicalize(ET.tostring(group, encoding='unicode')), labels


def main():
    parser = argparse.ArgumentParser()
    for name in ('figure', 'poster', 'previous-media', 'output'):
        parser.add_argument('--'+name, type=Path, required=True)
    args = parser.parse_args()
    if args.output.resolve().is_relative_to(ROOT):
        raise ValueError('Presentation outputs belong outside source Git')
    figs, meta = args.output/'figs', args.output/'meta'
    figs.mkdir(parents=True, exist_ok=True); meta.mkdir(parents=True, exist_ok=True)
    target = meta/'story-media.zip'
    if target.exists():
        raise ValueError('Use a fresh delivery directory; do not replace a released archive')
    source = args.figure.read_bytes()
    assert sha(source) == FIGURE_SHA
    assert sha(args.poster.read_bytes()) == POSTER_SHA
    assert sha(args.previous_media.read_bytes()) == OLD_MEDIA_SHA
    with zipfile.ZipFile(args.poster) as z:
        poster_svg = z.read('ppt/media/image10.svg')
    assert rasters(source) == rasters(poster_svg), 'Formal/poster brain images differ'
    assert len(rasters(source)) == 8
    result = subprocess.run(['node', str(ROOT/'scripts/split_contrast_figure.cjs'), str(args.figure), str(figs)], check=True, capture_output=True, text=True)
    components = json.loads(result.stdout)
    payload = {}
    with zipfile.ZipFile(args.previous_media) as old:
        for name in old.namelist():
            payload[name] = old.read(name)
    panels = []
    source_root = ET.fromstring(source)
    for cell, n, sign in [('stimulus-nwwd',145,'PW − W'),('stimulus-wdnw',116,'W − PW'),('offset-nwwd',165,'PW − W'),('offset-wdnw',119,'W − PW')]:
        align, direction = cell.split('-')
        images = {}
        for component in [c for c in components if c['cell'] == cell]:
            filename = 'media/'+component['file'];data = (figs/component['file']).read_bytes();payload[filename] = data
            images[component['part']] = {'src': './'+filename, 'width': component['width'], 'height': component['height']}
            # Every plotted path/fill, text value and non-text attribute stays exact.
            if component['part'] in ('trace','roi'):
                original = next(e for e in source_root.iter() if e.get('id') == 'axes_'+str(component['axis']))
                extracted = ET.fromstring(data)
                copy = next(e for e in extracted.iter() if e.get('id') == original.get('id'))
                assert plot_signature(original) == plot_signature(copy), 'Scientific plot content changed'
                if component['part'] == 'trace':
                    assert f'n = {n}' in ''.join(copy.itertext())
        panels.append({'id':cell,'align':align,'direction':direction,'n':n,'metric':sign+' (d′)','window':[.5,.9] if align=='stimulus' else [0,.5],'images':images})
    payload['media/contrast-panels.json'] = (json.dumps({'panels':panels},ensure_ascii=False,indent=2)+'\n').encode()
    for name, data in payload.items():
        if name.endswith(('.svg','.json')):
            assert b'/hpc/' not in data and b'/cwork/' not in data
    with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for name,data in sorted(payload.items()):
            info=zipfile.ZipInfo(name,date_time=(2026,11,12,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,data)
    record={'source_svg':str(args.figure),'source_svg_sha256':FIGURE_SHA,'poster':str(args.poster),'poster_sha256':POSTER_SHA,'poster_part':'ppt/media/image10.svg','matched_brain_rasters':rasters(source),'unchanged_plot_geometry_and_labels':8,'typography':'Web-sized Arial text with compact label spacing; chart display capped at 360 CSS px','components':components,'archive_sha256':sha(target.read_bytes()),'files':{name:{'bytes':len(data),'sha256':sha(data)} for name,data in payload.items()},'method':'Existing SVG axes reflowed for web reading; only SVG text typography/placement and outer margins change. Original brain rasters are identical to the final PPTX; only browser WebP preview conversion, no resampling of scientific data. Eight curve/pie groups pass canonical-XML equality after excluding text presentation attributes; all plotted paths, SEM ribbons, selection windows, effect-weighted pie wedges, colors and literal labels remain unchanged.'}
    (meta/'contrast-panel-provenance.json').write_text(json.dumps(record,indent=2)+'\n')
    for component in components:
        stem = Path(component['file']).stem
        sidecar = {'source_svg':str(args.figure), 'source_svg_sha256':FIGURE_SHA, **component, 'output_sha256':sha((figs/component['file']).read_bytes())}
        (meta/(stem+'.json')).write_text(json.dumps(sidecar,indent=2)+'\n')
    print(json.dumps({'archive_sha256':record['archive_sha256'],'files':len(payload),'bytes':target.stat().st_size,'panels':[{k:v for k,v in p.items() if k!='images'} for p in panels]},indent=2))


if __name__ == '__main__':
    main()
