# 运动与转场：任务入口

维护通用运动、缓动、相机、转场、遮挡与几何反馈，消费编译后的事件与进度。

## 职责边界

不定义业务状态、资源数量、文案或声音选型。组件负责局部动作含义，场景负责触发与跨对象关系。已有专用空间实现不自动成为通用 recipe。

## 按任务读取

| 当前任务 | 读取入口 |
| --- | --- |
| 后端、编辑方式、示例与验证边界 | [统一能力目录](../../references/capability-catalog.md)；运行 python scripts/video.py catalog motion --capabilities |
| 选择转场 | [转场库](TRANSITIONS.md)，再读选中配方；不默认加载研究候选和历史 |
| 相机与辅助动作 | [配方选型](details.md#相机与辅助动作)、[能力目录](catalog.json) |
| 组件动作时长和配乐触点 | [离散动作与节拍](TIMING.md) |
| 参数、相机和转场边界 | [编排与验收](details.md#编排与验收)、[公共合同](../../references/contract.md) |
| 游戏反馈与声音 | [场景反馈](../scenes/GAME_FEEL.md)、[声音](../audio/GUIDE.md) |
| 字幕、道具或组件的冲入、回弹与衰减震动 | [个体冲击逐帧参考](IMPACT.md) |

## 验收重点

检查首中末帧与连续播放的交出/接住、遮挡和末态保持；无裸底、镜像字与残片。运动与阅读停留分开，声音引用同一事件。

全片分轨、保存重开和最终导出统一按 [工作台](../../references/workbench.md) 验证，本页不表示已完成当前项目验收。新增能力查 [模块维护](../../references/module-development.md)，职责调整查 [归属与迁移清单](../../references/module-ownership.md)。

## 组件内部的离散动作与节拍

原规则完整保留在 [动作时长与节拍](TIMING.md)，本锚点供既有引用继续使用。
