# 场景与角色表演

场景把内容转成规则、状态变化和结果，组合素材、文字、运动与声音。
需要增强游戏感时读 [游戏反馈细节库](GAME_FEEL.md)：按状态选焦点锁定、回弹、资源转移、确认、阶段进度与结算；实现、用户认可范围与待调优项分别标注。
人物可按镜头设置 `actor:null` 退场，此时机制居中放大，场景或物体成为画面主体。

| 场景 | params | 可见变化 |
| --- | --- | --- |
| `scenes.document-highlight.v1` | [文档高亮](document-highlight.md) | 脱敏、索引与文档范围错位、校验失败、近邻查找与高亮确认 |
| `scenes.steps.v1` | `items:[{label,event}]`，1–5 项 | 事件后逐项完成 |
| `scenes.counter.v1` | `from,to` 安全整数；`label?,unit?,startEvent,endEvent` | 固定场景内计数与进度 |
| `scenes.choice.v1` | `options,selectedIndex,selectEvent`，2–3 项 | 选择发生后突出方案 |
| `scenes.assembly.v1` | `parts:[{label,event}],resultLabel?`，2–5 项 | 部件到位、连接核心 |
| `scenes.focus.v1` | `label?,detail?` | 物体展示与镜头交接 |
| `scenes.cache-journey.v1` | [数据旅程](cache-journey.md) | 往返、复制、缓存命中与未命中 |
| `scenes.cache-adventure.v1` | [人物取数表演](cache-adventure.md) | 跑动取物、近景复制、伸手命中与回源 |
| `scenes.presenter-board.v1` | [侧边口播](presenter-board.md) | 人物固定，右侧双项对比、图标强调或条件清单 |
| `scenes.study-routes.v1` | [研究与实践](study-routes.md) | 书桌、研究档案馆、开发工坊与路线桌之间的叙事接力 |
| `scenes.competition-routes.v1` | [竞赛与投入选择](competition-routes.md) | 算法节点、时间格、试练日历、项目交付与真实镜头卡 |

所有 params 中 event 均为本镜头局部 ID，可用 `enter`；`exit` 是不可见的右边界，不能触发状态动作。
`contract.py` 校验参数与事件引用；`runtime.js` 只消费编译结果。
计数 from/to 为 JavaScript 安全整数（绝对值 ≤ 2⁵³−1）；startEvent 早于 endEvent，终值在 endEvent 精确到达并保持。
状态持久到镜头结束；已完成步骤不因帧随机数而跳回。

`performance.py` 分配起口、短元音峰值和柔和闭唇；原图微笑仅在短句间与字幕外恢复，避免逐字闪白牙。
这是文案节奏模拟，不是真实人声或音素强制对齐；静音仍有嘴型。
口型图像归素材库，字幕排版归文字模块。

新增场景必须有参数合同、事件驱动的状态、运行实现和关键帧样例。
原互动卡配方见 [interaction-card.md](interaction-card.md)，当前未注册执行器，不可当作已实现能力使用。
验收：修改步骤数、选择项、计数终值或部件时，画面机制一起改变；不能只换字幕。
