# 场景与编排：任务入口

维护空间布局、对象关系、叙事状态和跨模块编排，组合素材、组件、文字、运动与声音。

## 职责边界

业务规则和触发由场景拥有；原子素材、排字、通用运动和混音引用对应模块。人物可退场，不要求每镜有人。创作方法与系列选角归导演/项目，示例筹码数、天数和片长不成为通用规则。

## 按任务读取

| 当前任务 | 读取入口 |
| --- | --- |
| 后端、编辑方式、示例与验证边界 | [统一能力目录](../../references/capability-catalog.md)；运行 python scripts/video.py catalog scenes --capabilities |
| 场景选型、参数与后端 | [场景选型表与限制](details.md)、[能力目录](catalog.json)、[场景合同](contract.py) |
| 空间、布局与项目媒体 | [空间设计](SPACE-DESIGN.md)、[布局预设](layouts/GUIDE.md)、[素材合同](MEDIA.md) |
| 自由组合组件与素材 | [组件](../components/GUIDE.md)、[素材](../library/GUIDE.md)；使用已支持的 canvas 场景合同 |
| 完整插画和替换片段 | [完整插画接入](whole-illustration.md)；不恢复拆头试样 |
| 状态反馈 | [游戏反馈细节库](GAME_FEEL.md)；detail.* 是设计索引，不是 motion recipe |
| 剧情姿态与模拟讲述节奏 | [姿态接入](PRESENTER-ACTIONS.md)、[当前表演限制](details.md) |

## 验收重点

场景美术按 [项目主画风与片段透传](../style/ART-DIRECTION-CONTRACT.md) 统一：先解析片段特选或项目主画风，再交给人物、其他物种、背景、道具四分支。片段特选结束后回归项目主画风；组件独立，不接收该画风覆盖。

改变步骤、选项、数量和状态时，画面机制一起变化；检查状态持续、资源守恒与空间接触。静态整图、模拟语音节奏不等于合格口播。

全片分轨、保存重开和最终导出统一按 [工作台](../../references/workbench.md) 验证，本页不表示已完成当前项目验收。新增能力查 [模块维护](../../references/module-development.md)，职责调整查 [归属与迁移清单](../../references/module-ownership.md)。
