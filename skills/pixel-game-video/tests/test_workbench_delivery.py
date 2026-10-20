"""Portable workbench snapshots contain source, never live project links or state."""
from pathlib import Path
import sys
import tempfile
import unittest

SKILL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SKILL))
from engine.delivery import copy_skill, skill_files


class WorkbenchDeliveryTests(unittest.TestCase):
    def test_snapshot_keeps_editor_sources_and_excludes_live_artifacts(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder) / 'skill'
            kept = ['workbench/src/App.tsx', 'workbench/scripts/open.mjs',
                    'workbench/package.json', 'workbench/package-lock.json',
                    'workbench/LICENSE', 'workbench/NOTICE',
                    'modules/audio/assets/arcade-motion/select.wav']
            excluded = ['workbench/node_modules/private/cache.json',
                        'workbench/exports/my-film.mp4', 'workbench/.render-public/payload.json',
                        'workbench/.parity/frame.png', 'workbench/gen/modules.ts',
                        'workbench/public/payload.json', 'workbench/dist/index.html',
                        'workbench/.dev.pid', 'workbench/.dev.meta.json', 'workbench/.dev-5208.pid',
                        'workbench/src/projMeta.ts', 'workbench/src/mediaManifest.ts',
                        'workbench/tsconfig.tsbuildinfo']
            for name in kept + excluded:
                file = root / name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_text(name, encoding='utf-8')
            outside = Path(folder) / 'unrelated-project.json'
            outside.write_text('private local project state', encoding='utf-8')
            (root / 'workbench/proj').symlink_to(outside)
            (root / 'linked-secret.json').symlink_to(outside)
            packaged = {name.as_posix() for name in skill_files(root)}
            self.assertTrue(set(kept).issubset(packaged))
            self.assertTrue(set(excluded).isdisjoint(packaged))
            self.assertNotIn('workbench/proj', packaged)
            self.assertNotIn('linked-secret.json', packaged)
            target = Path(folder) / 'delivery'
            copy_skill(root, target)
            self.assertEqual((target / kept[0]).read_text(), kept[0])
            self.assertFalse((target / 'workbench/proj').exists())


if __name__ == '__main__':
    unittest.main()
