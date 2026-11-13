#!/usr/bin/env python3
"""Build an allowlisted Pages artifact using a separately released HGA bundle."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
from site_template import real_html, PUBLIC_ASSETS
from stream_assets import write_stream_assets
from story_media import install_media

ROOT = Path(__file__).resolve().parents[1]


def build(bundle, output, media):
    config = json.loads((ROOT / 'deployment.json').read_text())
    content = bundle.read_bytes()
    if hashlib.sha256(content).hexdigest() != config['data_sha256']:
        raise ValueError('HGA bundle does not match the reviewed release checksum')
    prefix = 'window.LexicalRealBundle='
    text = content.decode()
    if not text.startswith(prefix):
        raise ValueError('Not a real HGA bundle')
    data = json.loads(text[len(prefix):].strip().removesuffix(';'))
    if data['kind'] != 'real' or data['schema'] != 2:
        raise ValueError('Wrong HGA data mode/schema')
    if output.exists() and any(output.iterdir()):
        raise ValueError('Use an empty output directory; refusing to overwrite a deployment')
    output.mkdir(parents=True, exist_ok=True)
    media_files = install_media(media, output)
    manifest, data_files = write_stream_assets(data, output)
    html = real_html(ROOT, output)
    html = html.replace('data-developer-tools="true"', 'data-developer-tools="' + str(config.get("developer_tools", False)).lower() + '"')
    # Stable entrances, immutable asset identities: avoid mixing cached old/new code.
    for name in ['styles.css', 'data-loader.js', 'surface-view.js', 'real-app.js', 'real-data.js']:
        asset = (output / name).read_bytes() if name == 'real-data.js' else (ROOT / name).read_bytes()
        token = hashlib.sha256(asset).hexdigest()[:12]
        html = html.replace('"./' + name + '"', '"./' + name + '?v=' + token + '"')
    # Updated vector typography must not reuse a phone's cached poster SVG.
    for name in sorted(media_files):
        if name.startswith('media/contrast-') and name.endswith('.svg'):
            token = hashlib.sha256((output / name).read_bytes()).hexdigest()[:12]
            html = html.replace('"./' + name + '"', '"./' + name + '?v=' + token + '"')
    html = html.replace('</head>', '<link rel="canonical" href="' + config['base_url'] + '">\n<script defer src="./site-config.js"></script>\n</head>')
    (output / 'index.html').write_text(html)
    for name in ['styles.css', 'data-loader.js', 'real-app.js', 'surface-view.js', '.nojekyll']:
        shutil.copyfile(ROOT / name, output / name)
    (output / 'assets').mkdir()
    for asset in PUBLIC_ASSETS:
        shutil.copyfile(ROOT / asset, output / asset)
    (output / 'site-config.js').write_text('window.LexicalSiteConfig=' + json.dumps({'baseUrl': config['base_url']}) + ';\n')
    (output / 'hga').mkdir()
    (output / 'hga/index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=../#hga"><title>Open the HGA explorer</title><a href="../#hga">Open the HGA explorer</a></html>\n')
    public_manifest = {'data_release': config['data_release'], 'data_sha256': config['data_sha256'], 'kind': 'real', 'reference': data['reference'], 'source_date': data['sourceDate'], 'media_release': config['media_release'], 'media_sha256': config['media_sha256']}
    (output / 'version.json').write_text(json.dumps(public_manifest, indent=2) + '\n')
    allowed = {'index.html', 'styles.css', 'real-app.js', 'surface-view.js', '.nojekyll', 'assets/favicon.svg', 'real-data.js', 'site-config.js', 'hga/index.html', 'version.json'} | set(PUBLIC_ASSETS) | data_files | {'data-loader.js'} | media_files
    actual = {str(p.relative_to(output)) for p in output.rglob('*') if p.is_file()}
    assert actual == allowed
    for p in output.rglob('*'):
        if p.is_file() and p.suffix not in ('.png', '.gz', '.wav', '.webp'):
            value = p.read_text()
            assert '/hpc/' not in value and '/cwork/' not in value, p
    print('PAGES BUILD PASS:', len(actual), 'files; verified real bundle; no local paths')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--bundle', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--media', required=True, type=Path)
    args = parser.parse_args()
    build(args.bundle, args.output, args.media)
