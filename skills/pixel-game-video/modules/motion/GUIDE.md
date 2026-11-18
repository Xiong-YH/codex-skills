# 运动与转场：任务入口

先对照 [R41 选段](../../references/asking-motion-reference.md#按镜头任务选段) 确定这段要发生的变化和落点。再从 [选型目录](library.html) 查当前后端可调用的配方、曲线和动态预览。需要查看研究候选或历史配方时，按 [选型规则](SELECTION.md) 展开相应条目。

维护通用运动、缓动、相机、转场、遮挡与几何反馈，消费编译后的事件与进度。

## 职责边界

不定义业务状态、资源数量、文案或声音选型。组件负责局部动作含义，场景负责触发与跨对象关系。已有专用空间实现不自动成为通用 recipe。

## 按任务读取

| 当前任务 | 读取入口 |
| --- | --- |
| 后端、编辑方式、示例与验证边界 | [统一能力目录](../../references/capability-catalog.md)；运行 python scripts/video.py catalog motion --capabilities |
| 选择转场 | [转场库](TRANSITIONS.md)，再读选中配方；不默认加载研究候选和历史 |
| 相机与辅助动作 | [配方选型](details.md#相机与辅助动作)、[能力目录](catalog.json) |
| 新镜头的短促运镜／图层动画／页面接续 | [非3D运镜与页面接续](recipes/pulse-camera.md)：五预设、关键帧、分组变换；Canvas与工作台 |
| 组件动作时长和配乐触点 | [离散动作与节拍](TIMING.md) |
| 粒子怎么选、怎样写触发与收束 | [粒子效果与选型](PARTICLES.md)，附[同步动态对照](examples/particles/index.html) |
| 人物触点与局部反馈 | [走位、火花、晕染和掠光](recipes/contact-feedback.md)，走位配方的角色限制见其合同 |
| 需要扩展焦点、遮挡或分层视差的做法 | [动态设计试样](recipes/advanced-2d.md) 逐项附执行状态 |
| 参数、相机和转场边界 | [编排与验收](details.md#编排与验收)、[公共合同](../../references/contract.md) |
| 游戏反馈与声音 | [场景反馈](../scenes/GAME_FEEL.md)、[声音](../audio/GUIDE.md) |
| 字幕、道具或组件的冲入、回弹与衰减震动 | [个体冲击逐帧参考](IMPACT.md) |

## 验收重点

检查首中末帧与连续播放的交出/接住、遮挡和末态保持；无裸底、镜像字与残片。运动与阅读停留分开，声音引用同一事件。

## 组件内部的离散动作与节拍

原规则完整保留在 [动作时长与节拍](TIMING.md)，本锚点供既有引用继续使用。
