# 素材库：任务入口

维护可复用视觉素材的身份、尺寸、锚点、变体、来源、哈希与原子绘制，提供素材 ID 供场景和组件实例化。声音资源归 audio。

## 职责边界

不决定剧情、动作时间或系列讲述姿势。姿态图属于素材，切换时序与事件执行器已归 scenes。背景原图、提示词和来源已归 backgrounds；完整插画的单片创作源和基础快照继续按各自工程维护，不因目录整理复制一套。

## 按任务读取

| 当前任务 | 读取入口 |
| --- | --- |
| 后端、编辑方式、示例与验证边界 | [统一能力目录](../../references/capability-catalog.md)；运行 python scripts/video.py catalog library --capabilities |
| 选人物与动作参考 | [人物库](CHARACTERS.md)、[素材目录](catalog.json) |
| 扩展物种、拟人程度与角色身份 | [角色设计与物种候选](CHARACTER-DESIGN.md)、[选型画廊](characters/design-atlas/index.html)；样板不等于运行时角色 |
| 背景与来源 | [背景库](backgrounds/README.md)、[背景目录](backgrounds/catalog.json) |
| 物体、锚点、放置及新增素材 | [素材接入细节](details.md) |
| 剧情姿态与能力限制 | [姿态合同](../scenes/PRESENTER-ACTIONS.md)；整图轮换不等于局部嘴型 |
| 完整插画、动作时序与位移 | [插画接入](../scenes/whole-illustration.md)、[场景](../scenes/GUIDE.md)、[运动](../motion/GUIDE.md) |

## 验收重点

人物、物种、背景和场景道具制作前必须读取 [画风透传合同](../style/ART-DIRECTION-CONTRACT.md)，取得本片段有效画风的通用与对应分支提示词、参考图及版本。不能各分支独立换画风；组件素材按组件自己的合同。

核对真实尺寸、哈希、身份、裁切、锚点、比例和透明度。当前没有通用音素对齐、骨骼补间或同姿势局部口型适配，特定样例不扩大为全库能力。

全片分轨、保存重开和最终导出统一按 [工作台](../../references/workbench.md) 验证，本页不表示已完成当前项目验收。新增能力查 [模块维护](../../references/module-development.md)，职责调整查 [归属与迁移清单](../../references/module-ownership.md)。
