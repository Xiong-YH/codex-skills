# 文档脱敏高亮

`scenes.document-highlight.v1` 用合同页、字符索引与条件校验展示脱敏内容的定位过程。图形是解释模型，不调用或复刻 WPS API。

- `phase`：intro/task/mask/pipeline/exception/structure/drift/verify/match/search/success/reflection/summary。
- `environment`：workspace/workshop/atlas；按项目选择完整像素背景。
- `heading`、`kicker` 与 `labels`：由脚本 labelId 解析，labels 完整键由 contract.py 校验。
- `stageEvents`：1–8 个严格递增的本镜事件；驱动脱敏、流程节点、结构显露、位置偏移、校验和扫描结果。
- 场景自行摆放合同与字符格，`objects` 必须为空；人物可选，站立口播沿用素材库。

100→102 仅是偏移示意，不声称所有换行、表格都有固定偏移。扫描有明确终点与逐候选校验；重复文本、跨段落与搜索未命中的真实业务策略需调用方另外定义。不能把近邻查找视为通用 Word 坐标换算。

验收时查看正常与错位字符格、失败校验与命中后的高亮。文字保持原比例，旁白落稳后进入，最后保留阅读时间。技术核验与本次视听 review 分开记录。
