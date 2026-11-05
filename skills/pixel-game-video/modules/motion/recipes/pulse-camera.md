# 短促相机与页面接续

非 3D 运镜移植自 Frametell，来源与许可见 [NOTICE](../FRAMETELL-NOTICE.md)。

**选型先打开[可执行 HTML 规范](../lab/index.html)**：同一场景切换效果，播放、拖进度、查看曲线并复制工程 JSON。
曲线函数和预设参数唯一维护在 [pulse-spec.js](../pulse-spec.js)，正式执行器与 HTML 共用；
HTML 是演示适配层，图片仅作核验证据，不作为调用接口或能力规范。
在 Canvas 和其工作台桥接中执行；原生 Remotion 场景尚不支持新 ID，会明确拒绝。
新镜头优先从本组选择；旧 camera-push / camera-track 保持原行为。同一镜不能混用新旧相机，连续编排用 path。

## 五种预设

`motion.camera-pulse.v1`，target=scene，params.kind 为 push / pan / slam / back。
震动单独使用 `motion.camera-shake.v1`，可叠加在相机运动上。

| 类型 | 制作时长起点 | 60fps 帧数 | 默认行为 |
| --- | --- | --- | --- |
| push | 0.28s | 17 | 关注点推近，scale=1.25 |
| pan | 0.30s | 18 | 移动关注点，继承上次倍率 |
| slam | 0.374s | 22 | scale=1.2；先走到变化量108%，再收回 |
| shake | 0.25s | 15 | 振幅10画布像素，线性衰减；确定性求值 |
| back | 0.50s | 30 | 回中心，scale=1 |

时长仍写 `durationFrames`，按项目 fps 四舍五入，不能把 60fps 表直接用于 30fps。
这些是移植的制作起点，不是每片必须采用的动作配额。动作后留阅读，避免全镜慢漂。

```json
{"id":"emphasis","recipe":"motion.camera-pulse.v1","target":"scene",
 "start":{"event":"s01.result"},"durationFrames":17,
 "params":{"kind":"push","x":0.65,"y":0.48,"scale":1.25,"bounds":"cover"}}
```

x/y 是场景归一化关注点，指向画面中心；默认 .5/.5。倍率范围1–1.75。
bounds=cover（默认）限制位移避免露出源画幅；bounds=free 还原上游自由居中行为，
但有限背景图可能露出画外区域，必须检查构图并准备足够大的背景，不能以纯底色补缺失场景。
本次帧执行器在 endFrame-1 完成运动，并持续保持终态；随机拖动播放头结果一致。

ease 支持 out（三次减速）、inOut（三次加减速）、slam、linear、expo、back、draw。
默认 push/pan/back 用 out，slam 用 slam。震动只持续自己的窗口，结束完全消失。
避免缩放与关注点极值造成主对象出框；通用 shake 不识别对象，不自动配音效。

## 连续关键帧

`motion.camera-path.v1`，params.keys 为 1–64 个有序窗口。
每项含相对该 motion 起点的 atFrame、durationFrames，以及终点 x/y/scale/ease。
没有运动的间隔保持；每一项都从上一项落点接续。不允许重叠或超出 motion 总时长。

```json
{"keys":[
 {"atFrame":0,"durationFrames":17,"x":0.65,"y":0.48,"scale":1.25,"ease":"out"},
 {"atFrame":50,"durationFrames":18,"x":0.4,"y":0.48,"scale":1.25,"ease":"out"},
 {"atFrame":100,"durationFrames":30,"x":0.5,"y":0.5,"scale":1,"ease":"out"}
]}
```

事件沿现有工程绑定讲述触点；此模块不凭空增加逐词对齐，也不自动生成 TTS 时间戳。

## 二维图层组

`motion.layer-move.v1`，target=scene，params.layer=background / actor / content。
支持 x/yFrom/To（归一化位移）、scaleFrom/To、rotationFrom/To（度）、opacityFrom/To、ease。
未给出的起值继承前段终点；结束保持，字幕和叙事进度不随之移动。
当前组粒度沿已有场景层，不是任意组件选择器。整体相机仍作用于所有世界层。
竞赛 cinematic/gameplay 场景是专用整体绘制器，拒绝强行拆组；其他场景需确认实际对象归属。

## 默认页面转场

`motion.page-turn.v1`，target=scene，从后镜 enter 起，占后镜时间，有前镜。
制作时长起点0.6秒，params 默认 direction=left、exitPixels=36、enterPixels=24、blur=5。
前镜淡出并轻移、逐渐模糊；后镜重叠淡入并轻移落稳。首尾帧严格等于源画面。
这不是实体翻书，旧 book-sweep 不替换；名称 page-turn 指页面接续。
源合成冻结前镜末态，工作台依独立剪辑源帧取样；不会自动延迟源镜头或语音。
后镜第一帧须有内容，转场落稳后再安排新文字/旁白。字幕仍独立成轨。

## 工作台与验证

相机、路径、震动和图层组在镜头 cameraJson 中编辑；转场作为 CanvasTransitionUnit 单独成轨，
paramsJson 可改方向、模糊和位移；独立编辑保存到工作台项目 JSON，不回写导演源。
两种默认相机边界和事件时间必须在本片说明，播放、裁切和变速后重新核对。

技术测试：`node --test tests/pulse-motion.test.cjs`，`python -m unittest discover -s tests -p test_pulse_motion.py`。
测试不代替试样的实际连续播放，也不声明用户已认可效果。
