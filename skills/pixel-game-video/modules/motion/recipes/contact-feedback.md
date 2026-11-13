# 普通镜头的人物动作与触点反馈

小比例小棕可以在普通 Canvas 镜头中走到对象前、踩稳、伸手并收回。先按当前场所安排人物行动的目的和结果，留出脚底到地面、手到物件的实际空间。角色同镜参与交互、组件和事件音效可共用一个触点。

## 走位与伸手

`motion.actor-blocking.v1` 用 `target:"actor"` 及 `actor.azong.v3`。坐标按画幅归一化，`from/to` 指脚底中心，`height` 是画高比例。走位保持相同地面高度，双脚交替踩稳，末步收回站姿。连续动作首尾脚底位置和身高须一致。可设 `facing` 指定左或右，省略时走位沿移动方向，伸手朝右。

```json
{"id":"arrive","recipe":"motion.actor-blocking.v1","target":"actor","start":{"event":"desk.walk"},"durationFrames":72,"params":{"action":"walk","from":[0.275,0.75],"to":[0.38,0.75],"height":0.26}}
```

伸手的 `from/to` 相同，`hand` 是指尖要到达的画幅位置，`contact` 引用动作区间内的本镜事件。把手放到合适距离的边缘。以下示例由 `desk.contact` 同时触发火花、状态和事件音效。

```json
{"id":"touch","recipe":"motion.actor-blocking.v1","target":"actor","start":{"event":"desk.reach"},"durationFrames":36,"params":{"action":"reach","from":[0.38,0.75],"to":[0.38,0.75],"height":0.26,"hand":[0.437,0.60],"contact":"contact"}}
```

该配方绘制小棕的整体像素小人。需要近景表演、握持、多人交换或新的身体动作时，按 [人物表演库](../../scenes/character-performance/README.md) 选用同机位整幅素材和真实接触姿态。替换片、专用人物场景和整身姿态轨有各自执行器。

## 局部反馈

`motion.contact-fx.v1` 用 `target:"scene"`，`start` 引用真实触点。可选 `sparks` 做碰撞像素粒子，`bloom` 做状态激活的局部晕染，`light-sweep` 做写入或完成时的掠光。用 `x/y` 指定世界内触点，`radius` 按画高指定影响范围，`strength` 调整强度，`tone` 选 gold、accent 或 danger。粒子按 seed 与帧号重绘，暂停和回拖保持同样结果。参数范围见 [能力目录](../catalog.json)。

先核对角色、触点和结果，再加光效。检查触点前后、正常速度和缩小阅读，特别关注脚底支撑、手和物件边缘、粒子是否盖住字、掠光是否离开应强调的对象。正式预览、动态白模和工作台 Canvas 单元均使用相同的事件。

主拍需要更清楚的画面反馈时，给同一个配方填 `profile:"impact"`。火花扩散带方形冲击边缘，晕染扩到对象周边，掠光有清楚的斜向高亮前沿。默认 `soft` 保留原效果。先试对象附近的实际效果，再调整覆盖范围和持续时间。
