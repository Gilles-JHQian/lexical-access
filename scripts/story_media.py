"""Strictly allowlisted, checksum-pinned presentation assets, separate from HGA."""
import hashlib
import json
from pathlib import Path
import zipfile
from contrast_panels import CONTRAST_FILES

ROOT = Path(__file__).resolve().parents[1]
MEDIA_FILES = {'media/altitude.wav', 'media/aelkahhaazh.wav', 'media/poster-decoding.webp', 'media/poster-decoding.svg'} | CONTRAST_FILES


def install_media(archive, output):
    config = json.loads((ROOT / 'deployment.json').read_text())
    if not archive or hashlib.sha256(archive.read_bytes()).hexdigest() != config['media_sha256']:
        raise ValueError('Story media does not match the reviewed release checksum')
    with zipfile.ZipFile(archive) as source:
        entries = source.infolist()
        if len(entries) != len(MEDIA_FILES) or {item.filename for item in entries} != MEDIA_FILES:
            raise ValueError('Unexpected media archive contents')
        for item in entries:
            if item.file_size > 5_000_000:
                raise ValueError('Oversized presentation asset')
            # Write only named files, never extract directories or archive paths.
            target = output / item.filename
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(source.read(item))
    return MEDIA_FILES
