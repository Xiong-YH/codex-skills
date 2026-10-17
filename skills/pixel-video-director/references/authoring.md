# 创作合同

人物按镜头显式选择：production-plan 中 `actor:null` 表示不出镜。场景、物体与景别可以主导画面，不要求主角常驻。

四个 JSON 源文件是可独立继续的阶段产物；JSON Schema 在 [schemas/](../schemas/)，运行合同源在 [models.py](../scripts/directorlib/models.py)。`python scripts/director.py check PROJECT` 检查格式与交叉引用。

| 文件 | 唯一拥有的内容 | 稳定标识 |
| --- | --- | --- |
| brief.json | 创意、受众、核心观点、时长范围、明确约束 | id |
| script.json | 字幕 text、讲解 phrases、句子含义 meaning，以及场景 labels | cues[].id / labels[].id |
| storyboard.json | 镜头顺序与 durationFrames、表达意图、场景机制、物体位置、事件、文字时间 | shots[].id / events[].id / objects[].id / cues[].cueId |
| production-plan.json | 标题、输出规格、风格、人物与道具素材、文字角色、运镜和声音选择 | id / shots[].id / text[].cueId / audio[].id |

文字用短句表达一个意思，游戏状态变化承载因果；转场服务焦点交接。不是每镜都需要运镜或音效。保留用户指定角色与表现方向。

`script.labels` 管理场景内短标签；storyboard 的 params 用 `{"labelId":"goal"}` 引用。handoff 把引用解析成基础合同字符串，源映射仍指向 script。例如：

```json
{"items":[{"label":{"labelId":"goal"},"event":"goal_done"}]}
```

时间只在 storyboard 定义：每镜自动有 enter/exit，本镜事件 frame 是局部整数帧；文字、运动和声音用 `{"event":"s1.choose","offsetFrames":0}` 引用。params 内的场景事件使用本镜 local ID（例如 `choose`）。坐标 x/y 为 0..1 画幅比例；输出规格当前遵循基础层已支持的 1920×1080、60 fps。

script 中每个 cue 都要在 storyboard 放置一次，并在 production-plan.text 选择角色。字幕必须有拼音 phrases；它驱动模拟讲述嘴型，不代表真人配音对齐。新增标签要放进 script.labels，不能在 scene params 复制文字。一个完整句子若需更长阅读时间，回改 storyboard 的镜头时长和事件安排。

`init PROJECT` 创建待填写模板，空字段会阻止交接。`init PROJECT --example` 复制可运行样例。`--idea` 只记录创意，写脚本和设计分镜仍由使用 skill 的 agent 完成，不把模板伪装成自动创作结果。
