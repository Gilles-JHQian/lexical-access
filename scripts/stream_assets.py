"""Lossless, content-addressed aggregate chunks for demand-loaded browser views."""
import base64
import copy
import gzip
import hashlib
import json
import struct
from pathlib import Path

PREFIX = 'window.LexicalRealBundle='
BLOCK_FRAMES = 8


def binary_payload(value):
    arrays = bytearray()
    def visit(v):
        if isinstance(v, dict) and {'shape', 'dtype', 'data'} <= v.keys():
            raw = base64.b64decode(v['data'], validate=True)
            arrays.extend(b'\0' * (-len(arrays) % 4))
            offset = len(arrays)
            arrays.extend(raw)
            return {'shape': v['shape'], 'dtype': v['dtype'], 'offset': offset, 'bytes': len(raw)}
        if isinstance(v, dict):
            return {k: visit(x) for k, x in v.items()}
        if isinstance(v, list):
            return [visit(x) for x in v]
        return v
    header = json.dumps(visit(value), separators=(',', ':')).encode()
    header += b' ' * (-len(header) % 4)
    return struct.pack('<I', len(header)) + header + arrays


def write_stream_assets(data, output):
    output = Path(output)
    (output / 'data').mkdir(parents=True, exist_ok=True)
    manifest = copy.deepcopy(data)
    manifest['schema'] = 3
    manifest['blockFrames'] = BLOCK_FRAMES
    files = set()
    def resource(name, value):
        raw = binary_payload(value)
        compressed = gzip.compress(raw, compresslevel=9, mtime=0)
        # Python 3.11/3.12 expose zlib's OS byte; normalize for stable asset URLs.
        compressed = compressed[:9] + b'\xff' + compressed[10:]
        digest = hashlib.sha256(compressed).hexdigest()
        name = f'data/{name}-{digest[:16]}.bin.gz'
        (output / name).write_bytes(compressed)
        files.add(name)
        return {'url': './' + name, 'sha256': digest, 'bytes': len(compressed), 'decodedBytes': len(raw)}
    for hemi, geometry in data['geometries'].items():
        manifest['geometries'][hemi] = resource('geometry-' + hemi, geometry)
    for key, cell in data['cells'].items():
        target = manifest['cells'][key]
        target.pop('tasks')
        target['id'] = key
        target['streams'] = {}
        for hemi in ('lh', 'rh'):
            support = {t: {k: v for k, v in task[hemi].items() if k != 'values'} for t, task in cell['tasks'].items()}
            stream = {'support': resource(key + '-' + hemi + '-support', support), 'blocks': []}
            for start in range(0, len(cell['times']), BLOCK_FRAMES):
                stop = min(start + BLOCK_FRAMES, len(cell['times']))
                values = {}
                for task, hemispheres in cell['tasks'].items():
                    packed = hemispheres[hemi]['values']
                    n = packed['shape'][1]
                    raw = base64.b64decode(packed['data'])
                    values[task] = {'shape': [stop - start, n], 'dtype': packed['dtype'], 'data': base64.b64encode(raw[start*n*2:stop*n*2]).decode()}
                block = resource(f'{key}-{hemi}-{start:03}', values)
                stream['blocks'].append(dict(start=start, count=stop-start, **block))
            target['streams'][hemi] = stream
    content = PREFIX + json.dumps(manifest, separators=(',', ':'), allow_nan=False) + ';\n'
    (output / 'real-data.js').write_text(content)
    files.add('real-data.js')
    return manifest, files
