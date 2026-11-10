# 声音与混音

视听制作按 [Garden 声音工作流](GARDEN.md) 定方向、选材质、对齐、混音及审片。音色包括 Garden 的 33 种发生器和原有 9 个街机 WAV，也可引用项目音频。

## 职责边界

声音密度、层数和留白由本片的用途、材质和情绪决定。已有口播用真实句段时序。

## 按任务读取

| 当前任务 | 读取入口 |
| --- | --- |
| 后端、编辑方式、示例与验证边界 | [统一能力目录](../../references/capability-catalog.md)；运行 python scripts/video.py catalog audio --capabilities |
| 声音设计、卡点、混音与审片 | [Garden 工作流](GARDEN.md)、[上游声音原文](vendor/garden-skills/references/sound.md) |
| 音效选型与试听 | [全库与可调合成](SYNTHESIS.md)、[九个街机 WAV](ARCADE.md)、[音色目录](catalog.json) |
| 事件 cue、PCM 与混音行为 | [工程配置与执行边界](details.md#工程配置与执行边界) |
| 导入已有旁白 | [旁白与配乐](details.md#旁白与配乐) |
| 配乐导入、淡化、循环、压低与署名 | [配乐工作流](MUSIC.md) |
| 实现维护与视觉触点 | [实现文件入口](details.md#按需入口)、[游戏反馈](../scenes/GAME_FEEL.md) |

## 验收重点

在工作台听当前版本，导出后用 Garden 工具检查波形、频谱、响度和真峰值，按 [审片流程](GARDEN.md#预览与审片) 复核音画、旁白与段落接缝。听感与技术检查各自记录。

全片分轨、保存重开和最终导出统一按 [工作台](../../references/workbench.md) 验证，本页不表示已完成当前项目验收。新增能力查 [模块维护](../../references/module-development.md)，职责调整查 [归属与迁移清单](../../references/module-ownership.md)。

### 先减触发，再调强弱

密度问题从 [Garden 审片](GARDEN.md#预览与审片) 定位，按本片声音方向调整触发、层次和增益。
