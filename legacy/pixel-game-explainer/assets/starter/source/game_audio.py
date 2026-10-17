"""Dry game-feedback SFX palettes. No noise sweeps, wind, voices, or music bed."""
import argparse
import json
from pathlib import Path
import shutil
import wave
import numpy as np

RATE, SECONDS = 48000, 8
TIMES = [.45, 1.55, 2.9, 4.1, 5.55, 6.55]
KINDS = ['select', 'switch', 'lock', 'expand', 'confirm', 'reward']


def taper(data, attack=.0025, release=.025):
    out = data.copy()
    a, r = min(len(out), round(attack * RATE)), min(len(out), round(release * RATE))
    out[:a] *= np.linspace(0, 1, a) ** 1.3
    out[-r:] *= np.linspace(1, 0, r) ** 1.6
    return out


def note(frequency, length=.14, material='pulse', decay=.06, snap=0):
    t = np.arange(round(length * RATE)) / RATE
    phase = 2 * np.pi * frequency * (t + snap * .006 * (1 - np.exp(-t / .006)))
    if material == 'pulse':
        signal = .68 * np.sin(phase)
        for h in range(2, 11):
            signal += .34 * np.sin(np.pi * h * .28) * np.sin(phase * h) * np.exp(-h / 6) / h
    elif material == 'triangle':
        signal = sum((-1) ** i * np.sin((2 * i + 1) * phase) / (2 * i + 1) ** 2 for i in range(6))
    elif material == 'electric':
        modulation = 1.3 * np.exp(-t / .025)
        signal = .8 * np.sin(phase + modulation * np.sin(phase * 2))
        signal += .14 * np.sin(phase * 3) * np.exp(-t / .018)
    else:
        signal = .78 * np.sin(phase + .7 * np.sin(phase * 2) * np.exp(-t / .025))
        signal += .10 * np.sin(phase * 4) * np.exp(-t / .024)
    return taper(signal * np.exp(-t / decay) * .15)


def low_hit(length=.18, frequency=120):
    t = np.arange(round(length * RATE)) / RATE
    f = 70 + (frequency - 70) * np.exp(-t / .011)
    phase = 2 * np.pi * np.cumsum(f) / RATE
    return taper((np.sin(phase) + .22 * np.sin(2 * phase)) * np.exp(-t / .042) * .23)


def combine(length, pieces):
    result = np.zeros(round(length * RATE))
    for at, sound, gain in pieces:
        offset = round(at * RATE)
        n = min(len(sound), len(result) - offset)
        if n > 0:
            result[offset:offset + n] += sound[:n] * gain
    return taper(result)


def sequence(notes, step=.055, material='pulse', length=.13, decay=.055):
    return combine(step * (len(notes) - 1) + length,
                   [(i * step, note(f, length, material, decay), 1) for i, f in enumerate(notes)])


def cue(style, kind):
    if style == 0:
        library = {
            'select': lambda: note(659.25, .12, 'pulse', .040, .12),
            'switch': lambda: sequence([440, 587.33], .045, 'triangle', .10, .035),
            'lock': lambda: combine(.18, [(0, low_hit(.15, 150), .32), (.008, note(783.99, .14, 'pulse', .042), 1)]),
            'expand': lambda: sequence([392, 523.25, 659.25], .047, 'triangle', .13, .050),
            'confirm': lambda: sequence([783.99, 1046.5], .075, 'pulse', .16, .060),
            'reward': lambda: combine(.40, [(0, low_hit(.17, 140), .20), (.015, sequence([523.25, 659.25, 1046.5], .065, 'triangle', .21, .078), .92)]),
        }
    elif style == 1:
        library = {
            'select': lambda: combine(.14, [(0, note(392, .09, 'electric', .025), 1), (.035, note(784, .08, 'electric', .023), .35)]),
            'switch': lambda: sequence([329.63, 493.88], .044, 'electric', .12, .033),
            'lock': lambda: combine(.20, [(0, low_hit(.18, 170), .56), (.012, note(698.46, .15, 'electric', .039), .70)]),
            'expand': lambda: combine(.31, [(0, note(246.94, .09, 'electric', .026), .55), (.045, sequence([493.88, 587.33, 739.99], .044, 'pulse', .13, .043), .83)]),
            'confirm': lambda: combine(.26, [(0, note(440, .13, 'electric', .040), .60), (.055, note(880, .17, 'triangle', .060), .86)]),
            'reward': lambda: combine(.41, [(0, low_hit(.20, 180), .66), (.025, sequence([440, 659.25, 880], .066, 'electric', .20, .070), .74)]),
        }
    else:
        library = {
            'select': lambda: note(659.25, .18, 'mallet', .062),
            'switch': lambda: sequence([440, 554.37], .045, 'mallet', .14, .048),
            'lock': lambda: combine(.24, [(0, note(293.66, .15, 'triangle', .043), .45), (.014, note(587.33, .19, 'mallet', .058), .90)]),
            'expand': lambda: sequence([440, 554.37, 659.25], .056, 'mallet', .19, .067),
            'confirm': lambda: sequence([659.25, 880], .080, 'mallet', .25, .088),
            'reward': lambda: combine(.51, [(0, note(220, .23, 'triangle', .065), .28), (.018, sequence([440, 554.37, 659.25, 880], .063, 'mallet', .27, .096), .85)]),
        }
    data = library[kind]()
    f = np.fft.rfftfreq(len(data), 1 / RATE)
    tilt = 1 / np.sqrt(1 + (f / 5200) ** 8)
    tilt *= f ** 2 / (f ** 2 + 45 ** 2)
    return taper(np.fft.irfft(np.fft.rfft(data) * tilt, n=len(data)))


def place(output, at, signal, pan=.5, gain=1):
    start = round(at * RATE)
    n = min(len(signal), len(output) - start)
    if n <= 0:
        return
    output[start:start + n, 0] += signal[:n] * np.cos(pan * np.pi / 2) * gain
    output[start:start + n, 1] += signal[:n] * np.sin(pan * np.pi / 2) * gain


def write_wav(path, data):
    with wave.open(str(path), 'wb') as w:
        w.setparams((2, 2, RATE, 0, 'NONE', 'not compressed'))
        w.writeframes(np.round(data * 32767).astype('<i2').tobytes())


def render(style, name, out):
    data = np.zeros((RATE * SECONDS, 2))
    events = []
    for i, (at, kind) in enumerate(zip(TIMES, KINDS)):
        signal = cue(style, kind)
        signal *= .10 / max(np.sqrt(np.mean(signal ** 2)), 1e-5)
        place(data, at, signal, [.49, .48, .50, .52, .50, .50][i])
        if style == 2:
            place(data, at + .045, signal, .5, .075)
        events.append({'at': at, 'kind': kind, 'dryDuration': round(len(signal) / RATE, 3)})
    gain = .033 / max(np.sqrt(np.mean(data ** 2)), 1e-5)
    for _ in range(5):
        mastered = .60 * np.tanh(data * gain / .60)
        gain *= .033 / max(np.sqrt(np.mean(mastered ** 2)), 1e-5)
    file = f'G{style + 1}-{name}.wav'
    write_wav(out / file, mastered)
    return {'file': file, 'durationSeconds': SECONDS, 'peakDbfs': round(float(20 * np.log10(np.max(np.abs(mastered)))), 2),
            'rmsDbfs': round(float(20 * np.log10(np.sqrt(np.mean(mastered ** 2)))), 2), 'events': events}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    tracks = [render(i, name, args.out) for i, name in enumerate(['pixel-action', 'cyber-arena', 'rpg-reward'])]
    manifest = {'humanVoice': False, 'musicBed': False, 'windNoise': False, 'noiseSweeps': False,
                'sampleRate': RATE, 'channels': 2, 'method': 'original procedural game-feedback sound design',
                'sameSixActionTimes': TIMES, 'tracks': tracks}
    (args.out / 'audio-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    target = args.out / 'synth.py'
    if target.resolve() != Path(__file__).resolve():
        shutil.copyfile(Path(__file__), target)
    print(json.dumps(tracks, indent=2))


if __name__ == '__main__':
    main()
