param([string]$Project = $PSScriptRoot, [string]$Voice = 'Microsoft Kangkang', [int]$Rate = 1)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$projectRoot = (Resolve-Path -LiteralPath $Project).Path
$source = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $projectRoot 'script.json') | ConvertFrom-Json
$media = Join-Path $projectRoot 'media'
New-Item -ItemType Directory -Force -Path $media | Out-Null
$synth = [System.Speech.Synthesis.SpeechSynthesizer]::new()
try {
    $synth.SelectVoice($Voice)
    $synth.Rate = $Rate
    $format = [System.Speech.AudioFormat.SpeechAudioFormatInfo]::new(48000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
    foreach ($cue in $source.cues) {
        $target = Join-Path $media ($cue.id + '.wav')
        $synth.SetOutputToWaveFile($target, $format)
        $synth.Speak($cue.text)
        $synth.SetOutputToNull()
    }
    @{source='Windows System.Speech local synthesized narration';voice=$synth.Voice.Name;culture=$synth.Voice.Culture.Name;rate=$Rate;format='PCM 48000Hz 16-bit mono';scriptSha256=(Get-FileHash -LiteralPath (Join-Path $projectRoot 'script.json') -Algorithm SHA256).Hash.ToLower()} | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $media 'narration-source.json')
} finally { $synth.Dispose() }
