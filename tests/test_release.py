import copy
import io
import json
import unittest
from pathlib import Path
from zipfile import ZipFile
from tools.check_release import check_archive

ROOT = Path(__file__).resolve().parent.parent

class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.manifest = json.loads((ROOT / 'system.json').read_text())
        self.files = {'kingdom-death/system.json': json.dumps(self.manifest),
                      'kingdom-death/scripts/main.mjs': 'import "./child.mjs"; const template="systems/kingdom-death/templates/test.hbs";',
                      'kingdom-death/scripts/child.mjs': 'export const example = true;',
                      'kingdom-death/templates/test.hbs': '<div>Test</div>',
                      'kingdom-death/styles/kingdom-death.css': '',
                      'kingdom-death/lang/en.json': '{}'}
    def check(self, manifest=None, files=None):
        buffer = io.BytesIO()
        with ZipFile(buffer,'w') as z:
            for path, content in (files if files is not None else self.files).items(): z.writestr(path, content)
        return check_archive(manifest or self.manifest, buffer.getvalue())
    def test_complete_distribution_passes(self):
        self.assertEqual(self.check()['version'], self.manifest['version'])
    def test_v010_missing_verified_regression(self):
        m=copy.deepcopy(self.manifest); del m['compatibility']['verified']
        with self.assertRaisesRegex(ValueError, 'Explicit minimum'): self.check(m)
    def test_target_cannot_silently_change(self):
        for key in ['minimum','verified','maximum']:
            m=copy.deepcopy(self.manifest); m['compatibility'][key]='15'
            with self.assertRaises(ValueError): self.check(m)
    def test_wrong_root_and_double_nesting_rejected(self):
        for prefix in ['kingdom-death-main/', 'kingdom-death/']:
            with self.assertRaises(ValueError): self.check(files={prefix+k:v for k,v in self.files.items()})
    def test_manifest_mismatch_rejected(self):
        self.files['kingdom-death/system.json']='{}'
        with self.assertRaisesRegex(ValueError,'manifests differ'): self.check()
    def test_download_version_mismatch_rejected(self):
        m=copy.deepcopy(self.manifest);m['download']=m['download'].replace('/v'+m['version']+'/', '/v999.0.0/')
        with self.assertRaisesRegex(ValueError,'Download URL'): self.check(m)
    def test_missing_entry_import_template_and_style_rejected(self):
        for path in ['scripts/main.mjs','scripts/child.mjs','templates/test.hbs','styles/kingdom-death.css']:
            files=dict(self.files);del files['kingdom-death/'+path]
            with self.assertRaisesRegex(ValueError,'Missing packaged'): self.check(files=files)
    def test_missing_actor_types_and_dependencies_rejected(self):
        m=copy.deepcopy(self.manifest);m['documentTypes']['Actor']={}
        with self.assertRaisesRegex(ValueError,'Actor types'): self.check(m)
        m=copy.deepcopy(self.manifest);m['relationships']={'requires':[{'id':'unavailable'}]}
        with self.assertRaisesRegex(ValueError,'dependency'): self.check(m)
    def test_private_files_and_escaping_paths_rejected(self):
        for path in ['../escape', 'kingdom-death/.env', 'kingdom-death/source.pdf']:
            with self.assertRaises(ValueError): self.check(files={**self.files,path:''})
