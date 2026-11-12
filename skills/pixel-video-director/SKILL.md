---
name: pixel-video-director
description: 接手完整文案，拆大模块和片段，以大白话及可弃用线框草图讨论，再共同迭代结构化设计与动态白模，统筹正式制作和审片。分镜、片段衔接或观看体验设计时使用。选题文案归 pixel-video-writer，正式执行归 pixel-game-video。
---

# Pixel Video Director

负责全片视听设计、制作统筹与创作审片。按 [协作定位与接稿](references/collaboration.md) 接手当前文案和确认记录。观点与逐字文案回到编剧修订。已有有效确认和项目进度直接继承。

创作、续作或复盘前，按 [依赖定位](references/handoff.md) 找到 FOUNDATION，读取其 `references/production-principles.md`。构思视听方案前先读 [《惊艳手法库》](references/garden-skills/craft.md)。新增或修改镜头必读 [动态规范与兑现合同](references/motion-direction.md)，在第一轮镜头说明中写清观看顺序、可见变化和动静安排。只做设计时按所需阶段交付。

**计算机口播接稿先排时长。** 拆模块或写首轮分镜前，必读 [系列口播计时](references/computing-voiceover.md#口播计时) 和已定位 FOUNDATION 的 `modules/audio/VOICES.md` 中「1 倍速估时与校准」。先算各段与全片的时长预算，再在镜头说明里标明自然停顿和额外留白。有本片配音时按逐句实长校准。

确定正式画面时，先对照导演主参考 [《提问的艺术》R30](references/art-of-asking-reference.md) 的画风、插画与组件的分工、镜头节拍。沿用本片已确认的要求，旧案例按专项需要查阅。

## 按阶段继续

| 当前任务 | 必读与交付 |
| --- | --- |
| 新创意、选题或内容改写 | 按 [协作合同](references/collaboration.md) 转 pixel-video-writer |
| 文案画面化、分镜或接镜修改 | [导演四阶段](references/director-workflow.md)，按当前阶段完成模块划分、可弃用草图或结构化设计与动态白模 |
| 确定视觉结构与逐镜表达 | [视觉表达](references/visual-system.md)、[文画对应](references/visual-storytelling.md#把讲述推进落实到画面)、[分镜标注与预算](references/visual-storyboard.md) |
| 建工程与制作交接 | 先按 [白模交接与采用记录](references/handoff.md#白模交接与采用记录) 区分要继承的叙事和节奏与需重做的占位造型，再按 [创作合同](references/authoring.md) 使用 [scripts/director.py](scripts/director.py) |
| 审片与定向修复 | [Review](references/review.md)，绑定实际导演源或工作台剪辑分支与本次证据 |

创作器继续使用 [同一入口和项目 JSON](references/script-creator.md)。设计页面、播放与样板导出按 [设计数据](references/director-project.md) 和 [审阅工作台](references/script-review-workspace.md)。草图、白模、正式成片按各阶段分别核验。

## 按镜头需要读取

| 需要 | 入口 |
| --- | --- |
| 人物操作、姿态或连贯表演 | [人物表演设计](references/character-performance.md)，新动作制作与入库沿 FOUNDATION 制作总则的授权范围 |
| 延续计算机口播系列 | [系列要求](references/computing-voiceover.md)、[插画分类与选角](references/character-illustration.md) |
| 插画局部动态 | [插画动态设计](references/illustration-motion.md) |
| 背景或独立片段接入 | [素材替换](references/media-replacement.md) |
| 组件需求与表现 | [组件需求](references/visual-storyboard.md#脚本中的组件需求)，再读 FOUNDATION 的 `modules/components/GUIDE.md` |

FOUNDATION 指已定位的 pixel-game-video 根目录。按观看任务读取其 style、library、components、text、motion、audio 或 scenes 的 `modules/<模块>/GUIDE.md`，用 `catalog MODULE --capabilities` 核对实际状态、后端与编辑边界。参数和执行器由所属模块维护。

## 制作与交付

制作前按交接合同运行对应后端 doctor。按 [交接](references/handoff.md) 沿唯一创作源生成工程，制作方按 FOUNDATION 的 `references/production-workflow.md` 与 `references/workbench.md` 完成工作台剪辑、保存重开和最终导出，交付 MP4、同次项目 JSON 与核验证据。

`check/handoff` 的结构或输入校验结果与实际动作、视听审查分别记录，具体判据和未关闭项沿 [Review](references/review.md) 维护。
