---
name: pixel-game-video
description: 制作和修改像素游戏感视频，按结构化工程进入工作台，以独立镜头、文字、转场、音效和配乐轨道剪辑、导出 MP4 与核验证据。已有脚本或局部效果直接使用；从创意策划到 review 使用 pixel-video-director。
---

# Pixel Game Video

把制作决策写入四份 VideoSpec JSON；运行代码完成时间线编译与合成。开始制作、续作或复盘时先读 [制作总则与经验入口](references/production-principles.md)，再读 [制作合同](references/contract.md)，运行 `python scripts/video.py catalog` 选择已实现的能力。

制作视频必须进入 [本地工作台](references/workbench.md) 完成剪辑，并从工作台导出最终成片。镜头、字幕与其他文字、转场、音效、配乐必须分别成为可编辑轨道；有旁白时另设旁白轨。不允许把整条 MP4 当作唯一可编辑片段，也不以直接运行 `render` 代替工作台剪辑和最终导出。只有视觉设计或局部能力调试不要求出片时，可停在对应阶段。

`renderBackend=canvas` 仍是画面执行的默认值，现有场景、组件、素材和转场通过 Canvas runtime 接入 Remotion 工作台；镜头内部人物、组件和背景参数通过 props 编辑。显式选择 `remotion` 时使用原生 React 场景，其能力边界仍见 [Remotion 后端](references/remotion.md)。两条路径共用工作台剪辑和导出流程，不能把 Canvas 接入描述为所有能力已重写成 React。

| 修改内容 | 按需读取 |
| --- | --- |
| 镜头剪辑、字幕音效同步、Studio 与成片一致、可编辑交付 | [制作与可编辑时间线](references/production-workflow.md) |
| 浏览器多轨编辑、属性面板、保存工程 JSON 和导出 MP4 | [本地工作台](references/workbench.md) |
| 剪映原生草稿、镜头分段、可编辑字幕和独立音效 | [剪映草稿导出](references/jianying-export.md) |
| 色板、字体、像素密度 | [style](modules/style/GUIDE.md) |
| 背景设计、生成、风格样板、镜头素材替换 | [开放式场景设计与风格基调](modules/style/ART-DIRECTION.md)；先按内容构思画面，再选素材 |
| 卡片、流程、时间轴、清单、层级、数据、代码与结论 | [十二类组件看图选型与组合](modules/components/GUIDE.md)，含实渲染总览、大图与状态对照；`catalog components` |
| 人物、物体、表情素材 | [library](modules/library/GUIDE.md)；当前五人人设与动作读 [已确认人物库](modules/library/CHARACTERS.md) |
| 字幕、注释、标题、标签 | [text](modules/text/GUIDE.md) |
| 转场选型与设计 | [转场库](modules/motion/TRANSITIONS.md)，选定后按链接读配方 |
| 游戏感、操作反馈与局部细节 | [游戏反馈细节库](modules/scenes/GAME_FEEL.md)，按实际状态选择触点、运动和声音 |
| 相机、物体运动、转场执行、特效 | [motion](modules/motion/GUIDE.md) |
| 音色、声像、事件音效与配乐 | [audio](modules/audio/GUIDE.md)；六种已确认街机音效见 [ARCADE](modules/audio/ARCADE.md)；Chill Wave 导入、音量、淡化与旁白压低见 [配乐](modules/audio/MUSIC.md) |
| 已有旁白导入与混音 | [声音指南](modules/audio/GUIDE.md)；导入项目 PCM 旁白并在工作台对齐，不自动生成配音或打开剪映 |
| 游戏机制、人物表演与情境插画 | [scenes](modules/scenes/GUIDE.md)；[完整插画进入视频](modules/scenes/whole-illustration.md)，含实渲染图与独立样例 |

从 `init PROJECT` 建轻量工程；编写后运行 `validate`、`build`，再运行 `workbench PROJECT`，完成多轨剪辑、保存与工作台导出。`preview`、`render` 用于源合成的调试和一致性对照。命令均为 `python scripts/video.py <命令> PROJECT`。依赖与环境配置见 [运行](references/runtime.md)，增加能力见 [模块维护](references/module-development.md)。

- 时间只在镜头和事件中定义，文字、运动和声音引用事件；同一编译时间线驱动预览与出片，不另写字幕/音效秒数表。
- 工作台首次导入从同一编译结果生成镜头、文字、转场、音效与配乐独立片段；内容参数通过 props/schema 开放。未使用的类别不要求创建空轨；用到的类别不能合并或烘焙成整片。工作台编辑存档是独立创作分支，不自动回写四份 VideoSpec 或导演创作源。
- `authoringMode=director` 的四份输入是生成物；按 `source-map.json` 回改创作源，再 handoff。
- 素材、风格、配方通过稳定 ID 选择；未知能力先实现并核验，不能用文案假装已经执行。
- 保留用户已确认的角色和表达方向。模板题材、片长只是示例。
- 人物按镜头可选，不要求每个画面有小人。`actor:null` 不叠加库人物，完整插画/片段本身仍可含人物；无人镜头可由场景、物体或组件主导。
- 插图集合参考风格与演绎方法，按脚本选择，不照搬样例结构、构图或固定动作。情境角色按剧情选择；口播与情境表演分别准备和验收，适用项目的固定姿势口播要求不能被情境动作覆盖。人物形体与场景接触先成立，不沿用已被否定的拆头拼身试样。
- 支持事件音效、项目内 PCM 旁白与可选 BGM 混音；Canvas 的[事件姿态序列](modules/library/PRESENTER-ACTIONS.md) 供剧情表演使用，不能用全身图轮换模拟固定姿势口播；局部开闭嘴需先补齐同姿势口型素材与适配。Canvas 全片可用 [实心矩形叙事进度条](modules/text/NARRATIVE-PROGRESS.md)，两项均沿 Canvas runtime 进入工作台；原生 React 执行器仍不支持它们。尚无音素对齐、骨骼或通用 TTS。

交付前实测用到的各类轨道可分别编辑、保存重开、逐轨导出及工作台成片导出，并检查实际 MP4、转场前后解码帧与听觉同步。技术核验不代替视听 review；未检查项保留 `not_reviewed`。主动打开本地工作台并提供地址，交付 MP4 及该次「导出版本 JSON」；需要独立工程时用 `export-project` 交付带运行源码的快照。不把浏览器缓存当成交付。任何能力尚不能拆轨、编辑或导出时先补齐并验证，不能静默回退到直接出片。
