---
name: pixel-game-video
description: 制作和修改像素游戏感视频，按结构化镜头、素材、文字、运镜转场和音效构建预览、MP4 与核验证据。已有脚本或局部效果直接使用；从创意策划到 review 使用 pixel-video-director。
---

# Pixel Game Video

把制作决策写入四份 VideoSpec JSON；运行代码完成时间线编译与合成。开始制作、续作或复盘时先读 [制作总则与经验入口](references/production-principles.md)，再读 [制作合同](references/contract.md)，运行 `python scripts/video.py catalog` 选择已实现的能力。

默认 `renderBackend=canvas`。需要原生 React 场景时读 [Remotion 后端](references/remotion.md)，显式选择 `remotion`；当前只支持书桌场景与指定运镜。Remotion 先用 `studio PROJECT` 交互预览，用户需要导出时再运行 `preview` 或 `render`。

| 修改内容 | 按需读取 |
| --- | --- |
| 色板、字体、像素密度 | [style](modules/style/GUIDE.md) |
| 背景设计、生成、风格样板、镜头素材替换 | [开放式场景设计与风格基调](modules/style/ART-DIRECTION.md)；先按内容构思画面，再选素材 |
| 卡片、流程、时间轴、清单、层级、数据、代码与结论 | [十二类组件看图选型与组合](modules/components/GUIDE.md)，含实渲染总览、大图与状态对照；`catalog components` |
| 人物、物体、表情素材 | [library](modules/library/GUIDE.md)；当前五人人设与动作读 [已确认人物库](modules/library/CHARACTERS.md) |
| 字幕、注释、标题、标签 | [text](modules/text/GUIDE.md) |
| 转场选型与设计 | [转场库](modules/motion/TRANSITIONS.md)，选定后按链接读配方 |
| 游戏感、操作反馈与局部细节 | [游戏反馈细节库](modules/scenes/GAME_FEEL.md)，按实际状态选择触点、运动和声音 |
| 相机、物体运动、转场执行、特效 | [motion](modules/motion/GUIDE.md) |
| 音色、声像、事件音效与配乐 | [audio](modules/audio/GUIDE.md)；六种已确认街机音效见 [ARCADE](modules/audio/ARCADE.md)；Chill Wave 导入、音量、淡化与旁白压低见 [配乐](modules/audio/MUSIC.md) |
| 游戏机制、嘴型、表演 | [scenes](modules/scenes/GUIDE.md) |

从 `init PROJECT` 建轻量工程；编辑后运行 `validate`、`build`、`preview`、`render`。命令均为 `python scripts/video.py <命令> PROJECT`。依赖与环境配置见 [运行](references/runtime.md)，增加能力见 [模块维护](references/module-development.md)。

- 时间只在镜头和事件中定义，其他模块引用事件；不另写字幕/音效秒数表。
- `authoringMode=director` 的四份输入是生成物；按 `source-map.json` 回改创作源，再 handoff。
- 素材、风格、配方通过稳定 ID 选择；未知能力先实现并核验，不能用文案假装已经执行。
- 保留用户已确认的角色和表达方向。模板题材、片长只是示例。
- 人物按镜头可选；`actor:null` 让场景或物体居中主导画面，不要求主角常驻。
- 支持事件音效、项目内 PCM 旁白与可选 BGM 混音；Canvas 的[事件姿态序列](modules/library/PRESENTER-ACTIONS.md) 供剧情表演使用，不能用全身图轮换模拟固定姿势口播；局部开闭嘴需先补齐同姿势口型素材与适配。Canvas 全片可用 [实心矩形叙事进度条](modules/text/NARRATIVE-PROGRESS.md)。Remotion 尚不支持这两项，会在编译时拒绝。尚无音素对齐、骨骼或通用 TTS。

交付前检查实际 MP4、转场前后解码帧与听觉同步。技术核验不代替视听 review；未检查项保留 `not_reviewed`。用 `export-project` 交付带运行源码的独立快照。
