# 运动与转场

原 `pixel-motion-transitions` 已融入本模块，配方与执行器共用一份 ID。

| 配方 | 类型 | 维护说明 |
| --- | --- | --- |
| `motion.camera-push.v1` | 相机 | [共享焦点推进](recipes/camera-push.md) |
| `motion.camera-track.v1` | 相机 | [有边界的横向跟拍与景别变化](recipes/camera-track.md) |
| `motion.focus-punch.v1` | 强转场 | [焦点冲入切换](recipes/focus-punch.md) |
| `motion.mosaic-pullback.v1` | 强转场 | [马赛克拉远](recipes/mosaic-pullback.md) |
| `motion.stage-focus-punch.v1` | 内容区强转场 | [固定人物下的焦点急推](recipes/stage-transitions.md) |
| `motion.stage-mosaic-pullback.v1` | 内容区强转场 | [固定人物下的场景墙后拉](recipes/stage-transitions.md) |
| `motion.panel-slide.v1` | 转场 | [信息面板接续](recipes/panel-slide.md) |
| `motion.pixel-iris.v1` | 转场 | [像素窗口展开](recipes/pixel-iris.md) |
| `motion.shatter-reveal.v1` | 转场 | [上一镜纹理碎裂](recipes/shatter-reveal.md) |
| `motion.object-reveal.v1` | 物体 | [二维翻转放大](recipes/object-reveal.md) |
| `motion.gold-burst.v1` | 特效 | [局部金光爆发](recipes/gold-burst.md) |

每项运动指定 ID、recipe、target、start 事件、durationFrames、params。
相机、转场、特效使用 `target:"scene"`；物体动画引用镜头内 object ID。
参数与可选范围见 `catalog.json`；实现位于 `runtime.js`。
所有坐标按画幅归一化；帧时间只由统一编译器解析。

转场从新镜头 enter 开始，需要一个前镜头；占用新镜头时间，不能越出镜头。
画面主导时用 focus-punch 冲入焦点、mosaic-pullback 拉远重组；人物可通过 `actor:null` 退场。
panel-slide、pixel-iris 是轻转场选项，仅替换右侧信息区，人物与背景保持稳定。
固定侧边人物与强转场可以同时成立：stage-focus-punch / stage-mosaic-pullback 只变换内容舞台的背景与图文，人物、字幕独立保持。不能因人物固定，自动把已要求的强转场降为轻滑动。
字幕新句和新旁白在转场结束后出现；传递焦点的主物体须在切入时已显露，后续机制事件再排在落位后。强转场可从 36–48 帧（60fps）起试。
碎屏保留给打破障碍等特殊剧情，不作为通用镜头切换。
相机推进结束保持最终构图到镜头末，字幕保持独立。
同镜头的转场不能互相重叠；其他同类运动在同一目标上不能重叠。
声音引用动作事件，由 [audio](../audio/GUIDE.md) 合成。

固定场景计数归 [scenes](../scenes/GUIDE.md)；互动卡是场景和文字的组合，不冒充相机能力。
前景遮挡辅助 `staging.js` 可用于动作中的场所切换；遮挡中点覆盖整个画幅，切换应藏在该点。它不是读取旧帧的通用转场配方。
验收必须检查前、中、后帧及连续视频：焦点连贯、无裸底、无镜像字、无残片。
