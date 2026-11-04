"""Check actual distribution bytes; no Foundry runtime or Forge emulation."""
import argparse
import hashlib
import io
import json
import posixpath
import re
from pathlib import Path, PurePosixPath
from urllib.request import urlopen
from zipfile import ZipFile

BASE = 'https://github.com/paddirn/kingdom-death/releases'
TARGET = '14.365'

def require(condition, message):
    if not condition:
        raise ValueError(message)

def check_manifest(manifest):
    require(manifest.get('id') == 'kingdom-death', 'System ID must be kingdom-death')
    require(bool(manifest.get('title')), 'Missing title')
    require(bool(manifest.get('description')), 'Missing description')
    version = manifest.get('version', '')
    require(bool(re.fullmatch(r'\d+\.\d+\.\d+', version)), 'Expected semantic release version')
    require(manifest.get('compatibility') == dict(minimum=TARGET, verified=TARGET, maximum=TARGET),
            'Explicit minimum, verified and maximum must all be 14.365; metadata is not runtime evidence')
    require(manifest.get('manifest') == f'{BASE}/latest/download/system.json', 'Unexpected update manifest URL')
    require(manifest.get('download') == f'{BASE}/download/v{version}/kingdom-death-{version}.zip', 'Download URL/version mismatch')
    require(set(manifest.get('documentTypes', {}).get('Actor', {})) == {'survivor','monster','settlement'}, 'Actor types missing')
    require(set(manifest.get('documentTypes', {}).get('Item', {})) == {'gear','resource','ability','disorder','fightingArt','innovation','settlementLocation','proficiency'}, 'Item types missing')
    require(not manifest.get('relationships', {}).get('requires'), 'Unexpected required package dependency')
    require(not manifest.get('relationships', {}).get('recommends'), 'Unexpected recommended dependency')
    require(bool(manifest.get('esmodules')), 'Missing system entry module')
    require(bool(manifest.get('styles')), 'Missing stylesheet')
    return version

def check_archive(manifest, payload):
    version = check_manifest(manifest)
    with ZipFile(io.BytesIO(payload)) as z:
        require(z.testzip() is None, 'ZIP integrity failure')
        names = z.namelist()
        require(len(set(names)) == len(names), 'Duplicate ZIP paths')
        require('kingdom-death/system.json' in names, 'Missing kingdom-death/system.json at expected depth')
        for name in names:
            parts = PurePosixPath(name).parts
            require(parts and parts[0] == 'kingdom-death' and '..' not in parts and '\\' not in name, 'Unexpected ZIP root or unsafe path')
            require(not any(p in {'.git','node_modules','project_sources'} or p.startswith('.env') for p in parts), 'Development/private file in ZIP')
            require(not name.lower().endswith('.pdf'), 'Source PDF in ZIP')
        require(json.loads(z.read('kingdom-death/system.json')) == manifest, 'Release and embedded manifests differ')
        def present(relative):
            normalized = posixpath.normpath(relative)
            require(not normalized.startswith(('../','/')), 'Path escapes package')
            require(f'kingdom-death/{normalized}' in names, f'Missing packaged file: {normalized}')
        for relative in manifest['esmodules'] + manifest['styles'] + [x['path'] for x in manifest.get('languages',[])]:
            present(relative)
        for name in names:
            if name.endswith('.mjs'):
                source = z.read(name).decode()
                for imp in re.findall(r'''(?:from\s+|import\s*)["'](\.[^"']+)["']''', source):
                    present(posixpath.join(posixpath.dirname(name.removeprefix('kingdom-death/')), imp))
                for template in re.findall(r'''systems/kingdom-death/([^"']+\.hbs)''', source):
                    present(template)
    return {'version': version, 'files': len(names), 'zip_sha256': hashlib.sha256(payload).hexdigest()}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', help='Local manifest path or public HTTPS manifest URL')
    parser.add_argument('--zip', dest='zip_path', help='Local ZIP; otherwise download from manifest')
    args = parser.parse_args()
    if args.manifest.startswith('https://'):
        with urlopen(args.manifest, timeout=60) as response:
            manifest = json.load(response)
    else:
        manifest = json.loads(Path(args.manifest).read_text())
    check_manifest(manifest)
    if args.zip_path:
        payload = Path(args.zip_path).read_bytes()
    else:
        # This also verifies that the exact download URL resolves to actual ZIP bytes.
        with urlopen(manifest['download'], timeout=60) as response:
            payload = response.read()
    print(json.dumps(check_archive(manifest, payload), indent=2))

if __name__ == '__main__':
    main()
