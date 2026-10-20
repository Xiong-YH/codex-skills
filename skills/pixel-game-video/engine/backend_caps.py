"""Backend capability boundaries; unsupported visuals fail before building."""


def validate(project, shots, progress=None):
    if project.get('renderBackend', 'canvas') != 'remotion':
        return
    if project['style'] != 'style.pixel-editorial.v1':
        raise ValueError('Remotion currently supports style.pixel-editorial.v1 only')
    if progress:
        raise ValueError('Remotion narrative progress is not supported; use renderBackend=canvas')
    supported_motions = {'motion.camera-track.v1', 'motion.book-sweep.v1'}
    for shot in shots:
        if shot['scene'] != 'scenes.focus-desk.v1':
            raise ValueError('Remotion currently supports scenes.focus-desk.v1 only')
        if shot.get('actor') not in (None, 'actor.azong.v3'):
            raise ValueError('Remotion focus-desk supports actor.azong.v3 or actor:null')
        if shot.get('performance'):
            raise ValueError('Remotion actor performance is not supported; use renderBackend=canvas')
        if shot['components'] or shot['objects'] or shot.get('background') or shot.get('replacement'):
            raise ValueError('Remotion focus-desk owns its composition; components, objects and project media are not supported')
        for motion in shot['motions']:
            if motion['recipe'] not in supported_motions:
                raise ValueError(f"Remotion motion executor unavailable: {motion['recipe']}")
