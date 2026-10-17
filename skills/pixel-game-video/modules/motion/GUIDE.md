# 运动与转场

原 `pixel-motion-transitions` 已融入本模块，配方与执行器共用一份 ID。

| 配方 | 类型 | 维护说明 |
| --- | --- | --- |
| `motion.camera-push.v1` | 相机 | [共享焦点推进](recipes/camera-push.md) |
| `motion.shatter-reveal.v1` | 转场 | [上一镜纹理碎裂](recipes/shatter-reveal.md) |
| `motion.object-reveal.v1` | 物体 | [二维翻转放大](recipes/object-reveal.md) |
| `motion.gold-burst.v1` | 特效 | [局部金光爆发](recipes/gold-burst.md) |

每项运动指定 ID、recipe、target、start 事件、durationFrames、params。
相机、转场、特效使用 `target:"scene"`；物体动画引用镜头内 object ID。
参数与可选范围见 `catalog.json`；实现位于 `runtime.js`。
所有坐标按画幅归一化；帧时间只由统一编译器解析。

碎屏从新镜头 enter 开始，至少需要一个前镜头；新场已在碎片下方绘制。
相机推进结束保持最终构图到镜头末，字幕保持独立。
同一目标同类动画不能重叠；每镜头优先只设一种主要运动。
声音引用动作事件，由 [audio](../audio/GUIDE.md) 合成。

固定场景计数归 [scenes](../scenes/GUIDE.md)；互动卡是场景和文字的组合，不冒充相机能力。
验收必须检查前、中、后帧及连续视频：焦点连贯、无裸底、无镜像字、无残片。
