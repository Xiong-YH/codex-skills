# 强转场与画面构图 · 2026-10-17

输入基线为提交 `2ee8f09` 的 12 秒明亮版。其 3 秒处将人物和整个场景切成三角碎片，中段出现错位人物；6、9 秒处直接硬切。用户补充参考视频后，方向改为大幅景别变化、画面主导，人物可退场。

## 参考里实际发生的动作

用户提供的 `6c6a0baeda5b96d3a14118ede1517681.mp4` 为 41.77 秒、592×1280、30fps 的录屏。分析取中央横向视频内容条，密集解码帧保存在忽略的 `work/transition-reference/`。

| 参考时间 | 逐帧观察 | 本次采用的镜头语言 |
| --- | --- | --- |
| 11.3–16 秒 | 当前场景连续拉远，变成海量画面墙中的一格 | 全场景缩成卡墙，再锁定目标格 |
| 18.13–18.37 秒 | 推近小卡，卡内换为宫殿，再扩满屏 | 高速焦点推近处接新景，然后回稳 |
| 21.400 秒 | 同一本书直接换成约两倍特写 | 主体/景别承接的重要性；此次没有复制书本题材 |

## 实现边界

- `motion.focus-punch.v1`：全景向指定焦点急推，倍率 3–8；高速处接新景，快速拉回稳定构图。
- `motion.mosaic-pullback.v1`：拉远为 3×3 至 9×9 场景卡墙，金色选框锁定中央目标后推入。周围卡片使用本片场景快照，字幕保持屏幕坐标。
- `panel-slide` 与 `pixel-iris` 保留为较轻的内容层转场。完整世界、人物和内容可独立合成；转场冲突由编译器校验。
- `actor:null` 从 director 源经过 handoff、schema 和编译一直保留。此时场景机制自动居中放大；人物 PNG 和已修嘴型保持原样。
- 配方参数在 catalog，算法在 motion，画面分层在 scenes/player；没有把这些执行规则塞入长 prompt。

## 同一脚本的新版编排

| 位置 | 视觉变化 | 时间与人物 |
| --- | --- | --- |
| 3 秒 | 推近选中方案，再接任务机制 | 36 帧，5.8 倍；后镜无人物 |
| 6 秒 | 任务场景拉远为 9×9 卡墙，再推入计数场景 | 48 帧；无人物 |
| 9 秒 | 推近计数焦点，再接组装场景 | 40 帧，4.5 倍；无人物 |

保留脚本文字和总长 720 帧。新字幕分别延后到镜内 40、52、44 帧，计数开始事件移到 54 帧；确认音继续引用事件。奖励锚点同步移到居中核心，转场声音在 audio 单独维护。

## 核验

- 基础层 25 项、director 13 项测试通过，覆盖 null 人物、源映射、不同类型转场冲突、参数与舞台边界。
- 转场独立 fixture 检查首末像素精确一致、乱序采样一致；焦点极值、3/7/9 列场景墙共 288 帧无透明空边。
- 实际 MP4：1920×1080、60fps、12 秒、720 解码帧。逐帧时间戳、音轨、输入/源码/成片哈希重新 inspect 通过。
- 审查范围为实际解码关键帧与三次换场的连续采样，不把它记录成完整实时播放或主观听音通过。

[实际成片转场对照动图](verification/transitions-before-after.gif) · [6 秒卡墙帧条](verification/transition-wall-contact.jpg) · [机器核验摘要](transitions-verification.json)

本地新版：`work/transition-cinematic/video/outputs/film-v2.mp4`。独立审查发现无人物机制放大后，结果字与进度条靠近地台，已将整组机制上移约 65px，并同步调整焦点与奖励锚点；原明亮版和中间版本保留。

## 复现

配置基础 runtime 依赖后，在仓库根目录执行：

```text
python skills/pixel-video-director/scripts/director.py init work/cinematic-check --example
python skills/pixel-video-director/scripts/director.py handoff work/cinematic-check
python skills/pixel-game-video/scripts/video.py render work/cinematic-check/video
python skills/pixel-game-video/scripts/video.py inspect work/cinematic-check/video
python -m unittest discover -s skills/pixel-game-video/tests -v
python -m unittest discover -s skills/pixel-video-director/tests -v
```
