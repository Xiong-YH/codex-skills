# 数据旅程

`scenes.cache-journey.v1` 是完整前景机制，样例使用 `actor:null` 和空 objects。它复用 library 的终端、数据仓、缓存盒与带身份的数据块；背景由 style 根据 environment 选择，文字由 script 的 labelId 交接。

phase 为 question / fetch / store / hit / miss / summary。startEvent、arriveEvent、completeEvent 引用本镜事件，必须严格递增。具体标签和字段由 contract.py 校验。

- fetch：请求远处数据后沿原路径返回。
- store：原 A 保留，复制动画结束后缓存内出现另一份 A；过渡中不额外叠第三份。
- hit：只走近处路径，读取后缓存仍保留 A。
- miss：请求 B 时缓存仍是 A，先查询后回源；不假装已经实现具体替换策略。
- summary：稳定构图中重复短路径，帮助收束概念。

这是概念比喻；路径长短和运动时间不代表真实硬件延迟，也不替代缓存一致性、容量或淘汰策略说明。规则在场景、素材在 library、强调动画在 motion、旁白在 audio 中维护。
