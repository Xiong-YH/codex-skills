# 创作合同

只交付视觉方案时，可先按 [视觉分镜与工程映射](visual-storyboard.md) 输出设计稿，不强制创建四份 JSON 或调用基础层。用户要求制作、交接或继续已有工程时，以下源文件与时间规则保持唯一；设计稿不新增模型字段或运行时间线。

人物按镜头显式选择：production-plan 中 `actor:null` 表示不出镜。场景、物体与景别可以主导画面，不要求主角常驻。

先保留用户指定的人物职责。用户要求侧边站立口播时，稳定讲述使用原地站位，按已实现能力选择表情；当前 V3 只有静态基准图与动作参考，嘴型/眨眼尚未接入。站立不代表锁死屏幕坐标；强转场可让整个房间、物体和人物统一改变景别，人物自然进出视野。连续背景不可裁成局部缩放窗口；字幕保持独立。局部交接只适用于独立图文或真实面板。延续本项目时，将 [已确认的表达方向](computing-voiceover.md) 中适用的约束带入 brief；具体样例不能覆盖用户的新要求。

四个 JSON 源文件是可独立继续的阶段产物；JSON Schema 在 [schemas/](../schemas/)，运行合同源在 [models.py](../scripts/directorlib/models.py)。`python scripts/director.py check PROJECT` 检查格式与交叉引用。

脚本阶段先读 [视觉表达方法](visual-system.md)。新分镜用 storyboard.shots[].visual 记录表达决定，components 记录组件结构/位置/事件，组件文字仍引用 script.labels。production-plan 的 background/replacement 选择项目素材，操作见 [素材替换](media-replacement.md)。旧工程 visual 可缺省，check 会列出缺项；新模板空值会阻止交接。

| 文件 | 唯一拥有的内容 | 稳定标识 |
| --- | --- | --- |
| brief.json | 创意、受众、核心观点、时长范围、明确约束 | id |
| script.json | 字幕 text、讲解 phrases、句子含义 meaning，以及场景 labels | cues[].id / labels[].id |
| storyboard.json | 镜头顺序与 durationFrames、表达意图、场景机制、物体位置、事件、文字时间 | shots[].id / events[].id / objects[].id / cues[].cueId |
| production-plan.json | 标题、输出规格、renderBackend、风格、人物与道具素材、文字角色、运镜和声音选择 | id / shots[].id / text[].cueId / audio[].id |

文字用短句表达一个意思，游戏状态变化承载因果；转场服务焦点交接。不是每镜都需要运镜或音效。保留用户指定角色与表现方向。

`production-plan.renderBackend` 缺省为 `canvas`；显式选 `remotion` 时由 handoff 透传到 project，不复制时间表。先查看基础层 `references/remotion.md` 的能力边界；[12 秒书桌示例](../examples/remotion-focus-desk/README.md) 演示同一套源文件如何交给原生 React 执行器。Remotion 默认进入 Studio 审片，用户需要成片导出时再 render。

`script.labels` 管理场景内短标签；storyboard 的 params 用 `{"labelId":"goal"}` 引用。handoff 把引用解析成基础合同字符串，源映射仍指向 script。例如：

```json
{"items":[{"label":{"labelId":"goal"},"event":"goal_done"}]}
```

时间只在 storyboard 定义：每镜自动有 enter/exit，本镜事件 frame 是局部整数帧；文字、运动和声音用 `{"event":"s1.choose","offsetFrames":0}` 引用。params 内的场景事件使用本镜 local ID（例如 `choose`）。坐标 x/y 为 0..1 画幅比例；输出规格当前遵循基础层已支持的 1920×1080、60 fps。

script 中每个 cue 都要在 storyboard 放置一次，并在 production-plan.text 选择角色。字幕必须有拼音 phrases；它生成模拟讲述节奏计划，当前 V3 图片尚未据此产生嘴型，也不代表真人配音对齐。新增标签要放进 script.labels，不能在 scene params 复制文字。一个完整句子若需更长阅读时间，回改 storyboard 的镜头时长和事件安排。

有已录制或合成的旁白时，production-plan 使用 `audioMode="narration+sfx"` 与 `narration:[{id,file,at,gain}]`。WAV 路径相对创作工程、48kHz/16-bit PCM；handoff 复制到 video/，同时绑定源素材与复制件哈希。先测语音长度，再安排字幕和动作；不能为压缩示例时长把旁白截断。没有旁白时保留 sfx-only/silent。

production-plan 可用 `speechDuck` 设置旁白期间保留的音效比例，范围0–1，默认0.28；handoff 映射到 audio.json。与每个音效的 level 配合设计，旁白素材和 gain 可独立保持。

`init PROJECT` 创建待填写模板，空字段会阻止交接。`init PROJECT --example` 复制可运行样例。`--idea` 只记录创意，写脚本和设计分镜仍由使用 skill 的 agent 完成，不把模板伪装成自动创作结果。
