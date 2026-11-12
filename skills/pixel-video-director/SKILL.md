---
name: pixel-video-director
description: 为无口播像素信息动效设计分镜、组件承接、音乐卡点和动态白模，统筹正式制作和审片。选题与屏幕文案归 pixel-video-writer，工程执行归 pixel-game-video。
---

# Pixel Video Director

负责全片视听设计、制作统筹与创作审片。按 [协作定位与接稿](references/collaboration.md) 接手当前文案和确认记录。观点与逐字文案回到编剧修订。已有有效确认和项目进度直接继承。

创作、续作或复盘前，按 [依赖定位](references/handoff.md) 找到 FOUNDATION，读取其 `references/production-principles.md`。构思视听方案前先读 [《惊艳手法库》](references/garden-skills/craft.md)。新增或修改镜头必读 [动态规范与兑现合同](references/motion-direction.md)，在第一轮镜头说明中写清观看顺序、可见变化和动静安排。只做设计时按所需阶段交付。

**接稿先排信息变化。** 把编剧的段落和主句带进 `script.beats` 与 `storyboard.beatId`。按 [无口播信息动效与音乐卡点](references/beat-driven-explainer.md) 设计各段可见结果和组件承接，再用实际配乐排动作落点、主句与阅读窗口。用 [无口播缓存示例](examples/beat-driven-cache/README.md) 核对动态白模与正式 Canvas 的同源链路。

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
| 插画局部动态 | [插画动态设计](references/illustration-motion.md) |
| 背景或独立片段接入 | [素材替换](references/media-replacement.md) |
| 组件需求与表现 | [组件需求](references/visual-storyboard.md#脚本中的组件需求)，再读 FOUNDATION 的 `modules/components/GUIDE.md` |

FOUNDATION 指已定位的 pixel-game-video 根目录。按观看任务读取其 style、library、components、text、motion、audio 或 scenes 的 `modules/<模块>/GUIDE.md`，用 `catalog MODULE --capabilities` 核对实际状态、后端与编辑边界。参数和执行器由所属模块维护。

## 制作与交付

制作前按交接合同运行对应后端 doctor。按 [交接](references/handoff.md) 沿唯一创作源生成工程，制作方按 FOUNDATION 的 `references/production-workflow.md` 与 `references/workbench.md` 完成工作台剪辑、保存重开和最终导出，交付 MP4、同次项目 JSON 与核验证据。

`check/handoff` 的结构或输入校验结果与实际动作、视听审查分别记录，具体判据和未关闭项沿 [Review](references/review.md) 维护。
