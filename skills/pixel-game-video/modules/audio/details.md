# 声音与混音

声音选型、时间和审片用 [Garden 工作流](GARDEN.md)。本页说明工程如何编译、混音与导入。

<a id="先减触发再调强弱"></a>
听到密度或主次问题时，按 [预览与审片](GARDEN.md#预览与审片) 单听相关声部并复听跨镜。

## 工程配置与执行边界

- 基础工程在 `timeline.json` 定义镜头事件，`audio.json.cues` 引用；导演工程在 `storyboard.json` 定义事件、`production-plan.audio` 选声音，由 handoff 生成基础工程。保留无声动作的视觉事件，只删多余音效条目；工作台剪辑分支直接修改其音效片段。
- cue 用 `sound` 选择音色或用 `file` 引用项目 PCM。`at` 使用 `{event, offsetFrames}`，默认绑定起音，合成声可按 [音色合同](SYNTHESIS.md#写进分镜和-videospec) 绑定包络峰或末端。`level` 和 `x` 均为 0–1，默认 0.5，`x` 用于轻度声像平衡。街机、Garden 和项目 PCM 使用 `variant=0`。
- 固定母版和项目素材校验哈希，旧 G2 使用单声道归一化，合成音色做峰值标定。源混音与工作台逐条 PCM 使用相同的 cue 增益、声像、旁白压低和总线包络。Garden score 可先按 bus 合成与处理，再作为项目素材导入。
- 输出为48kHz、16-bit、双声道 PCM，按成片帧数定长；超出片尾的尾音会被截断，需预留收尾。`sfx-events.json`记录实际事件、采样点、时长、增益策略与混音峰值/RMS。
- 顶层 `masterGain` 控制总线，范围为大于 0 到 4，省略时用 0.8。导演工程在 `production-plan.json` 写同名字段。按响度和真峰值检查调校，重建时工作台分轨使用相同总线增益。

## 旁白与配乐

`project.audioMode="narration+sfx"`配合 `audio.json.narration` 的 `id/file/at/gain` 导入现成旁白。文件须在项目内，48kHz、16-bit、单或双声道 PCM WAV，不得重叠或越界；编译绑定素材哈希。旁白先归一化再乘自身 gain，音效的 `speechDuck` 不压低旁白，但最终总线仍处理全部声音。[历史音色](VOICES.md)只作参考，不代替当前台词，也不意味着已有 TTS 或口型对齐。

顶层 `audio.json.speechDuck` 是旁白期间音效保留比例，默认0.28；导演在 production-plan 设置同名字段。可选 `bgm` 有独立的 gain、淡化、循环和 `speechDuck`（默认0.25），见 [配乐工作流](MUSIC.md)。`silent` 模式不输出音轨。实际 MP4 仍需听音核对，素材认可与成片验收分别记录。

## 按需入口

| 任务 | 文件 |
| --- | --- |
| 声音设计、对齐、素材与试听 | [Garden](GARDEN.md)、[全库](SYNTHESIS.md)、[ARCADE](ARCADE.md)、`catalog.json` |
| PCM 读取、旧版音效与混音 | `arcade.py`、`palette.py`、`game_audio.py`、`mixer.py` |
| 可调合成执行 | `synthesis.py`、`render-sfx.mjs`、[上游来源](vendor/garden-skills/NOTICE.md) |
| 旁白与配乐 | `narration.py`、`music.py`、`import_bgm.py`、[MUSIC](MUSIC.md) |
| 游戏反馈的视觉触点 | [GAME_FEEL](../scenes/GAME_FEEL.md)；视觉反馈不强制有声 |
