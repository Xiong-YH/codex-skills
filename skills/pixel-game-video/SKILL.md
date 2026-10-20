---
name: pixel-game-video
description: 制作和修改像素游戏感视频，按结构化镜头、素材、文字、运镜转场和音效构建预览、MP4 与核验证据。已有脚本或局部效果直接使用；从创意策划到 review 使用 pixel-video-director。
---

# Pixel Game Video

把制作决策写入四份 VideoSpec JSON；运行代码完成时间线编译与合成。先读 [制作合同](references/contract.md)，运行 `python scripts/video.py catalog` 选择已实现的能力。

默认 `renderBackend=canvas`。需要原生 React 场景时读 [Remotion 后端](references/remotion.md)，显式选择 `remotion`；当前只支持书桌场景与指定运镜。Remotion 的 `studio PROJECT` 用于审片；需要浏览器内改文案、镜头或音效时，使用 [本地工作台](references/workbench.md)。用户需要成片时再导出。

| 修改内容 | 按需读取 |
| --- | --- |
| 镜头剪辑、字幕音效同步、Studio 与成片一致、可编辑交付 | [制作与可编辑时间线](references/production-workflow.md) |
| 浏览器多轨编辑、属性面板、保存工程 JSON 和导出 MP4 | [本地工作台](references/workbench.md) |
| 剪映原生草稿、镜头分段、可编辑字幕和独立音效 | [剪映草稿导出](references/jianying-export.md) |
| 色板、字体、像素密度 | [style](modules/style/GUIDE.md) |
| 背景生成、风格样板、镜头素材替换 | [风格基调](modules/style/ART-DIRECTION.md) |
| 卡片、流程、时间轴、清单、层级、数据、代码与结论 | [十二类组件与组合](modules/components/GUIDE.md)，`catalog components` |
| 人物、物体、表情素材 | [library](modules/library/GUIDE.md)；当前五人人设与动作读 [已确认人物库](modules/library/CHARACTERS.md) |
| 字幕、注释、标题、标签 | [text](modules/text/GUIDE.md) |
| 转场选型与设计 | [转场库](modules/motion/TRANSITIONS.md)，选定后按链接读配方 |
| 游戏感、操作反馈与局部细节 | [游戏反馈细节库](modules/scenes/GAME_FEEL.md)，按实际状态选择触点、运动和声音 |
| 相机、物体运动、转场执行、特效 | [motion](modules/motion/GUIDE.md) |
| 音色、声像、事件音效与配乐 | [audio](modules/audio/GUIDE.md)；六种已确认街机音效见 [ARCADE](modules/audio/ARCADE.md)；Chill Wave 导入、音量、淡化与旁白压低见 [配乐](modules/audio/MUSIC.md) |
| 旁白音色与配音 | [旁白音色](modules/audio/VOICES.md)；计算机口播系列默认“解说小帅”，按 [剪映专业版文本朗读](modules/audio/JIANYING.md) 直接生成当前文案，再导入项目 PCM 旁白 |
| 游戏机制、嘴型、表演 | [scenes](modules/scenes/GUIDE.md) |

从 `init PROJECT` 建轻量工程；编辑后运行 `validate`、`build`、`preview`、`render`。命令均为 `python scripts/video.py <命令> PROJECT`。依赖与环境配置见 [运行](references/runtime.md)，增加能力见 [模块维护](references/module-development.md)。

- 时间只在镜头和事件中定义，文字、运动和声音引用事件；同一编译时间线驱动预览与出片，不另写字幕/音效秒数表。
- 工作台首次导入从同一编译结果生成镜头、字幕、转场和独立音效片段；内容参数通过 props/schema 开放。工作台编辑存档是独立创作分支，不自动回写四份 VideoSpec 或导演创作源。
- `authoringMode=director` 的四份输入是生成物；按 `source-map.json` 回改创作源，再 handoff。
- 素材、风格、配方通过稳定 ID 选择；未知能力先实现并核验，不能用文案假装已经执行。
- 保留用户已确认的角色和表达方向。模板题材、片长只是示例。
- 人物按镜头可选；`actor:null` 让场景或物体居中主导画面，不要求主角常驻。
- 支持事件音效、项目内 PCM 旁白与可选 BGM 混音；Canvas 通用人物层可用 [事件姿态序列](modules/library/PRESENTER-ACTIONS.md) 安排解释、疑惑、挥手与收束；Canvas 全片可用 [叙事节点进度条](modules/text/NARRATIVE-PROGRESS.md)。尚无音素口型、骨骼或通用 TTS。

交付前检查实际 MP4、转场前后解码帧与听觉同步。技术核验不代替视听 review；未检查项保留 `not_reviewed`。交付可视化编辑时，必须实测导入一致性、改文案/镜头/音效、保存重开与导出，主动打开本地工作台并提供地址。用 `export-project` 交付带运行源码的独立快照；工作台工程 JSON 另存，不把浏览器缓存当成交付。
