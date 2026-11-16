# 粒子效果与选型

[打开动态对照](examples/particles/index.html)。任选两种效果同步播放，也可半速、跳到触发或收束。试样共用实际绘制代码，使用同一时间窗口方便比较。各镜头的正式时长按[动作与阅读预算](TIMING.md)确定。

## 按画面要表达的变化选

| 效果 | 适合表达 | 来源与路径 | 收束和核验 | 实际入口 |
| --- | --- | --- | --- | --- |
| [导槽传递](examples/particles/index.html?effect=signal) | 输入已经送达，下一步可以操作 | 像素块从止挡接缝聚入导槽，沿折线走向接收端 | 到达帧由按钮或目标对象接住变化，随后保持可读 | 独立 Canvas，[传导调用](recipes/contact-feedback.md#用粒子传递状态) |
| [像素汇聚](examples/particles/index.html?effect=gather) | 分散信息或碎块拼成一个结果 | 给每块一个目标格，由外围聚入轮廓 | 同一批块落在目标格并保持，观众能辨认成形结果 | 独立 Canvas，[汇聚调用](#像素汇聚) |
| [触地扬尘](examples/particles/index.html?effect=dust) | 干燥表面接触时的重量感 | 从物体与承托面接触处出发，低矮地向两侧扩散 | 尘粒在承托面上方消散，物体与地面保持接触 | 独立 Canvas，[扬尘调用](#触地扬尘) |
| [四向确认点](examples/particles/index.html?effect=confirm) | 条件刚通过、轻量选中 | 以确认标记或小对象为中心，四个点短促散开 | 确认标记持续，短点退场并清出文字区 | 场景绘制辅助，[game-feedback.js](game-feedback.js) 的 `burst` |
| [定向火花](examples/particles/index.html?effect=sparks) | 金属碰撞、有材质依据的放电 | 从真实接缝出发，带短尾朝受力方向扇出 | 火花退场后还能看到止挡的位移、锁住或接触结果 | 正式 Canvas，[触点反馈](recipes/contact-feedback.md#局部反馈)的 `impact` 火花加 `direction` |
| [金色完成爆发](examples/particles/index.html?effect=gold) | 明确完成的主拍、达到实际阈值 | 以结果焦点为中心，粒子一次性向外扩散 | 金光退场，结果数字或完成文字保持清楚 | 正式 Canvas，[motion.gold-burst.v1](recipes/gold-burst.md) |
| [纹理碎片揭示](examples/particles/index.html?effect=shatter) | 旧覆盖层真的破开，并揭示新画面 | 从断点生成带旧画面纹理的碎片，带错峰和下坠 | 第一帧连续，中段新画面可见，末帧无旧碎片 | 正式 Canvas 转场，[motion.shatter-reveal.v1](recipes/shatter-reveal.md) |

轻量确认需要更克制时，可用接收端变色、短晕染或沿表面掠光。两种光效的参数见[触点反馈](recipes/contact-feedback.md#局部反馈)。各类型允许按材质改色和像素尺度。强调强度可由接触位移、几块粒子的聚散、接收端反馈和节拍共同建立。

## 注解怎样写

在分镜中用一句话交代 **哪个事件 → 哪个位置发出 → 走向哪里 → 什么结果留下**。例如“凭条撞到止挡，四块青绿像素经折角到达按钮，抵达时按钮亮起，随后保持可读”。强调的声音若有，引用同一触点或实际到达事件。

- 起点用实物接缝、表面、断口或结果焦点。末点落在负责接收的对象上。尘屑的尺度、受力方向和遮挡由材质及空间决定。
- 传输真实资源时追踪同一对象的身份和数量。表现状态信号时让接收端响应，避免像素数量看起来等于真实计量。碎裂时检查源对象随碎片离场。
- 用当前帧和稳定种子重算画面。先看触发前、触点、途中、结束和阅读区间，再看正常速度和小屏。粒子移开后复看结果是否仍成立。

## 绘制辅助的调用

下列两项先加载 [style/runtime.js](../style/runtime.js) 与 [particle-effects.js](particle-effects.js)，坐标和尺寸采用同一 Canvas 局部坐标。宿主从事件表计算 `progress`，并绘制相应业务状态。它们是独立 Canvas 绘制辅助，正式 VideoSpec 选型继续用[动效目录](library.html)。

### 像素汇聚

`PixelVideo.particleEffects.gather(ctx, { cells, size, spread, seed }, progress)`

`cells` 为 `[x, y, color]` 数组，每项是末态方格的左上角和颜色。用 `size` 给出方格边长，`spread` 给出起点散布的距离尺度。`progress` 从 0 到 1。到 1 时各块精确落格，继续用 1 取帧可保留结果。让颜色和最终轮廓一起可辨，避免到终点时再盖上一张不同的图。

### 触地扬尘

`PixelVideo.particleEffects.dust(ctx, { x, groundY, reach, size, color, seed }, progress)`

`x, groundY` 是承托面触点，`reach` 是水平散开的距离，`size` 是尘粒尺寸基准。触地前传负进度，触地时传 0，消散结束时传 1。多个支点可各用一个触点，先核对落地几何与遮挡。土、粉尘和布面可用不同颜色和尺寸。

四向确认点先加载 [style/runtime.js](../style/runtime.js)、[motion/runtime.js](runtime.js) 和 [game-feedback.js](game-feedback.js)。调用 `PixelVideo.motion.gameFeedback.burst(ctx, x, y, progress, color, radius)`，按确认事件提供 0 到 1 的进度，四点在末态前退场。正式配方的字段、后端和可编辑范围由对应配方维护。
