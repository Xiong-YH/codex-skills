# 声音与混音

视听制作先按 [音效设计与试听](SOUND-DESIGN.md) 标出哪些动作和状态值得听见，再选材质、绑定事件并试混音。使用轻拟音与界面、Garden、街机母版或项目素材。

## 职责边界

配乐原轨提供重音与段落起伏。音效密度、材质与留白按可见触点决定。

## 按任务读取

| 当前任务 | 读取入口 |
| --- | --- |
| 后端、编辑方式、示例与验证边界 | [统一能力目录](../../references/capability-catalog.md)；运行 python scripts/video.py catalog audio --capabilities |
| 音效设计、工程落点与 A/B 验收 | [音效设计与试听](SOUND-DESIGN.md) |
| 配乐卡点、混音工具与成片技术检查 | [Garden 工作流](GARDEN.md)、[上游声音原文](vendor/garden-skills/references/sound.md) |
| 音效选型与试听 | [全库与可调合成](SYNTHESIS.md)、[九个街机 WAV](ARCADE.md)、[音色目录](catalog.json) |
| 事件 cue、PCM 与混音行为 | [工程配置与执行边界](details.md#工程配置与执行边界) |
| 配乐导入、裁入、淡化、循环与署名 | [配乐工作流](MUSIC.md) |
| 实现维护与视觉触点 | [实现文件入口](details.md#按需入口)、[游戏反馈](../scenes/GAME_FEEL.md) |

## 验收重点

在工作台听当前版本，导出后用 Garden 工具检查波形、频谱、响度和真峰值，按 [审片流程](GARDEN.md#预览与审片) 复核视觉触点、音效和段落接缝。
