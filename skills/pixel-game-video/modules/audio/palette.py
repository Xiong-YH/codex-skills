"""Contact, data, spring, magnetic, glass and fault materials around the approved G2 identity."""
import numpy as np
import game_audio as S
import arcade

RATE = S.RATE
MATERIALS = {
    'code-tap': 'mechanical contact', 'replicate': 'data grains', 'select': 'contact + G2 identity',
    'focus-step': 'magnetic glide', 'lock': 'physical snap + electronic latch',
    'panel-open': 'spring pop', 'question-tick': 'soft marker pop',
    'system-unfold': 'glass sockets', 'node-connect': 'contact + socket resonance',
    'extract': 'spring + magnetic motion', 'boundary-hit': 'short electric fault',
    'repair': 'glass recovery', 'verified': 'glass + G2 confirmation',
    'compare': 'paired tactile knocks', 'commit': 'snap + G2 latch',
    'product-build': 'assembly contacts + power pulse', 'stage-done': 'role-specific checkpoint',
    'product-ready': 'power-on response', 'complete': 'G2 reward + crystal layer',
    **{item['id']: item['design'] for item in arcade.entries()},
}


def band(data, low=55, high=5500):
    f = np.fft.rfftfreq(len(data), 1 / RATE)
    response = f ** 2 / (f ** 2 + low ** 2) / np.sqrt(1 + (f / high) ** 8)
    return S.taper(np.fft.irfft(np.fft.rfft(data) * response, n=len(data)), .001, .008)


def contact(seed=0, body=1350, length=.052):
    t = np.arange(round(length * RATE)) / RATE
    rng = np.random.default_rng(800 + seed)
    # Noise is confined to a millisecond-scale physical contact, never a wind/sweep layer.
    impulse = rng.uniform(-1, 1, len(t)) * np.exp(-t / .0015)
    ring = np.sin(2 * np.pi * body * t) * np.exp(-t / .006)
    ring += .28 * np.sin(2 * np.pi * body * 1.73 * t) * np.exp(-t / .003)
    return band((impulse * .55 + ring * .45) * .25, 180, 4700)


def snap(seed=0, weight=1):
    return S.combine(.13, [(0, contact(seed, 780, .045), .9 * weight),
                            (.013, contact(seed + 40, 1850, .045), .32),
                            (.007, S.low_hit(.10, 175), .15 * weight)])


def pluck(frequency=196, length=.17, seed=0):
    t = np.arange(round(length * RATE)) / RATE
    rng = np.random.default_rng(1800 + seed)
    signal = np.zeros(len(t))
    for h in range(1, 20):
        decay = .052 / (1 + .085 * h)
        signal += np.sin(2 * np.pi * frequency * h * t + rng.uniform(-.4, .4)) / h ** 1.25 * np.exp(-t / decay)
    return band(signal * .14, 65, 4500)


def glass(frequency=740, length=.21):
    t = np.arange(round(length * RATE)) / RATE
    result = np.zeros(len(t))
    for ratio, level, decay in [(1, .60, .065), (2.76, .32, .041), (5.4, .14, .023), (8.93, .05, .012)]:
        result += np.sin(2 * np.pi * frequency * ratio * t) * np.exp(-t / decay) * level
    return band(result * .17, 120, 5500)


def magnetic(up=True, length=.18):
    t = np.arange(round(length * RATE)) / RATE
    start, end = (135, 345) if up else (300, 105)
    f = start + (end - start) * (t / length) ** .65
    phase = 2 * np.pi * np.cumsum(f) / RATE
    shape = np.sin(phase + .65 * np.sin(phase * 2.02)) + .17 * np.sin(phase * 3)
    envelope = np.sin(np.pi * t / length) ** 1.3
    return band(shape * envelope * .13, 60, 2600)


def data_grains(variant=0):
    rng = np.random.default_rng(2800 + variant)
    pieces = []
    for i in range(6):
        length = .009 + .003 * (i % 2)
        noise = rng.choice([-1., 1.], round(length * RATE / 4) + 1)
        held = np.repeat(noise, 4)[:round(length * RATE)]
        held *= np.sin(np.linspace(0, np.pi, len(held))) ** 2
        grain = band(held * .10, 480, 3500)
        pieces.append((.005 + i * .027, grain, .7 + .08 * i))
    pieces.append((.15, S.note([329.63, 392, 493.88][variant], .075, 'electric', .021), .5))
    return S.combine(.25, pieces)


def fault(variant=0):
    t = np.arange(round((.105 + variant * .008) * RATE)) / RATE
    f = 145 + 14 * variant
    carrier = np.sin(2 * np.pi * f * t + 2.1 * np.sin(2 * np.pi * 2.7 * f * t))
    carrier *= .72 + .28 * np.sin(2 * np.pi * 57 * t)
    return band(carrier * np.exp(-t / .027) * .17, 110, 3300)


def sound(kind, variant):
    if kind.startswith('arcade-'):
        return arcade.sound(kind, variant)
    if kind == 'code-tap':
        return S.combine(.085, [(0, contact(variant, 1600 + variant * 180), 1),
                                (.011, contact(variant + 11, 900), .28)])
    if kind == 'replicate':
        return data_grains(variant)
    if kind == 'select':
        return S.combine(.18, [(0, contact(80 + variant, 1500), .58),
                               (.008, S.cue(1, 'select'), .80)])
    if kind == 'focus-step':
        return S.combine(.23, [(0, magnetic(True), .9), (.165, contact(91, 1850), .45)])
    if kind == 'lock':
        return S.combine(.24, [(0, snap(100 + variant), .72), (.012, S.cue(1, 'lock'), .68)])
    if kind == 'panel-open':
        return S.combine(.27, [(0, pluck(174.61, .18, 3), .9), (.10, snap(120, .6), .43)])
    if kind == 'question-tick':
        return S.combine(.12, [(0, pluck([261.63, 329.63, 392][variant], .11, 15 + variant), .72),
                               (.015, contact(130 + variant, 1800), .27)])
    if kind == 'system-unfold':
        return S.combine(.32, [(0, glass(392, .14), .72), (.066, snap(143, .4), .45),
                               (.11, glass(493.88, .14), .68), (.20, glass(587.33, .12), .54)])
    if kind == 'node-connect':
        return S.combine(.18, [(0, contact(150, 1450), .90), (.012, glass(1046.5, .14), .54)])
    if kind == 'extract':
        return S.combine(.26, [(0, pluck(220, .15, 19), .58), (.025, magnetic(False), .65),
                               (.19, contact(160, 1100), .5)])
    if kind == 'boundary-hit':
        return S.combine(.15, [(0, fault(variant), .90), (.008, contact(170 + variant, 680), .30)])
    if kind == 'repair':
        return S.combine(.22, [(0, contact(180 + variant, 2100), .24),
                               (.007, glass([659.25, 783.99][variant], .19), .90)])
    if kind == 'verified':
        return S.combine(.36, [(0, S.cue(1, 'confirm'), .80), (.086, glass(1174.66, .22), .36)])
    if kind == 'compare':
        return S.combine(.30, [(0, snap(190, .8), .68), (.125, pluck(246.94, .15, 30), .85),
                               (.14, contact(192, 1850), .42)])
    if kind == 'commit':
        return S.combine(.33, [(0, snap(200), .80), (.018, S.cue(1, 'lock'), .60),
                               (.09, glass(880, .19), .38)])
    if kind == 'product-build':
        return S.combine(.37, [(0, snap(210, .6), .42), (.047, contact(211, 1650), .46),
                               (.091, pluck(293.66, .13, 37), .52), (.145, S.cue(1, 'select'), .74)])
    if kind == 'stage-done':
        if variant == 0:
            return S.combine(.16, [(0, snap(220, .5), .50), (.02, S.note(392, .12, 'electric', .040), .55)])
        if variant == 1:
            return S.combine(.18, [(0, pluck(246.94, .15, 41), .72), (.016, glass(739.99, .12), .36)])
        return S.combine(.21, [(0, contact(223, 2000), .24), (.012, glass(987.77, .17), .80)])
    if kind == 'product-ready':
        return S.combine(.30, [(0, magnetic(True, .13), .50), (.09, S.note(880, .16, 'triangle', .055), .63),
                               (.13, contact(230, 1900), .36)])
    if kind == 'complete':
        return S.combine(.49, [(0, S.cue(1, 'reward'), .86), (.10, glass(880, .23), .28),
                               (.21, glass(1318.51, .22), .22)])
    raise ValueError('Unknown sound kind: ' + kind)
