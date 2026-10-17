"""Style switching must produce self-contained previews from clean projects."""
import base64
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

SKILL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SKILL))
from engine.builder import build, style_file
from engine.compiler import compile_project, read_json, write_json


class StyleBuildTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'project'
        shutil.copytree(SKILL / 'assets/project-template', self.root)

    def use_style(self, ident):
        project = read_json(self.root / 'project.json')
        project['style'] = ident
        write_json(self.root / 'project.json', project)
        target = build(self.root, compile_project(self.root), SKILL, silent=True)
        return target.read_text(encoding='utf-8'), read_json(self.root / 'build/payload.json')

    def test_cyberpunk_preview_embeds_exact_backdrop_bytes(self):
        document, payload = self.use_style('style.cyberpunk.v1')
        uri = payload['assets']['style.cyberpunk-city.v1']
        self.assertTrue(uri.startswith('data:image/png;base64,'))
        self.assertEqual(base64.b64decode(uri.split(',', 1)[1]),
                         (SKILL / 'modules/style/assets/cyberpunk-city.png').read_bytes())
        self.assertIn(uri, document)
        self.assertNotIn(str(SKILL), document)
        runtime = (self.root / 'build/runtime.js').read_text(encoding='utf-8')
        self.assertIn((SKILL / 'modules/style/cyberpunk.js').read_text(encoding='utf-8'), runtime)

    def test_switching_back_to_daylight_removes_cyberpunk_dependencies(self):
        self.use_style('style.cyberpunk.v1')
        document, payload = self.use_style('style.modern-pixel.v1')
        self.assertNotIn('style.cyberpunk-city.v1', payload['assets'])
        self.assertEqual(payload['style']['colors']['background'], '#edf3e6')
        self.assertNotIn('data:image/png;base64,' + base64.b64encode(
            (SKILL / 'modules/style/assets/cyberpunk-city.png').read_bytes()).decode('ascii'), document)

    def test_style_paths_are_confined_to_the_module(self):
        style_root = (SKILL / 'modules/style').resolve()
        with self.assertRaisesRegex(ValueError, 'inside the style module'):
            style_file(style_root, '../library/runtime.js')


if __name__ == '__main__':
    unittest.main()
