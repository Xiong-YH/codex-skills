#!/usr/bin/env python3
"""Install a portable export on this computer; never replace an existing draft.

This stdlib-only script also ships in exports as install.py with _platforms/.
Mac device metadata is read only during local installation, never during export.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import shutil
import sys
import tempfile
import uuid
import plistlib


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def adapter(platform):
    here = Path(__file__).resolve().parent
    root = here / '_platforms'
    if not root.is_dir():
        root = here / 'vendor' / 'jianying'
    path = root / ('mac_draft.py' if platform == 'mac' else 'windows_draft.py')
    spec = importlib.util.spec_from_file_location('pixel_jianying_platform', path)
    module = importlib.util.module_from_spec(spec)
    # Prerequisite checks and installation must not write caches into the
    # portable package, including when Python's default bytecode writing is on.
    previous = sys.dont_write_bytecode
    try:
        sys.dont_write_bytecode = True
        spec.loader.exec_module(module)
    finally:
        sys.dont_write_bytecode = previous
    return module


def validate_bundle(source):
    source = Path(source).resolve()
    content = read(source / 'draft_content.json')
    read(source / 'draft_meta_info.json')
    resources = (source / 'Resources').resolve()
    for kind in ('videos', 'audios'):
        for material in content.get('materials', {}).get(kind, []):
            relative = Path(material['path'])
            if relative.is_absolute() or '..' in relative.parts:
                raise ValueError('Portable media must use Resources-relative paths')
            media = (source / relative).resolve()
            if not media.is_relative_to(resources) or not media.is_file():
                raise ValueError('Missing or unsafe bundled media: ' + str(relative))
    for path in source.rglob('*'):
        if path.is_symlink():
            raise ValueError('Draft bundle must not contain symlinks')
    return content


def mac_is_running():
    import subprocess
    process = subprocess.run(['ps', '-axo', 'comm='], capture_output=True, text=True)
    if process.returncode != 0:
        raise RuntimeError('Cannot confirm JianYing is closed; retry outside the restricted terminal')
    names = [Path(line.strip()).name.casefold() for line in process.stdout.splitlines()]
    exact = {'jianyingpro', 'jianying pro', 'capcut', '剪映专业版'}
    prefixes = ('videofusion-macos', 'jianyingpro helper', 'capcut helper')
    # Cmd+Q on Mac 11.2 leaves this LSUIElement tray app resident. It is
    # separate from the editor; continue blocking all main/rendering helpers.
    return any((name in exact or name.startswith(prefixes)) and
               name != 'videofusion-macostrayhelper' for name in names)


def detected_mac_version():
    for parent in (Path('/Applications'), Path.home() / 'Applications'):
        for name in ('VideoFusion-macOS.app', '剪映专业版.app', 'JianyingPro.app'):
            try:
                info = plistlib.loads((parent / name / 'Contents/Info.plist').read_bytes())
            except (OSError, plistlib.InvalidFileException):
                continue
            if info.get('CFBundleIdentifier') == 'com.lemon.lvpro':
                return info.get('CFBundleShortVersionString')
    return None


def install_bundle(source, name=None, platform=None, draft_root=None, donor=None, check=False):
    source = Path(source).resolve()
    content = validate_bundle(source)
    platform = platform or ('mac' if sys.platform == 'darwin' else 'windows' if sys.platform == 'win32' else None)
    if platform not in ('mac', 'windows'):
        raise ValueError('Install on macOS or Windows; generation does not require JianYing')
    module = adapter(platform)
    name = name or content.get('name') or source.name
    if platform == 'mac':
        if draft_root:
            module.DRAFT_ROOT = str(Path(draft_root).expanduser().resolve())
            module.ROOT_META = str(Path(module.DRAFT_ROOT) / 'root_meta_info.json')
        target = Path(module._validate_draft_name(name))
        # Read executable names without command arguments: mentioning the draft
        # path in a shell is not the app. Include the actual Mac 11.2 executable
        # and helpers, whose names differ from the product's displayed name.
        if mac_is_running():
            raise RuntimeError('请先在剪映中保存并完全退出（Cmd+Q），再安装草稿')
        module.jianying_running = mac_is_running
        registry = read(module.ROOT_META)
        if not isinstance(registry.get('all_draft_store'), list):
            raise ValueError('Invalid JianYing draft registry')
        if any(e.get('draft_name') == name for e in registry['all_draft_store']):
            raise FileExistsError('Draft name is already registered; choose another --name')
        version = detected_mac_version()
        if not donor and version == '11.2.0':
            # Verified in the native Mac 11.2.0 app: opens, renders all media,
            # exposes native text/audio and plays the complete 15s timeline.
            # No device identifiers are needed for this exact tested version.
            platform_info = {'os': 'mac', 'app_version': version}
            metadata_policy = 'verified-no-device-identifiers'
        else:
            platform_info = module._mac_platform(str(donor) if donor else None)
            metadata_policy = 'local-plaintext-donor'
        module._mac_platform = lambda donor_draft=None, allow_missing_fingerprint=False: dict(platform_info)
    else:
        root = str(Path(draft_root).expanduser().resolve()) if draft_root else module.default_draft_root()
        target = Path(module._validate_draft_name(name, root))
        if module.jianying_running():
            raise RuntimeError('请先保存并完全退出剪映，再安装草稿')
    if target.exists():
        raise FileExistsError('Draft already exists; choose another --name: ' + str(target))
    if check:
        result = {'ready': True, 'platform': platform, 'name': name, 'target': str(target), 'replacesExisting': False}
        if platform == 'mac':
            result.update(macVersion=version, platformMetadataPolicy=metadata_policy)
        return result

    # Work on a copy so the portable export never acquires local identifiers.
    with tempfile.TemporaryDirectory(prefix='pixel-jianying-install-') as temp:
        working = Path(temp) / 'draft'
        shutil.copytree(source, working)
        local = read(working / 'draft_content.json')
        local_id = str(uuid.uuid4()).upper()
        local['id'] = local_id
        meta = read(working / 'draft_meta_info.json')
        meta['draft_id'] = local_id
        (working / 'draft_meta_info.json').write_text(json.dumps(meta, ensure_ascii=False), encoding='utf-8')
        for kind in ('videos', 'audios'):
            for material in local.get('materials', {}).get(kind, []):
                # The adapter copies into working/Resources. Read the original
                # portable resource to avoid copying a file onto itself.
                material['path'] = str(source / material['path'])
        (working / 'draft_content.json').write_text(json.dumps(local, ensure_ascii=False), encoding='utf-8')
        # Recheck absence immediately before the platform installation.
        if target.exists():
            raise FileExistsError('Draft appeared during installation; choose another --name')
        if platform == 'mac':
            info = module.macify(str(working), name, donor_draft=str(donor) if donor else None)
            # Platform adapter creates a registry backup and rolls back failures.
            backup = module.install(str(working), name, info)
            return {'installed': str(target), 'platform': platform, 'registryBackup': backup,
                    'replacesExisting': False, 'macVersion': version, 'platformMetadataPolicy': metadata_policy}
        module.install(str(working), name, draft_root=root)
        return {'installed': str(target), 'platform': platform, 'replacesExisting': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('draft', nargs='?', type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument('--name')
    parser.add_argument('--platform', choices=['mac', 'windows'])
    parser.add_argument('--draft-root', type=Path)
    parser.add_argument('--donor-draft', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    try:
        result = install_bundle(args.draft, args.name, args.platform, args.draft_root, args.donor_draft, args.check)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except (ValueError, RuntimeError, OSError) as error:
        parser.exit(1, str(error) + '\n')


if __name__ == '__main__':
    main()
