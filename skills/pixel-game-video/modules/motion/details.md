# 运动与转场执行

转场选型只读[当前入口](TRANSITIONS.md)，再读选中的配方；本页维护通用时间、运动与合成约束。参数格式和支持范围查[catalog.json](catalog.json)，以编译器校验为准。

## 组件内部的离散动作与节拍

动作时长、停留与配乐触点统一见 [动作节拍](TIMING.md)。组件拥有动作含义，motion 拥有通用运动；此处保留旧锚点。

## 相机与辅助动作

| 用途 | 配方 |
| --- | --- |
| 轻推近 | [motion.camera-push.v1](recipes/camera-push.md) |
| 有边界的跟拍 | [motion.camera-track.v1](recipes/camera-track.md) |
| 物体二维翻转放大 | [motion.object-reveal.v1](recipes/object-reveal.md) |
| 局部金光重音 | [motion.gold-burst.v1](recipes/gold-burst.md) |

这些不是额外转场。局部反馈见[游戏反馈库](../scenes/GAME_FEEL.md)；`staging.js`的前景遮挡辅助不是读取旧帧的通用配方。

## 编排与验收

- motion填写ID、recipe、target、start事件、durationFrames、params；坐标按画幅归一化。物体动画引用object ID，其余已列运动使用target=scene。
- 转场从后镜enter开始，需要前镜，占用后镜时间且不越界；转场之间不能重叠。同类运动在同一目标上不能重叠。时间只由统一编译器解析，项目合同见[制作合同](../../references/contract.md)。
- 连续房间按整幅相机合成；局部运动用于独立内容，不能裁断背景。新内容交接的固定相机等额外限制见所选配方。相机推进结束后保持末态到镜头结束。
- 新字幕和新旁白在转场落稳后出现；主交接对象须在切入时已显露。阅读停顿与运动分开，配方示例秒数不是统一节奏。声音引用同一动作事件，交给[audio](../audio/GUIDE.md)。
- 检查首、中、末态与连续播放：来源和落点对应、遮挡切点完整、无裸底／镜像字／残片。正式片的分轨与导出验收按[工作台](../../references/workbench.md)完成，静帧或单元一致性不代替成片审看。
