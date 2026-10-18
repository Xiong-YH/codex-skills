# 转场库：选型与设计入口

目前收纳 **12 种转场方法：9 种可直接调用的配方、3 种空间设计（已在竞赛专用场景落地，尚无通用配方）**。另有 2 种已撤回实验，不计入可选数量。相机推进/跟拍、物体翻转和金光特效是辅助运动，不单独算转场。

这里负责选型；可执行 ID 与参数以 [catalog.json](catalog.json) 为准，算法仍在 motion 执行器中。`design.*` 仅为设计索引，不能写入 VideoSpec 的 `recipe`。新设计完成参数合同、运行实现和片段核验后，才登记为 `motion.*`；保留对应设计说明，避免只剩效果名。

## 已实现：9 种

“已实现”表示引擎可执行，不代表适合当前项目或已获得本次审美认可。

| 名称 / recipe | 交接关系与适用情境 | 选用限制 / 详细说明 |
| --- | --- | --- |
| 焦点冲入 `motion.focus-punch.v1` | 从可辨认的物体冲入，在运动中接到新空间；强调进入某个主题 | 前后焦点要有语义与构图承接，避免突然大推大拉。[配方](recipes/focus-punch.md) |
| 场景卡墙 `motion.mosaic-pullback.v1` | 完整场景缩成一格，展示集合，再锁定下一项 | 只有“个体→集合→目标”确实需要讲清时使用。[配方](recipes/mosaic-pullback.md) |
| 信息面板滑动 `motion.panel-slide.v1` | 同一背景里的独立旧面板退出、新面板进入 | 不能把连续房间裁成移动面板。[配方](recipes/panel-slide.md) |
| 像素窗口 `motion.pixel-iris.v1` | 从指定焦点逐格展开下一组信息 | 限独立信息区；适合阶段结果。[配方](recipes/pixel-iris.md) |
| 碎屏揭示 `motion.shatter-reveal.v1` | 旧画面碎片散开，显露后景 | 适合打破障碍等明确剧情，普通口播慎用。[配方](recipes/shatter-reveal.md) |
| 书页铺屏 `motion.book-sweep.v1` | 实体书页铺满画幅，完整遮挡时换景，再扫离 | 先建立书页来源，不能突然飞来无关的书。[配方](recipes/narrative-handoffs.md) |
| 前景书架横移 `motion.shelf-travel.v1` | 横向经过前景书架，遮住两个完整房间的接缝 | 要有相邻空间或路线关系。[配方](recipes/narrative-handoffs.md) |
| 场景收为图卡 `motion.scene-to-card.v1` | 前一完整场景收进下一镜中的真实图卡 | 适合回顾、并列路线；落点使用同一来源图像。[配方](recipes/narrative-handoffs.md) |
| 主体匹配溶解 `motion.match-dissolve.v1` | 主体几何保持，完整旧场景缓慢溶解为新场景 | 是淡化方案；用户已否定本次竞赛视频首转场的效果，不用于该处重做。[配方](recipes/match-dissolve.md) |

## 新收纳：3 种空间转场设计

三种设计已在竞赛 cinematic/gameplay 场景落地，尚无通用 recipe。认可范围与 V3/V4 撤回原因统一见 [迭代记录](../../references/iteration-history.md)；其他场景需补实现和逐片核验。

| 设计 ID / 名称 | 连续动作 | 适合解释 |
| --- | --- | --- |
| `design.card-focus-lift.v1` 聚焦前移 | 在已有布局中定位 → 镜头靠近 → 同一张卡前移并改变透视/阴影 → 落稳讲解 | 从全貌进入一个具体主题；本片题板进入算法讲解。[设计](recipes/card-spatial-handoffs.md#聚焦前移) |
| `design.stack-to-layout.v1` 卡堆展开 | 已有叠层分离 → 各卡错峰展开 → 视角趋平 → 落成布局 | 整体与组成、任务或时间分配；本片时间卡展开。[设计](recipes/card-spatial-handoffs.md#卡堆展开) |
| `design.target-isolate.v1` 目标抽离 | 列表内已有目标被选中 → 向中心抽出 → 邻项退居背景 → 推近并确认 | 从多个选项进入一项；本片选出试练计划。[设计](recipes/card-spatial-handoffs.md#目标抽离) |

## 设计下一次转场时填写

每个交接先写清以下内容，再选配方或实现新能力。可写入 storyboard 的 `intent`，时间只放镜头事件，能力选择仍放 production-plan，不另建一份秒数时间线。

- **前镜交出什么**：明确物体、来源镜头、当前状态和可辨认标记。
- **后镜接住什么**：同一物体的落点、大小与状态；若更换内容，说明新内容怎样进入。
- **动作怎样组织**：定位、主运动、落稳、阅读分别由哪些事件控制；同一背景是否保留。
- **讲解何时开始**：主体落稳后再进入新句和密集文字；按实际旁白长度留理解时间。
- **怎么验收**：首尾主体对应、中途无裸底/重影/镜像字、落位无跳变；连续播放检查节奏，听音检查同步。

不要默认每句话切一次、每次转场同长，或把“动作变慢”直接等同于“节奏更好”。有时保留场景、只改变物体关系更合适。参考片的定位→移动→落稳→解释是设计线索，阶段可重叠，时长按信息量与旁白安排。

## 已撤回：2 种

`motion.stage-focus-punch.v1`、`motion.stage-mosaic-pullback.v1`：连续背景裁成局部贴片，造成空间割裂，状态为 unavailable；不可重新选用。参见 [失败说明](recipes/stage-transitions.md)。
