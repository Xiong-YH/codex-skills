---
name: pixel-game-video
description: 制作和修改像素游戏感视频，按结构化镜头、素材、文字、运镜转场和音效构建预览、MP4 与核验证据。已有脚本或局部效果直接使用；从创意策划到 review 使用 pixel-video-director。
---

# Pixel Game Video

把制作决策写入四份 VideoSpec JSON；运行代码完成时间线编译与合成。先读 [制作合同](references/contract.md)，运行 `python scripts/video.py catalog` 选择已实现的能力。

| 修改内容 | 按需读取 |
| --- | --- |
| 色板、字体、像素密度 | [style](modules/style/GUIDE.md) |
| 背景生成、风格样板、镜头素材替换 | [风格基调](modules/style/ART-DIRECTION.md) |
| 卡片、流程、时间轴、清单、层级、数据、代码与结论 | [十二类组件看图选型与组合](modules/components/GUIDE.md)，含实渲染总览、大图与状态对照；`catalog components` |
| 人物、物体、表情素材 | [library](modules/library/GUIDE.md)；当前五人人设与动作读 [已确认人物库](modules/library/CHARACTERS.md) |
| 字幕、注释、标题、标签 | [text](modules/text/GUIDE.md) |
| 转场选型与设计 | [转场库](modules/motion/TRANSITIONS.md)，选定后按链接读配方 |
| 游戏感、操作反馈与局部细节 | [游戏反馈细节库](modules/scenes/GAME_FEEL.md)，按实际状态选择触点、运动和声音 |
| 相机、物体运动、转场执行、特效 | [motion](modules/motion/GUIDE.md) |
| 音色、声像、事件音效 | [audio](modules/audio/GUIDE.md)；六种已确认街机音效、选型及认可状态见 [ARCADE](modules/audio/ARCADE.md) |
| 游戏机制、人物表演与情境插画 | [scenes](modules/scenes/GUIDE.md)；[完整插画进入视频](modules/scenes/whole-illustration.md)，含实渲染图与独立样例 |

从 `init PROJECT` 建轻量工程；编辑后运行 `validate`、`build`、`preview`、`render`。命令均为 `python scripts/video.py <命令> PROJECT`。依赖与环境配置见 [运行](references/runtime.md)，增加能力见 [模块维护](references/module-development.md)。

- 时间只在镜头和事件中定义，其他模块引用事件；不另写字幕/音效秒数表。
- `authoringMode=director` 的四份输入是生成物；按 `source-map.json` 回改创作源，再 handoff。
- 素材、风格、配方通过稳定 ID 选择；未知能力先实现并核验，不能用文案假装已经执行。
- 保留用户已确认的角色和表达方向。模板题材、片长只是示例。
- 人物按镜头可选，不要求每个画面有小人。`actor:null` 不叠加库人物，完整插画/片段本身仍可含人物；无人镜头可由场景、物体或组件主导。
- 插图集合只参考风格与演绎方法，按脚本选择是否使用，不照搬样例结构、构图或固定动作。主角口播需有与话语呼应的嘴形、表情和停顿；情境插画按剧情选择主角或配角，不能把静态人物配旁白算作已实现口播表演。
- 支持纯音效或项目内 PCM 旁白混音。人物动态先保证完整人物或情境插画，再按事件制作相邻姿态或导入片段；禁止沿用已被否定的拆头拼身试样。既有基准图仍为静态，无通用骨骼、TTS 或音素对齐。

交付前检查实际 MP4、转场前后解码帧与听觉同步。技术核验不代替视听 review；未检查项保留 `not_reviewed`。用 `export-project` 交付带运行源码的独立快照。
