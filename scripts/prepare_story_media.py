#!/usr/bin/env python3
"""Package two requested stimulus recordings and the exact final-poster figure.

Reads source files only. Outputs a separately released media archive and local
provenance outside source Git; no participant recordings or analysis recompute.
Requires the development Playwright installation for an SVG preview.
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import subprocess
import wave
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
POSTER_SHA = '78825191f0deec54f3df8c45f29a412dd3605a9005091db2b21bd2b3a181e84d'
FIGURE_SHA = '5253dc382be864a6c675e8ab31f7649b096513d0aa79a6bb274e6d15e2f85ebe'
AUDIO_SHA = {
    'altitude': '86f932c1250038872ea544c224953c10bfaeb7ae97a4522d2fe6abcd03ef5ae7',
    'aelkahhaazh': '0a992dfc0876bdba52f5152f7799b5ceb88e05c3a68d7793fa1ef2a635f298e5',
}
sha = lambda value: hashlib.sha256(value).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--poster', required=True, type=Path)
    parser.add_argument('--stimuli', required=True, type=Path)
    parser.add_argument('--properties', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    if args.output.resolve().is_relative_to(ROOT):
        raise ValueError('Generated media must stay outside the source repository')
    figs, meta = args.output / 'figs', args.output / 'meta'
    figs.mkdir(parents=True, exist_ok=True); meta.mkdir(parents=True, exist_ok=True)
    archive = meta / 'story-media.zip'
    if archive.exists():
        raise ValueError('Use a new delivery directory; media releases are immutable')
    assert sha(args.poster.read_bytes()) == POSTER_SHA, 'Poster is not the reviewed final version'
    with zipfile.ZipFile(args.poster) as poster:
        rels = {e.attrib['Id']: e.attrib['Target'] for e in ET.fromstring(poster.read('ppt/slides/_rels/slide1.xml.rels'))}
        ns = {'p': 'http://schemas.openxmlformats.org/presentationml/2006/main'}
        pics = ET.fromstring(poster.read('ppt/slides/slide1.xml')).findall('.//p:pic', ns)
        pic = next(p for p in pics if p.find('.//p:cNvPr', ns).get('name') == 'Graphic 62')
        targets = [rels[v] for e in pic.iter() for v in e.attrib.values() if v in rels and rels[v].endswith('.svg')]
        assert len(targets) == 1
        part = 'ppt/' + targets[0].removeprefix('../')
        svg = poster.read(part)
    assert sha(svg) == FIGURE_SHA, 'Decoding figure does not match the reviewed poster'
    (figs / 'poster-decoding.svg').write_bytes(svg)
    render = subprocess.run(['node', str(ROOT / 'scripts/render_figure.cjs'), str(figs / 'poster-decoding.svg'), str(figs / 'poster-decoding.webp')], check=True, capture_output=True, text=True)
    payload = {'media/poster-decoding.svg': svg, 'media/poster-decoding.webp': (figs / 'poster-decoding.webp').read_bytes()}
    properties = list(csv.DictReader(args.properties.open()))
    provenance = {'poster': str(args.poster), 'poster_sha256': POSTER_SHA, 'figure_part': part, 'figure_sha256': FIGURE_SHA, 'preview': json.loads(render.stdout), 'stimulus_metadata': str(args.properties), 'stimulus_metadata_sha256': sha(args.properties.read_bytes()), 'audio': []}
    for name, expected in AUDIO_SHA.items():
        path = args.stimuli / (name + '.wav'); data = path.read_bytes()
        assert sha(data) == expected, 'Unexpected recording: ' + name
        row = next(row for row in properties if row['content'] == name)
        with wave.open(str(path)) as audio:
            record = {'source': str(path), 'sha256': expected, 'metadata': row, 'sample_rate': audio.getframerate(), 'samples': audio.getnframes(), 'duration': audio.getnframes()/audio.getframerate(), 'channels': audio.getnchannels()}
        provenance['audio'].append(record); payload['media/' + name + '.wav'] = data
    provenance['selection'] = 'Original stimulus files, unchanged. Closest initial-phoneme match to altitude among the 40 pseudowords: aelkahhaazh shares AE L (/æl/); no pseudoword shares AE L T. These examples are not a matched experimental pair.'
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as output:
        for name, data in sorted(payload.items()):
            info = zipfile.ZipInfo(name, date_time=(2026, 11, 12, 0, 0, 0)); info.compress_type = zipfile.ZIP_DEFLATED
            output.writestr(info, data)
    provenance['archive_sha256'] = sha(archive.read_bytes())
    provenance['files'] = {name: {'bytes': len(data), 'sha256': sha(data)} for name, data in payload.items()}
    (meta / 'story-media-provenance.json').write_text(json.dumps(provenance, indent=2) + '\n')
    print(json.dumps({'asset': archive.name, 'sha256': provenance['archive_sha256'], 'bytes': archive.stat().st_size, 'preview': provenance['preview'], 'files': provenance['files']}, indent=2))


if __name__ == '__main__':
    main()
