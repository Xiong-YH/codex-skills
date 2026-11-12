# Garden 声音工作流

分镜、混音和审片共用这条工作流。详细配方、词汇和命令见随包的 [声音原文](vendor/garden-skills/references/sound.md) 与 [审片原文](vendor/garden-skills/references/review.md)。本页把 Garden 的声音方法接到 VideoSpec 和工作台。

## 声音方向

在导演工程的 `brief.constraints` 或直接工程的制作 brief 中记录 **BGM 与音效来源**。按本片内容选择配器、律动、音色空间和段落起伏。

| 项 | 写到能选素材和对齐 |
| --- | --- |
| 声音的角色 | 推动、铺底、突出对象或以拟音带动场景 |
| 调色板 | 主音色、鼓或脉冲、低频、空间底噪与可复用的短动机 |
| 段落曲线 | 吸气后爆发、渐加声部、抽空、循环、自由起伏 |
| 音画节拍 | 主重拍、切点、视觉接触与结果出现帧，哪些必须听见 |
| 混音意图 | 配乐与音效的层级、干湿与声场、侧链或动态留白 |

按实际采用的配乐原轨核对授权，用 `audio.mjs beats` 取候选拍位、重拍、段落能量与 drop。听辨首拍、相位与重音，校正半速、倍速或反拍偏差，再把采用的触点换算成共用事件。最终以配乐的实际入点、裁入和播放速度为准。

## 音色、层次与对齐

按动作材质选声。弹出可用 `pop`，大对象选低音，小对象选高音。开关和吸附可用 `click/tick/rim`，滑动用 `swipe`。木头、纸盒、玩具可用相应的 `mallet`。关键落点可由低频、鼓和质感层组合，成功可以是一组 `shimmer`、一声铃或项目的街机奖励。退场可用 `downlifter`，场所感可用 `ambience`。界面密度、叠层与留白由用途和风格决定。音色和参数在 [完整库](SYNTHESIS.md) 选。

- 动作与音效引用同一事件。碰撞、接触、吸附与结果声对可见落点。若转场有准备过程，倒推视觉运动起点，确保指定揭示帧和重音相遇。
- 掠过声从「切点减去时长乘峰位」起，设置 `align:"peak"`。用上扬扫频或反向镲引向 drop 时以落点结束，设置 `align:"end"`。两者可以跨切点前的镜头。
- 让下一镜的声音先进入可用 J-cut。以 2–4 帧为试音起点，用 `offsetFrames` 挂到同一切点。让上一镜的尾音越过切点是 L-cut，按尾音和下一镜主声的关系留重叠。
- 选择吸气再爆发的段落，可在重拍前留半拍到一拍，把鼓与铺底抽走。渐加、抽空、循环用各自的密度变化。循环片检查结尾和片头的尾音接缝。

## 合成配乐与分轨

短音色可直接写进分镜 cue。完整配乐、环境和音效叠层可用 Garden 原版 `scripts/audio.mjs`。下例中的 `GARDEN` 表示本模块的 `vendor/garden-skills` 目录，score 和输出留在本片工程。Node 和 FFmpeg 可从 PATH 调用。

```sh
node GARDEN/scripts/audio.mjs build score.mjs --out audio/score.wav --stems
node GARDEN/scripts/audio.mjs beats media/track.wav --out audio/beats.json --engine js
```

可从 [原版 starter](vendor/garden-skills/assets/starter/score.mjs) 看节拍、声部与 cue 写法。在本技能的工程中，让 score 从 `build/resolved-timeline.json` 取 `durationSeconds`、`project.fps` 与 `events`，用事件帧除以帧率计算秒数。剪辑版若已挪动片段，按当前工作台 JSON 更新选用的时间。

Garden session 可分 drums、bass、music、sfx 等 bus，分别调增益、滤波、声像、混响发送、延迟、位深、磁带抖动与侧链。电子律动可让底鼓或撞击压低铺底。收紧低频时听铺底与底鼓是否重叠，手机外放核对鼓点和短音效的辨识度。session 母带用约 −14 LUFS 作为起点。

采样乐器可用原版 [Tone score](vendor/garden-skills/assets/starter/score.tone.js)，也可将 Tone 层以 `--raw` 输出，再由 [layer score](vendor/garden-skills/assets/starter/score.layer.mjs) 加入合成分层。选用时在 Garden 的 `scripts` 目录运行 `npm ci --ignore-scripts`，用 `CHROME_PATH` 指定已装浏览器。采样用 `SHOWREEL_SAMPLES` 指向项目内缓存目录，`audio.mjs samples` 列出采样包与授权。记录实际用到的素材来源。

音乐或环境 bus 可作为项目 PCM 导入配乐轨，拟音可按 cue 或单独渲染的 bus 片段导入音效轨。Garden WAV 为 24-bit，转成项目合同的 48 kHz、16-bit PCM 后导入。工作台保留配乐和拟音的独立片段。先调各轨平衡，再按实测响度调整源工程 `masterGain` 并重建，复测当前工作台导出。

## 预览与审片

1. 先在工作台看带声音的当前剪辑。把实际触点、掠过的包络峰、蓄力的末端和重要切点并排核对。按需单听各轨，确认材质、鼓点、声部权重和留白。拖动镜头或音效后复听前后镜。
2. 对当前混音和同次工作台导出分别跑技术检查。结合波形、频谱、响度、真峰值、削波与静音区间定位。剪辑会改变声音叠加的峰值，按实际导出留余量并复测。在采用 drop 曲线时，另给 `--drops` 或共用时间轴里的 `DROPS`，核对重拍前的凹陷和重拍的抬升。
3. 对照声音 brief 正常速度复看整段与接缝。记时间码、实际听到的关系、最影响观看的问题、修订及复核区间。对照设计检查留白。未听音保留 `not_reviewed`。

```sh
node GARDEN/scripts/audio.mjs check build/animation-sfx.wav --out qa/source-mix
node GARDEN/scripts/audio.mjs check EXPORT.mp4 --out qa/export-mix
node GARDEN/scripts/inspect.mjs qa EXPORT.mp4 --out qa/final --expect-size WIDTHxHEIGHT --expect-fps FPS --expect-duration SECONDS --audio required
```

响度与真峰值以约 −14 LUFS 和 ≤ −1 dBTP 为 Garden 的有声成片基准。原版 `check` 产生诊断与 WARN，`inspect qa` 根据传入规格作技术判定，静音片改用 `--audio none`。视觉、阅读和剪辑证据仍绑定同次工作台 JSON 与成片。

只有几个短拟音的片段可能在达到响度基准前先触及真峰值上限。保留有意的静音，先调拟音包络或用 score 的母带限制器控制峰值。若本片已明确采用较低响度，记录目标、实测值和原版检查结果，并继续核对真峰值和音画落点。
