# Codex Skills

像素游戏感视频的编剧、导演与制作技能。按当前任务进入，已有项目从实际进度继续。

## 选择技能

| 当前需要 | Skill | 交付 |
| --- | --- | --- |
| 讨论选题、写完整文案、单独修改开头、正文或收尾 | [pixel-video-writer](skills/pixel-video-writer/SKILL.md) | 选题与叙事确认记录、完整稿或局部改稿、内容自查 |
| 把文案演成画面、设计分镜、统筹与审片 | [pixel-video-director](skills/pixel-video-director/SKILL.md) | 视听设计、草图与动态白模、制作交接、创作审片 |
| 按脚本或工程制作、修改并导出视频 | [pixel-game-video](skills/pixel-game-video/SKILL.md) | 可编辑工程、工作台成片、同次项目 JSON 与核验证据 |

只写文案可在编剧阶段交付，纯分镜按所需设计阶段交付。跨技能继续同一份项目，定位和修订分工见 [协作合同](skills/pixel-video-writer/references/handoff.md)。

## 查能力与资料

| 目的 | 入口 |
| --- | --- |
| 判断能否调用、如何接入、适用后端 | [统一能力目录](skills/pixel-game-video/references/capability-catalog.md)，区分直接调用、制作流程与实验参考 |
| 选画风、人物、组件、字幕、运动、声音或场景 | [制作技能的模块入口](skills/pixel-game-video/SKILL.md#按任务选模块) |
| 设计全片、分镜和动态白模 | [导演四阶段](skills/pixel-video-director/references/director-workflow.md) |
| 运行、构建和依赖 | [运行说明](skills/pixel-game-video/references/runtime.md) |
| 剪辑、保存和最终导出 | [工作台](skills/pixel-game-video/references/workbench.md) |
| 当前通用要求与常见问题 | [制作总则](skills/pixel-game-video/references/production-principles.md) |
| 延续计算机口播系列 | [系列要求](skills/pixel-video-director/references/computing-voiceover.md)，其他项目按自己的约定 |
| 追溯用户反馈、失败与认可范围 | [迭代记录](skills/pixel-game-video/references/iteration-history.md) |
| 维护模块与新增能力 | [职责归属](skills/pixel-game-video/references/module-ownership.md)、[模块维护](skills/pixel-game-video/references/module-development.md) |
| 查本仓库更新 | [变更记录](CHANGELOG.md) |

具体能力的合同、素材与案例从所属模块进入。当前状态以能力目录、实际执行器和本次核验为准。

## 安装与仓库维护

将所需的 `skills/<技能名称>/` 完整复制到 Codex 的 skills 目录。编剧可独立使用。导演的制作工具需要基础技能，跨安装目录的定位方式见 [协作合同](skills/pixel-video-writer/references/handoff.md)。

仓库维护遵守 [AGENTS.md](AGENTS.md)。技能源码、必要素材、示例与测试保存在 `skills/`。本地 `work/`、`outputs/`、`docs/` 和 `legacy/` 按忽略规则保存工程、产物和历史材料。许可与第三方署名随各自模块保留，详见 [模块归属清单](skills/pixel-game-video/references/module-ownership.md)。
