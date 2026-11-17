---
name: pixel-video-director
description: 为超粗像素人物与实体组件结合的无口播视频设计表演、分镜、短促动效、音乐卡点和同物接镜，制作动态白模并统筹审片。文案归 pixel-video-writer，工程执行归 pixel-game-video。
---

# Pixel Video Director

负责视听设计、制作统筹与创作审片。按 [协作定位](references/collaboration.md) 接当前文案，按 [依赖定位](references/handoff.md) 找到 FOUNDATION。先读其 `references/production-principles.md` 与 `references/current-style.md`，沿用本片确认与进度。

当前表现基线为 FOUNDATION 随包的《提问的艺术》R38：超粗像素人物回应事件，实体组件演出过程，短促动作后稳定阅读，同一对象带视线接镜。参考片台词、场所、镜序和绝对时间不复制到新片。需要具体效果时查 [逐镜参考](../pixel-game-video/references/asking-motion-reference.md)，无需打开工作工程。

## 设计与制作

1. **排信息变化。** 把编剧段落放进 `script.beats` 与 `storyboard.beatId`。每段确定初态、变化、结果与承接，优先想清对象如何改变以及留给下一镜什么。
2. **设计表演与组件。** 按 [人物表演](references/character-performance.md) 定行为、触点和反应，按 [视觉表达](references/visual-system.md) 选择对象与布局。在首轮说明中写清先看谁、怎样发生变化、哪里停稳供读；不能用摇晃、缩放和卡片出现代替内容推进。
3. **排运动与音乐。** 读 [动态合同](references/motion-direction.md) 与 [配乐卡点](references/beat-driven-explainer.md)。从 FOUNDATION 的动态目录选择真实能力，按本次音源倒排关键事件；整体相机、主体动作、内容组和转场分开描述。原片有效果不表示现成可调用。
4. **白模到成片。** 按 [导演流程](references/director-workflow.md) 继续当前阶段。沿 [交接合同](references/handoff.md) 记录采用的叙事／节奏与要替换的占位；通过 [创作工具](references/authoring.md) 建立唯一源。制作依 FOUNDATION 的流程与工作台完成分轨交付，再按 [Review](references/review.md) 审实际分支与同次导出。

## 按任务读取

| 当前需要 | 入口 |
| --- | --- |
| 只有创意、改观点或逐字文案 | 转 pixel-video-writer，继承当前有效确认 |
| 文案画面化、镜头划分与接镜 | [文画对应](references/visual-storytelling.md)、[分镜与预算](references/visual-storyboard.md) |
| 人物动作与组件互动 | [人物表演](references/character-performance.md)，再查 FOUNDATION 的人物素材和动作合同 |
| 需要整幅插画或外部片段 | [插画动态](references/illustration-motion.md)、[素材替换](references/media-replacement.md)，仅按本镜需要采用 |
| 创作器、设计页与播放 | [同一项目 JSON](references/script-creator.md)、[设计数据](references/director-project.md)、[审阅工作台](references/script-review-workspace.md) |
| 需要更多表现方法 | [手法参考](references/garden-skills/craft.md)，仅提炼适合当前内容的机制 |

纯设计按所需阶段交付；正式制作需完成实际播放与核验。未审、设计待接入和失败分别记录，结构检查不能代替动作、文字或听音审查。
