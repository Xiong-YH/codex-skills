# 配乐工作流

基础层支持一条可选项目 BGM，Canvas HTML、Remotion Studio 和 MP4 使用同一份混音 WAV。省略 `bgm` 不改变旧工程；`silent` 模式拒绝显式配乐。旁白使用独立 narration，不能把 BGM 放入 narration。

有旁白时使用 `audioMode=narration+sfx`；无旁白的配乐工程沿用 `sfx-only`，不需要新增声音模式。

## 导入与配置

从基础 skill 根目录执行：

```text
python scripts/video.py import-bgm PROJECT
python scripts/video.py import-bgm PROJECT --source LOCAL_AUDIO
```

第一条将内置 Kevin MacLeod《Chill Wave》转换到 `PROJECT/media/chill-wave.wav`；第二条导入本地其他音源到 `media/bgm.wav`。需要 FFmpeg，可用 `PIXEL_FFMPEG` 指定。只接受本地文件，不从网页或流媒体提取；已有文件需显式 `--overwrite`。目标为 48kHz、16-bit、双声道 PCM，导入失败保留旧素材。

命令输出根据本工程首尾镜头生成的 `bgm` 配置，不改 JSON 创作源。director 工程将其加入 `production-plan.json`，然后 `check → handoff → build`；direct 工程加入 `audio.json`，然后 `validate → build`。director 的素材应导入创作根目录，不能放入生成的 `video/` 再手改 VideoSpec。

```json
{"bgm":{"id":"bgm","file":"media/chill-wave.wav","at":{"event":"s1.enter"},"end":{"event":"s6.exit"},"gain":0.18,"loop":true,"trimStartSeconds":0,"fadeInFrames":60,"fadeOutFrames":90,"speechDuck":0.25,"title":"Chill Wave","artist":"Kevin MacLeod","sourceUrl":"https://kevinmacleod.bandcamp.com/track/chill-wave","licenseUrl":"https://creativecommons.org/licenses/by/4.0/","changes":"Trimmed, faded and mixed with narration."}}
```

事件 ID 用本片实际镜号；示例的六镜不是固定要求。参数及默认值以基础 schema 为准。

| 字段 | 含义 |
| --- | --- |
| `at / end` | 主时间线事件引用，区间为 `[at,end)`，必须在片内；改变镜头时长自动带动配乐区间 |
| `gain` | 配乐归一化后的音量，0–1，默认 0.18；0 静音该轨，不影响旁白与音效 |
| `fadeInFrames / fadeOutFrames` | 区间首尾的线性淡入、淡出；默认 60/90 帧，两者之和不可超过区间时长；0 关闭对应淡化 |
| `trimStartSeconds / loop` | 音源起始截取位置，默认 0；从该位置到音源末尾按需循环，默认 true；不循环而素材不足则报错 |
| `speechDuck` | 旁白期间配乐保留比例，0–1，默认 0.25；0 完全让位、1 不压低；50ms 提前压低、120ms 恢复，不随音节反复抽动 |
| `title / artist / sourceUrl / licenseUrl / changes` | 曲目、来源、许可与实际修改记录，保留在交接、混音报告和独立导出中 |

配乐先用同一个比例缩放左右声道，保持立体声关系；RMS 目标 0.10、峰值上限 0.65，再乘 `gain`、淡化和配乐专属 duck。旁白保留现有独立增益，音效仍由顶层 `speechDuck` 控制；三者相加后只处理一次总线。默认值优先保留旁白，实际录音、音色与响度仍需听最终 MP4。

## 素材与核验

内置原始 MP3 来自[作者官方下载](https://incompetech.com/music/royalty-free/mp3-royaltyfree/Chill%20Wave.mp3)，来源、原文件哈希与署名保存在 [chill-wave.json](assets/music/chill-wave.json)。曲目页的许可为 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)；发布时附曲名、Kevin MacLeod、曲目来源、许可链接，并说明本片实际做过的截取、循环、淡化或混音。

项目 WAV 参与输入哈希；修改后重新 handoff/build。独立导出携带配乐 WAV 与配置，不依赖原机器路径。`build/sfx-events.json` 的 `musicBed/bgm` 记录实际采样区间、归一化、音量、循环次数、淡化、旁白窗口与署名。预览片段从整片混音中切片，不会重新开始配乐或重做淡入。

检查首尾、循环接点、旁白进入/退出和音效触点。技术检查与用户听感认可分别记录；尚未听音的成片保持 `not_reviewed`。
