---
name: pixel-game-video
description: 制作和修改超粗像素人物与实体组件结合的无口播视频，落实短促动效、事件音效、音乐触点、同物接镜与可编辑分轨交付。选题文案归 pixel-video-writer，分镜设计归 pixel-video-director。
---

# Pixel Game Video

负责工程执行与交付。先读 [制作总则](references/production-principles.md) 与 [当前系列风格](references/current-style.md)，继承本片已确认内容。新片从空工程开始，续作从实际编辑源继续，历史工程和旧样片不作初始化输入。

## 制作路径

1. **确定本次源。** 按 [制作流程](references/production-workflow.md#1-把分镜落实到唯一初始创作源) 确定 direct、director 或工作台分支。只有创意／文案需求时由编剧接手，需要分镜时由导演接手；不重复已完成的阶段。
2. **准备工程。** 读 [制作合同](references/contract.md) 与 [运行说明](references/runtime.md)。`python scripts/video.py init PROJECT` 创建中性占位工程，再按本片文案、人物和组件设计填入真实素材与事件；占位预览不作成片。`validate` → `build` → `workbench`。原生 Remotion 先查 [后端范围](references/remotion.md)。
3. **先做代表片段。** 人物完整姿态回应事件，组件按触点改变状态，关键动效短促收束并保留阅读，接镜可追踪同一对象。采用声音时，按 [音效设计与试听](modules/audio/SOUND-DESIGN.md) 绑定关键动作和状态，和只保留音乐／旁白的版本对照后再扩片。从下表只加载所需能力；新机制先做 [可播放试样](references/production-workflow.md#新动作失败时先回退不带缺口扩片)。
4. **剪辑与交付。** 按 [工作台](references/workbench.md) 分轨编辑、保存重开和最终导出，主动打开实际地址。正速核对动作、文字与声音，交付 MP4、同次 JSON 与实际审片证据；技术导出成功不表示审片通过。

## 按任务选模块

| 模块 | 入口 |
| --- | --- |
| [style](modules/style/GUIDE.md) | [分层美术合同](modules/style/ART-DIRECTION-CONTRACT.md)：超粗人物、粗像素环境与独立组件；其他画风按明确需要选用 |
| [library](modules/library/GUIDE.md) | 角色身份、完整姿态、来源与锚点；已有原图不等于本镜动作已完成 |
| [components](modules/components/GUIDE.md) | [组件美术](modules/style/COMPONENT-ART.md) 与 [内容驱动设计](modules/components/DESIGN.md)，按对象判断复用、组合或定制 |
| [text](modules/text/GUIDE.md) | [文字表现](modules/text/EXPRESSION.md)：主句、标签与数字分工，稳定阅读与同屏避让 |
| [motion](modules/motion/GUIDE.md) | [动作预算](modules/motion/TIMING.md)、[选型](modules/motion/SELECTION.md)，实现短促反馈、焦点接力与同物交接 |
| [audio](modules/audio/GUIDE.md) | 材质拟音、界面反馈、转场与留白；BGM、旁白和音效独立编辑 |
| [scenes](modules/scenes/GUIDE.md) | 人物表演、支撑与接触、对象状态、场景合成 |

使用 `python scripts/video.py catalog MODULE --capabilities` 查 [真实能力与后端](references/capability-catalog.md)。[R41 独立参考包](examples/asking-motion/index.html) 用于观察实际效果，按本片内容另选人物、组件和动作。

## 续作与扩展

修改文案、时间、素材或共享实现后，按 [局部更新](references/change-management.md) 查询 `changes PROJECT`，复看受影响镜头与接镜。扩展能力读 [模块维护](references/module-development.md) 与 [职责归属](references/module-ownership.md)。仅在需要时读 [剪映草稿](references/jianying-export.md)、其他后端或历史案例。
