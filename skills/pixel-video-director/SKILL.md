---
name: pixel-video-director
description: 为超粗像素人物与实体组件结合的无口播视频设计表演、分镜、短促动效、音效、音乐卡点和同物接镜，制作动态白模并统筹审片。上屏文案归 pixel-video-writer，工程执行归 pixel-game-video。
---

# Pixel Video Director

负责视听设计、制作统筹与创作审片。进入视听设计或视频制作时，按 [协作定位](references/collaboration.md) 接当前文案，按 [依赖定位](references/handoff.md) 找到 FOUNDATION。先读其 `references/production-principles.md` 与 `references/current-style.md`，沿用本片确认与进度。

当前表现参考是 FOUNDATION 随包的《提问的艺术》R41。看超粗像素人物怎样回应事件，实体组件怎样按触点依次推进，结果落稳后再用同一对象接镜。对照卡分时读、小棕举拳带出感谢特写等过程见 [逐镜参考](../pixel-game-video/references/asking-motion-reference.md)。新片沿本片文案、场所和音轨重新排镜。

## 设计与制作

1. **排信息变化。** 把编剧段落放进 `script.beats` 与 `storyboard.beatId`。每段确定初态、变化、结果与承接，优先想清对象如何改变以及留给下一镜什么。
2. **设计表演与组件。** 按 [人物表演](references/character-performance.md) 定行为、触点和反应，按 [视觉表达](references/visual-system.md) 选择对象与布局。在首轮说明中写清先看谁、怎样发生变化、哪里停稳供读；不能用摇晃、缩放和卡片出现代替内容推进。
3. **排运动与声音。** 读 [动态合同](references/motion-direction.md)、[配乐卡点](references/beat-driven-explainer.md) 与 FOUNDATION 的 [音效设计](../pixel-game-video/modules/audio/SOUND-DESIGN.md)。按实际配乐倒排重要变化，另为实体触点、状态反馈和转场选声或留白。音效绑定分镜事件。整体相机、主体动作、内容组和转场分开描述；从动态目录选择真实能力。
4. **白模到成片。** 按 [导演流程](references/director-workflow.md) 继续当前阶段。沿 [交接合同](references/handoff.md) 记录采用的叙事／节奏与要替换的占位；通过 [创作工具](references/authoring.md) 建立唯一源。制作依 FOUNDATION 的流程与工作台完成分轨交付，再按 [Review](references/review.md) 审实际分支与同次导出。

## 按任务读取

| 当前需要 | 入口 |
| --- | --- |
| 只有创意、改观点或逐字上屏文案 | 转 pixel-video-writer，继承当前有效确认 |
| 随片或单独做海报、封面、发布标题或介绍文案 | 按 [协作定位](references/collaboration.md#定位其他技能) 加载 [pixel-video-packaging](../pixel-video-packaging/SKILL.md)。有项目时传当前文案版本、受众与主旨、已确认的画风及可用素材 |
| 文案画面化、镜头划分与接镜 | [文画对应](references/visual-storytelling.md)、[分镜与预算](references/visual-storyboard.md) |
| 人物动作与组件互动 | [人物表演](references/character-performance.md)，再查 FOUNDATION 的人物素材和动作合同 |
| 需要整幅插画或外部片段 | [插画动态](references/illustration-motion.md)、[素材替换](references/media-replacement.md)，仅按本镜需要采用 |
| 创作器、设计页与播放 | [同一项目 JSON](references/script-creator.md)、[设计数据](references/director-project.md)、[审阅工作台](references/script-review-workspace.md) |
| 需要更多表现方法 | [手法参考](references/garden-skills/craft.md)，仅提炼适合当前内容的机制 |

纯设计按所需阶段交付；正式制作需完成实际播放与核验。未审、设计待接入和失败分别记录，结构检查不能代替动作、文字或听音审查。
