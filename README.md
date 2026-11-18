# Codex Skills

无口播像素信息动效的编剧、导演、制作与发布包装技能。以《提问的艺术》R41 为当前表现参考，用超粗像素人物、实体组件、短促动效与同物接镜讲清信息，按实际配乐排触点。另有独立的复盘与模仿技能。

## 选择技能

| 当前需要 | Skill | 交付 |
| --- | --- | --- |
| 讨论选题、写全片上屏文案、修改开头、正文或收尾 | [pixel-video-writer](skills/pixel-video-writer/SKILL.md) | 叙事路线、屏幕主句、必要标注和事实依据 |
| 把文案演成画面、设计分镜、统筹与审片 | [pixel-video-director](skills/pixel-video-director/SKILL.md) | 视听设计、草图与动态白模、制作交接、创作审片 |
| 按脚本或工程制作、修改并导出视频 | [pixel-game-video](skills/pixel-game-video/SKILL.md) | 可编辑工程、工作台成片、同次项目 JSON 与核验证据 |
| 随片或单独制作封面、发布标题和介绍文案 | [pixel-video-packaging](skills/pixel-video-packaging/SKILL.md) | 可上传的封面图、发布标题和介绍文案 |
| 复盘并沉淀本轮经验，或拆解参考并试做 | [复盘与模仿 · review-and-adapt](skills/review-and-adapt/SKILL.md) | 下次可执行的做法和写回位置、参考拆解与对照试样 |

只写文案可在编剧阶段交付，纯分镜按所需设计阶段交付。跨技能继续同一份项目，定位和修订分工见 [协作合同](skills/pixel-video-writer/references/handoff.md)。

复盘本系列视频时，按 [制作总则的经验维护约定](skills/pixel-game-video/references/production-principles.md#经验维护) 选择单片、系列和模块各自的记录位置。

## 查能力与资料

| 目的 | 入口 |
| --- | --- |
| 判断能否调用、如何接入、适用后端 | [统一能力目录](skills/pixel-game-video/references/capability-catalog.md)，区分直接调用、制作流程与实验参考 |
| 选画风、人物、组件、字幕、运动、声音或场景 | [制作技能的模块入口](skills/pixel-game-video/SKILL.md#按任务选模块) |
| 选拟音、界面反馈或检查混音 | [音效设计与试听](skills/pixel-game-video/modules/audio/SOUND-DESIGN.md) |
| 设计全片、分镜和动态白模 | [导演四阶段](skills/pixel-video-director/references/director-workflow.md) |
| 运行、构建和依赖 | [运行说明](skills/pixel-game-video/references/runtime.md) |
| 剪辑、保存和最终导出 | [工作台](skills/pixel-game-video/references/workbench.md) |
| 当前通用要求与常见问题 | [制作总则](skills/pixel-game-video/references/production-principles.md) |
| 设计组件承接、配乐卡点和冲击 | [无口播信息动效与音乐卡点](skills/pixel-video-director/references/beat-driven-explainer.md) |
| 当前风格与可播放参考 | [风格方法](skills/pixel-game-video/references/current-style.md)、[R41 完整有声 Canvas 与十段选段](skills/pixel-game-video/examples/asking-motion/index.html) |
| R41 组件外观、动作与参数 | [组件规范](skills/pixel-game-video/modules/style/COMPONENT-ART.md)、[20 类组件图册](skills/pixel-game-video/modules/components/examples/style-atlas/README.md) |
| 选择可循环底乐和实际拍位 | [可复用 BGM](skills/pixel-game-video/modules/audio/bgm-system/README.md) |
| 追溯用户反馈、失败与认可范围 | [迭代记录](skills/pixel-game-video/references/iteration-history.md) |
| 维护模块与新增能力 | [职责归属](skills/pixel-game-video/references/module-ownership.md)、[模块维护](skills/pixel-game-video/references/module-development.md) |
| 查本仓库更新 | [变更记录](CHANGELOG.md) |

具体能力的合同、素材与案例从所属模块进入。当前状态以能力目录、实际执行器和本次核验为准。

## 安装与仓库维护

将所需的 `skills/<技能名称>/` 完整复制到 Codex 的 skills 目录。编剧、发布包装、复盘与模仿可独立使用。导演的制作工具需要基础技能，跨安装目录的定位方式见 [协作合同](skills/pixel-video-writer/references/handoff.md)。

仓库维护遵守 [AGENTS.md](AGENTS.md)。技能源码、必要素材、示例与测试保存在 `skills/`。[工作视频](work/README.md) 登记在制项目的主题、观看入口、工程和版本。[参考视频](references/README.md) 保存独立样例和引用材料。跨电脑协作的工程按项目纳入版本管理。许可与第三方署名随各自模块保留，详见 [模块归属清单](skills/pixel-game-video/references/module-ownership.md)。
