# 侧边口播

`scenes.presenter-board.v1` 保留 library 的固定站位讲述人物，只有嘴型和眨眼；不调用 `actor-performance` 的活动动作。必须指定 actor，背景与人物保持稳定，右侧图文在 content 层维护。

params：`layout` 为 pair / hero / checklist，分别要求 2 项 / 1 项 / 1–3 项；`heading`、`kicker` 为短标题。每个 items 元素是 `{object,label,detail,event}`，object 引用本镜已有的物体 ID，event 引用本镜事件；每个物体只能引用一次，items 与 objects 完整对应。

物体坐标在 storyboard.objects、素材选择在 production-plan.objects；文案在 script.labels，以 labelId 交接。场景控制图文布局与出现状态，library 维护形状，motion 维护物体进入与内容区转场。pair 用于问题对比，hero 用于单个条件/主题，checklist 用于结尾判断。

人物不随图文移动；需要强转场时用 stage-focus-punch / stage-mosaic-pullback，轻交接才用 panel-slide / pixel-iris。场景的 contentStage 包含标题、图标与标签，强转场裁片包含该区背景，不含人物或字幕。新旁白与字幕在转场后开始；用于承接焦点的主图标应提前显露。人物的固定比例和脚底位置由 style.presenter 配置。具体文案和 18 秒片长不是场景默认值。
