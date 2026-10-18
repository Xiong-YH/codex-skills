# 侧边口播

`scenes.presenter-board.v1` 保留 library 的站立讲述人物；当前 V3 以静态基准图预览，嘴型与眨眼尚未接入，不调用 `actor-performance`。必须指定 actor，右侧图文在 content 层维护；整个场景仍可统一运镜。

params：`layout` 为 pair / hero / checklist，分别要求 2 项 / 1 项 / 1–3 项；`heading`、`kicker` 为短标题。每个 items 元素是 `{object,label,detail,event}`，object 引用本镜已有的物体 ID，event 引用本镜事件；每个物体只能引用一次，items 与 objects 完整对应。

物体坐标在 storyboard.objects、素材选择在 production-plan.objects；文案在 script.labels，以 labelId 交接。场景控制图文布局与出现状态，library 维护形状，motion 维护物体进入与镜头变换。pair 用于问题对比，hero 用于单个条件/主题，checklist 用于结尾判断。

稳定讲述时人物原地站立，图文在另一侧呈现。强转场使用完整画幅的 focus-punch / mosaic-pullback，人物与房间遵循同一镜头变换；不可把连续背景裁成局部缩放窗口。contentStage 只供独立图文的轻交接使用。新旁白与字幕在落位后开始，承接焦点的主图标提前显露。style.presenter 配置稳定构图中的比例和脚底位置，不锁死运镜时的屏幕坐标。具体文案和 18 秒片长不是场景默认值。
