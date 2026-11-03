"""Backend capability boundaries; unsupported visuals fail before building."""

REMOTION_STYLES = frozenset({'style.pixel-editorial.v1'})
REMOTION_SCENES = frozenset({'scenes.focus-desk.v1'})
REMOTION_ACTORS = frozenset({'actor.azong.v3'})
REMOTION_MOTIONS = frozenset({'motion.camera-track.v1', 'motion.book-sweep.v1'})


def validate(project, shots, progress=None):
    if project.get('renderBackend', 'canvas') != 'remotion':
        return
    if project['style'] not in REMOTION_STYLES:
        raise ValueError('Remotion currently supports style.pixel-editorial.v1 only')
    if progress:
        raise ValueError('Remotion narrative progress is not supported; use renderBackend=canvas')
    for shot in shots:
        if shot['scene'] not in REMOTION_SCENES:
            raise ValueError('Remotion currently supports scenes.focus-desk.v1 only')
        if shot.get('actor') is not None and shot['actor'] not in REMOTION_ACTORS:
            raise ValueError('Remotion focus-desk supports actor.azong.v3 or actor:null')
        if shot.get('performance'):
            raise ValueError('Remotion actor performance is not supported; use renderBackend=canvas')
        if shot['components'] or shot['objects'] or shot.get('background') or shot.get('replacement'):
            raise ValueError('Remotion focus-desk owns its composition; components, objects and project media are not supported')
        for motion in shot['motions']:
            if motion['recipe'] not in REMOTION_MOTIONS:
                raise ValueError(f"Remotion motion executor unavailable: {motion['recipe']}")
