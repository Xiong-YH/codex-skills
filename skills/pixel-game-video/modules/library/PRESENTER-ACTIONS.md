# 事件驱动的人物姿态

本模块供明确需要动作表演的剧情或插图角色使用。计算机口播系列不以多张全身姿态轮换来模拟说话；单主角讲述保持同一身体、头部、手臂和站位，只切换局部张嘴/闭嘴。此执行器当前没有同姿势局部口型适配，不能把 neutral/talk 全身图交替当作符合要求的口播。制作该系列前需准备同一底图的开闭嘴局部帧并接入口型执行器；缺少时如实记录能力缺口，不能用摇头、挥手或静态站桩冒充。

Canvas 的 `shot.performance` 将现有 V3 姿态图接入实际播放；Remotion 尚未支持，会在编译时拒绝。每段填写 `pose/start/end`，起止引用同镜事件，区间不得重叠。未安排姿态的空档回到 neutral。需要可见 actor，不能与覆盖人物的 replacement 同用。

```json
{"performance":[
  {"pose":"wave","start":{"event":"s1.enter"},"end":{"event":"s1.greetingEnd"}},
  {"pose":"talk","start":{"event":"s1.speech"},"end":{"event":"s1.sentenceEnd"}}
]}
```

可选 `neutral/wave/talk/dazed-left/dazed-right/overwhelmed`。仅在已选的剧情表演中安排有原因的动作与收束；不要用持续上下浮动代替表演，也不让整个身体无缘由循环摆动。左右疑惑使用两张独立姿态，中间留 neutral，不镜像人物。这些动作不构成口播推荐动作集。

`characters/performance.json` 声明原图哈希、布局裁切边界、统一身高参考与脚底锚点。构建只嵌入用到的姿态和 neutral，动作素材及清单参与工程哈希。运行时只做原图的裁切放置，不重画面部、不修改 alpha。人物在不同姿态间改变手势、表情和头肩关系，脚底保持相同位置；这是离散关键姿态表演，并非骨骼动画、补间手臂或真实音素口型。

导演工程的姿态区间由 storyboard.performance 拥有；人物身份仍在 production-plan。新增姿态或替换图像后重新核验身份、脚底、手部、透明边缘和实际播放。当前接入不自动代表素材已完成透明清稿或获得本次审美认可。
