# 完整音色库与工程调用

先按 [音效设计与试听](SOUND-DESIGN.md) 定声部、材质和音画关系，再从目录选音色。使用同一画面比较拟音方向。

## 试听

从基础 skill 根目录执行，输出到当前项目的试听目录。

```sh
python modules/audio/preview.py --bank all --out AUDITION_DIR
python scripts/video.py catalog audio
```

打开 `AUDITION_DIR/index.html`。每个 ID 用默认参数试听，街机分层可在母版下展开。`--bank series` 选八个当前系列常用声，`--bank library` 试听街机、合成与轻拟音，`--bank tactile` 选轻拟音与界面声，`--bank arcade` 选九个街机母版。 [街机母版](ARCADE.md)

| 家族 | 音色 ID 中的名称 |
| --- | --- |
| 系列合成 | series-paper-land.v1、series-empty-result.v1、series-send.v1、series-reply.v1 |
| 轻拟音 | paper-slide、paper-seat、wood-seat、metal-latch |
| 轻界面反馈 | message-send、message-reply、ack-soft、block-soft |
| 动作与界面 | click、tick、pop、blip、swipe、glitch |
| 过渡与冲击 | whoosh、riser、downlifter、reverse-cymbal、impact、boom、shimmer |
| 鼓与打击 | kick、snare、clap、hat、crash、tom、shaker、rim、cowbell |
| 旋律与和声 | bass、sub、pad、pluck、keys、bell、lead、mallet、organ、vox |
| 环境 | ambience |

## 写进分镜和 VideoSpec

`production-plan.json` 的 `audio[]` 和 `audio.json` 的 `cues[]` 均接受以下形式。引用实际 storyboard 或 timeline 中的事件，按片段选用各条 cue。

```json
[
  {"id":"touch","sound":"synth.rim.v1","at":{"event":"s01.select"},"level":0.24},
  {"id":"air","sound":"synth.whoosh.v1","at":{"event":"s02.enter"},"align":"peak","params":{"duration":0.38,"peak":0.63},"level":0.35},
  {"id":"lift","sound":"synth.riser.v1","at":{"event":"s02.reveal"},"align":"end","params":{"duration":0.42},"level":0.27},
  {"id":"chord","sound":"synth.keys.v1","at":{"event":"s02.reveal"},"params":{"notes":["Eb4","G4","Bb4"],"duration":0.6},"level":0.32},
  {"id":"result","sound":"arcade-reward","at":{"event":"s02.complete"},"level":0.45},
  {"id":"table","file":"media/sfx/table.wav","at":{"event":"s02.place"},"level":0.3}
]
```

- `at` 默认指起音，`offsetFrames` 可微调。掠过声的 `align:"peak"` 将包络峰对齐，例中的声音约提前 0.24 秒。上扬扫频与反向镲用 `align:"end"` 将末端对齐。需要提前进声时留足片头空间。
- [目录](catalog.json) 列出各音色的参数、默认值和范围。时间用秒，扫频的 `from/to` 用 Hz，`note/notes` 支持音名和 MIDI 数字，`notes` 可用和弦数组。开镲填 `open:true`，马林巴或木块改 `mallet.material`，不同环境改 `ambience.kind`。相同参数与种子可重复生成。
- 每条 cue 选择一个 `sound` 或 `file`。项目音效用 48kHz、16-bit 单声道或双声道 PCM WAV。`at` 对齐文件首样本，带前导静音时先裁切或用事件偏移微调。源文件随导演交接、校验与独立工程打包。
- 可调音色用 Node.js 生成短片段。需整段环境、鼓组、和声、处理效果或多 bus，使用 [Garden score](GARDEN.md#合成配乐与分轨)。工作台内调位置、裁入和音量，合成参数在创作源修改后重建。
