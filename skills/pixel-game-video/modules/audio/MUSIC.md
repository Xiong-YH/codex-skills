# 配乐工作流

项目 BGM 使用 `audioMode=sfx-only`。Canvas HTML、Remotion Studio 和 MP4 使用同一份源混音 WAV，工作台提供独立的配乐和音效轨。

先按本片节奏选用 [可复用 BGM 初版](bgm-system/README.md) 或已选曲目。系统底乐生成独立 WAV 与节拍表，可以先确定音乐，再排视觉落点。

## 导入与配置

从基础 skill 根目录执行：

```text
python scripts/video.py import-bgm PROJECT --source LOCAL_AUDIO
```

将选定的本地配乐导入 `media/bgm.wav`，目标为 48 kHz、16-bit、双声道 PCM。需要 FFmpeg，可用 `PIXEL_FFMPEG` 指定。覆盖已有文件时显式传入 `--overwrite`，导入失败保留原素材。

命令输出根据本工程首尾镜头生成的 `bgm` 配置，不改 JSON 创作源。director 工程将其加入 `production-plan.json`，然后 `check → handoff → build`；direct 工程加入 `audio.json`，然后 `validate → build`。director 的素材应导入创作根目录，不能放入生成的 `video/` 再手改 VideoSpec。

```json
{"bgm":{"id":"bgm","file":"media/bgm.wav","at":{"event":"s1.enter"},"end":{"event":"s6.exit"},"gain":0.45,"loop":false,"trimStartSeconds":0,"fadeInFrames":0,"fadeOutFrames":12}}
```

事件 ID 用本片实际镜号；示例的六镜不是固定要求。参数及默认值以基础 schema 为准。

| 字段 | 含义 |
| --- | --- |
| `at / end` | 主时间线事件引用，区间为 `[at,end)`，必须在片内；改变镜头时长自动带动配乐区间 |
| `gain` | 配乐归一化后的音量，0–1，默认 0.18，0 静音配乐轨 |
| `fadeInFrames / fadeOutFrames` | 区间首尾的线性淡入、淡出；默认 60/90 帧，两者之和不可超过区间时长；0 关闭对应淡化 |
| `trimStartSeconds / loop` | 音源起始截取位置，默认 0；从该位置到音源末尾按需循环，默认 true；不循环而素材不足则报错 |
| `speechDuck` | 旁白期间配乐保留比例，0–1，默认 0.25；0 完全让位、1 不压低；50ms 提前压低、120ms 恢复，不随音节反复抽动 |
| `title / artist / sourceUrl / licenseUrl / changes` | 曲目、来源、许可与实际修改记录，保留在交接、混音报告和独立导出中 |

配乐用同一比例缩放左右声道，保留立体声关系。RMS 目标 0.10、峰值上限 0.65，再应用 `gain` 和淡化。根据实际配乐和音效的层级听最终 MP4。

## 素材与核验

记录所选曲目的曲名、作者、来源、授权和实际剪辑处理。发布时按该曲目的许可要求署名。

项目 WAV 参与输入哈希；修改后重新 handoff/build。独立导出携带配乐 WAV 与配置，不依赖原机器路径。`build/sfx-events.json` 的 `musicBed/bgm` 记录实际采样区间、归一化、音量、循环次数、淡化、旁白窗口与署名。预览片段从整片混音中切片，不会重新开始配乐或重做淡入。

检查配乐首拍、首尾、循环接点、裁入后的重音和音效触点。尚未听音的成片保持 `not_reviewed`。
