---
name: pixel-game-video
description: 按已有脚本或工程制作、修改像素游戏感视频，在工作台分轨剪辑并导出可编辑成片。选题与文案使用 pixel-video-writer，视听设计与制作统筹使用 pixel-video-director。
---

# Pixel Game Video

**核心要求：按镜头决定兑现动效。** 先从[导演统一选型](modules/motion/library.html)按解释目的选择当前后端可调用的效果，再按所选项的合同、参数和事件实现；[选型规则](modules/motion/SELECTION.md)提供同源查询入口。实际导出检查起态、过程、落点与阅读，不用近似动作替代已采用的设计。

**开始制作、续作或复盘先读 [核心要求与常见踩坑](references/production-principles.md)。** Agent 主动继承已确认要求并落实到本片，无需使用者再次提醒或手动选型；普通字幕沿 text 的后续制作默认执行。只加载当前任务的模块与配方，反馈修复后的经验回到该页维护。

**人物制作与动作入库。** 人物结构是交付必查项，发现肢体畸变、连接错误或不合理的关节动作，先修正并复核。新视频可以定制人物动作。发现现有库不适合时，先说明镜头需求并询问用户是否新增。动作可审看后，再询问是否收入共享库。具体检查与确认范围见[人物结构与新动作](references/production-principles.md#人物结构与新动作)。

## 制作路径

1. **确认编辑源。** direct 工程编辑 `project / timeline / text / audio.json`；director 工程沿 `source-map.json` 回改创作源再 handoff。工作台 JSON 是独立剪辑分支，不自动回写；重建或重新导入前先保存当前剪辑。
2. **准备工程。** 编写前读 [制作合同](references/contract.md)。新工程用 `python scripts/video.py init PROJECT`，再 `validate` → `build` → `workbench`；已有工程从当前阶段继续。依赖与命令见 [运行说明](references/runtime.md)。
3. **落实画面。** 按下表选模块。涉及离散组件动作必读 [动作与阅读预算](modules/motion/TIMING.md)；新动作先做可播放试样，兑现后再扩片。默认 Canvas；选原生 Remotion 时先查 [后端白名单](references/remotion.md)。
4. **剪辑与交付。** 出片必读 [工作台](references/workbench.md)，执行 [制作流程](references/production-workflow.md) 的编辑、保存重开与导出核验。主动打开工作台并提供地址，交付 MP4、同次导出项目 JSON 与本次核验证据。`preview/render` 仅用于调试和一致性对照；局部能力调试可停在试样阶段。

只有新创意时先由 pixel-video-writer 完成选题与文案，需要分镜再由 pixel-video-director 接手；按实际安装目录定位，已有工程直接从当前阶段继续。基础技能可独立运行，不为局部实现修复重跑编剧/导演流程。旁白使用已有素材导入，本流程不自动配音或调用 TTS。

先做画面、后配音时，direct 工程可用[模拟口播同步](references/speech-rehearsal.md)按文本估计句词拍点，绑定现有事件；不产生声音，不代表真实音频对齐。director 创作源和已剪辑工作台分支目前不自动同步此配置。

改文案、时间、素材或共用组件后，按[改动影响与局部更新](references/change-management.md)查询 `changes PROJECT` 并复查受影响镜头；工作台先预览冲突再应用更新，完整 MP4 可选分段复用。自动检查、可预览、实际审片和导出状态分别记录。

## 按任务选模块

| 模块 | 任务与必查项 |
| --- | --- |
| [style](modules/style/GUIDE.md) | 场景美术先读 [主画风透传](modules/style/ART-DIRECTION-CONTRACT.md)，再选 [八类画风](modules/style/PIXEL-STYLES.md)；组件独立 |
| [library](modules/library/GUIDE.md) | 人物、道具、背景的身份、变体、锚点与来源 |
| [components](modules/components/GUIDE.md) | 按 [脚本需求](modules/components/DESIGN.md) 判断复用或定制；新组件/局部改版先读 [共同画风](modules/style/COMPONENT-ART.md)，新机制按 [实现协议](modules/components/CUSTOM-RUNTIME.md) 接入 |
| [text](modules/text/GUIDE.md) | 有字幕必查 [已认可方案与实际调用](modules/text/SOFT-HIGHLIGHT.md#实现边界与使用方式)；工作台明确选用方案，按实际组件核验，勿临时退回简化白字 |
| [motion](modules/motion/GUIDE.md) | 动作、相机与遮挡；新镜头优先查[短促非3D运镜](modules/motion/recipes/pulse-camera.md)，选择转场先查 [转场库](modules/motion/TRANSITIONS.md) |
| [audio](modules/audio/GUIDE.md) | 音效取舍、旁白导入、配乐与混音 |
| [scenes](modules/scenes/GUIDE.md) | 空间、对象关系、状态机制、表演与跨模块编排 |

调用前用 `python scripts/video.py catalog MODULE --capabilities` 核对字段、后端和工作台边界，详见 [能力目录](references/capability-catalog.md)。设计名、美术 ID、独立试样均不能冒充可执行 ID。

按需提供 [剪映草稿](references/jianying-export.md)；能力扩展读 [模块维护](references/module-development.md) 与 [职责归属](references/module-ownership.md)。
