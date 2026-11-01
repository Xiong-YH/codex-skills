---
name: pixel-game-video
description: 制作和修改像素游戏感视频，按结构化工程进入工作台，以独立镜头、文字、转场、音效和配乐轨道剪辑、导出 MP4 与核验证据。已有脚本或局部效果直接使用；从创意策划到 review 使用 pixel-video-director。
---

# Pixel Game Video

按结构化工程制作和修改像素游戏感视频。开始制作、续作或复盘先读 [制作总则](references/production-principles.md)，工程编写前读 [制作合同](references/contract.md)；按当前任务选择下面的模块，不默认加载全部参考。

## 七大模块

| 模块 | 负责什么 |
| --- | --- |
| [style](modules/style/GUIDE.md) | 配色、字体角色、像素尺度、材质与光影规范 |
| [library](modules/library/GUIDE.md) | 人物、道具、背景等素材身份、变体、锚点与来源 |
| [components](modules/components/GUIDE.md) | 信息结构、可组合实体及局部状态与表现 |
| [text](modules/text/GUIDE.md) | 字幕、标题、标签、注释与叙事进度的排版 |
| [motion](modules/motion/GUIDE.md) | 通用运动、相机、转场、遮挡与几何反馈 |
| [audio](modules/audio/GUIDE.md) | 事件音效、已有旁白导入、配乐与混音 |
| [scenes](modules/scenes/GUIDE.md) | 空间、对象关系、状态机制、表演与跨模块编排 |

选型运行 `python scripts/video.py catalog MODULE --capabilities`，MODULE 为上表模块名；按 ID、后端与状态筛选见 [能力目录](references/capability-catalog.md)。核对调用字段、支持范围及工作台边界：独立试样、设计索引和未实现项不能冒充已注册能力，目录检查不代表运行或审片通过。

## 制作与修改

场景美术先读 [主画风与片段透传](modules/style/ART-DIRECTION-CONTRACT.md)，按 [八类画风及分支提示词](modules/style/PIXEL-STYLES.md) 选项目主画风，特殊片段可整段另选。片段内人物、物种、背景、场景道具统一继承有效规范；组件与字幕排版独立。画风 ID 不是运行时 style 预设，不能直接替换 production-plan.style。

1. 沿用现有工程和项目要求。direct 工程编辑 `project.json / timeline.json / text.json / audio.json`；director 工程沿 `source-map.json` 回改创作源，再 handoff。镜头与事件拥有时间，文字、运动和声音引用同一时间线。
2. 从 `init PROJECT` 建新工程；编写后依次 `validate`、`build`、`workbench`。命令入口为 [scripts/video.py](scripts/video.py)，依赖和独立工程导出按 [运行说明](references/runtime.md)。已有工程从当前阶段继续。
3. 新组件及局部改版先读 [组件共同画风](modules/style/COMPONENT-ART.md)，基础/自定义与代码/素材生成均遵循；按实际画面核验，不以旧图库代替新规范。脚本所需组件按 [脚本驱动设计](modules/components/DESIGN.md) 判断复用、组合或定制；新机制按 [实现协议](modules/components/CUSTOM-RUNTIME.md) 做最小试样并沿实际路径接入，不把所有内容套成现有卡片。默认 Canvas；原生 Remotion 的白名单见 [后端边界](references/remotion.md)。两者共用工作台，Canvas 桥接不扩大原生能力。未知能力先实现并核验；旁白按已有素材导入，本流程不自动生成配音或调用 TTS。
4. 制作出片必须读取 [工作台](references/workbench.md) 并在其中剪辑、最终导出。用到的镜头、文字、转场、音效、配乐分别成轨，有旁白时另轨；人物、组件与素材在镜头 props 内编辑。缺口先补齐，不能退回直接 render 交付；preview/render 用于调试和一致性对照，仅做局部能力调试时可停在调试阶段。
5. 工作台 JSON 是独立剪辑分支，不自动回写上游。重建或重新导入前保存当前剪辑；主动打开工作台并提供地址，交付 MP4 与同次导出项目 JSON。实测编辑、保存重开、逐轨及成片导出，实际播放、核字、听音；未检查项保留 `not_reviewed`。完整流程见 [制作与可编辑时间线](references/production-workflow.md)。

系列偏好由当前项目提供，人物按镜头可选，示例不决定片长、选角或场所。人物姿态、插画与口型的实际能力按 library/scenes 与能力目录核对；素材参考不等于表演已实现。

按需交付 [剪映草稿](references/jianying-export.md)；维护能力时读 [模块维护](references/module-development.md) 与 [职责归属](references/module-ownership.md)。
