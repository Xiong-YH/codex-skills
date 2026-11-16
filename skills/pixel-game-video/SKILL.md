---
name: pixel-game-video
description: 按分镜或工程制作无口播像素信息动效，在工作台核对组件触点、配乐与文字阅读并分轨导出。选题与上屏文案归 pixel-video-writer，视听设计归 pixel-video-director。
---

# Pixel Game Video

负责工程执行与技术交付。只有创意或需要文案时由 pixel-video-writer 接手，需要分镜时由 pixel-video-director 接手。已有工程直接从当前阶段继续。跨安装目录按实际技能根目录定位。

开始制作、续作或复盘先读 [制作总则](references/production-principles.md)，继承当前项目的确认与约束。只加载本次模块与所选配方。新机制先做可播放试样，再按本镜方案兑现动作和阅读。

## 制作路径

1. **确认编辑源。** 按 [制作流程](references/production-workflow.md#1-把分镜落实到唯一初始创作源) 判断 direct、director 或工作台剪辑分支，再修改对应源。接手白模时区分要继承的叙事节奏与按正式参考重做的占位。重建前保存当前剪辑。
2. **准备工程。** 读 [制作合同](references/contract.md) 与 [运行说明](references/runtime.md)。新工程用 `python scripts/video.py init PROJECT`，再 `validate` → `build` → `workbench`。Canvas 构建同时给出动态白模和正式预览，用同一时间线检查触点、字幕和接镜。原生 Remotion 先查 [后端范围](references/remotion.md)。
3. **落实画面。** 从下表选择模块，用 `python scripts/video.py catalog MODULE --capabilities` 核对 [能力状态与调用方式](references/capability-catalog.md)。制作与复核沿 [制作流程](references/production-workflow.md) 执行。
4. **剪辑与交付。** 必读 [工作台](references/workbench.md)，完成分轨编辑、保存重开和最终导出，主动打开实际地址。交付 MP4、同次导出项目 JSON 与核验证据。`preview/render` 用于调试与一致性对照，局部能力试样可在试样阶段交付。

## 按任务选模块

| 模块 | 任务入口 |
| --- | --- |
| [style](modules/style/GUIDE.md) | 场景美术先读 [画风透传](modules/style/ART-DIRECTION-CONTRACT.md)，再选 [八类画风](modules/style/PIXEL-STYLES.md) |
| [library](modules/library/GUIDE.md) | 人物、道具、背景的身份、变体、锚点与来源 |
| [components](modules/components/GUIDE.md) | 按 [脚本需求](modules/components/DESIGN.md) 判断复用或定制。新组件先读 [共同画风](modules/style/COMPONENT-ART.md) 和 [实现协议](modules/components/CUSTOM-RUNTIME.md) |
| [text](modules/text/GUIDE.md) | 按 [文字表现](modules/text/EXPRESSION.md) 选择屏幕主句和对象标注，复核阅读区间 |
| [motion](modules/motion/GUIDE.md) | 从 [动效选型](modules/motion/SELECTION.md) 查真实调用。离散组件动作必读 [动作与阅读预算](modules/motion/TIMING.md) |
| [audio](modules/audio/GUIDE.md) | [可复用 BGM](modules/audio/bgm-system/README.md)、配乐原轨取拍、关键事件音效、分轨混音与审片 |
| [scenes](modules/scenes/GUIDE.md) | 空间、对象关系、状态机制、表演与项目片段合成 |

## 续作与扩展

改文案、时间、素材或共用组件后，按 [局部更新](references/change-management.md) 查询 `changes PROJECT`，复查受影响镜头与接镜。技术检查和实际审片分别记录。

按需读取 [剪映草稿](references/jianying-export.md)。扩展能力读 [模块维护](references/module-development.md) 与 [职责归属](references/module-ownership.md)。人物新动作与共享入库按制作总则沿用当前授权。
