"""Build a content-free install ZIP from an explicit runtime allowlist."""
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / 'system.json').read_text())
dist = root / 'dist'
dist.mkdir(exist_ok=True)
files = [root / 'system.json', root / 'README.md']
for directory in ('scripts', 'templates', 'styles', 'lang', 'docs'):
    files.extend(p for p in sorted((root / directory).rglob('*')) if p.is_file())
archive = dist / f"kingdom-death-{manifest['version']}.zip"
with ZipFile(archive, 'w', ZIP_DEFLATED) as z:
    for p in files:
        z.write(p, str(Path('kingdom-death') / p.relative_to(root)))
with ZipFile(archive) as z:
    assert z.testzip() is None
    assert 'kingdom-death/system.json' in z.namelist()
    assert all(not n.endswith('.pdf') and '/node_modules/' not in n for n in z.namelist())
(dist / 'system.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Built and inspected {archive} ({len(files)} files)')
