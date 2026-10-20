# 创作合同

只交付视觉方案时，可先按 [视觉分镜与工程映射](visual-storyboard.md) 输出设计稿，不强制创建四份 JSON 或调用基础层。用户要求制作、交接或继续已有工程时，以下源文件与时间规则保持唯一；设计稿不新增模型字段或运行时间线。

人物按镜头显式选择：production-plan 中 `actor:null` 表示不叠加库人物，完整插画或片段内部仍可自带人物。不是所有画面都要有小人；场景、物体与组件可以独立主导画面。

先区分讲述者与插图角色：production-plan.shots[].actor 是侧边讲述者槽位；“第一镜放配角”只决定画面内容，不自动更换讲述者或给配角分配台词。配角通过项目插图/场景素材出现，不自动复制成第二个侧边主持人。角色 ID 和库内姓名供内部选材，不能自动生成姓名条。计算机口播系列的当前规则按 [已确认的表达方向](computing-voiceover.md) 带入 brief；历史样例不能覆盖新要求。

该系列全片由一个主角承担旁白，包括开场疑问；口播期间保持同一身体、头部、手臂与站位，只做局部开闭嘴。当前整图姿态执行器不能满足局部口型要求；需要同一底图的开闭嘴素材与实际适配，不能用四五种全身动作替代。站位固定不限制完整场景的合理运镜；连续背景不可裁成局部缩放窗口，字幕和顶部矩形进度条保持独立。

系列工程在 brief.singleNarrator 声明 narrator 素材 ID 和 hiddenCharacterNames。check/handoff 会拒绝侧边讲述者换成配角、全身 performance 序列，以及字幕/标签泄露内部姓名。此结构校验不能替代对插图烘焙文字、真实声源和局部嘴型的视听检查。Canvas 支持剧情用途的事件姿态与顶部进度，Remotion 尚不支持这两项，会在交接校验时拒绝；Remotion 当前人物使用静态基准图，局部嘴型尚未接入。

在分镜 `visual.subject/action` 写明口播讲述、情境演绎或无人镜头的职责。本系列有人的情境插画按 [主角优先](character-illustration.md#插画选角主角优先) 选角，多人或明确条件需要时再安排配角，情境角色不必跟随旁白张嘴；插图集合只参考风格与演绎方法，不作为必用模板。完整人物与场景先成立，再制作情境关键姿态；完整插画按 replacement 接入，见 [情境插画](character-illustration.md)。拆头拼身试样已撤回。

本系列先按 [片段分类](character-illustration.md#先分片段类别再安排声音) 区分普通内容与特殊插画，声音独立安排。选为插画的镜头须是整屏完整情境，不同时安排侧边主持人、标题栏或右侧配图窗口，详见 [镜头形态与验收](character-illustration.md#本系列的插画镜头整屏情境)。即使 production-plan 已写 `actor:null`，也须检查 replacement 媒体内部的最终构图，避免把主持人和侧栏预先烘焙进视频后绕过结构校验。普通操作演示使用完整画面或关闭主持人，不因此成为插画。

插画的 [具体配套讲解](character-illustration.md#插画必须有具体配套讲解) 写入 script.cues，并在 storyboard 放置对应字幕事件、production-plan.text 指定字幕角色。`sfx-only` 或无人声只影响音频，不得据此删除插画讲解字幕；画面含义、文案和阅读时段要能相互对应，不新增模型字段。

四个 JSON 源文件是可独立继续的阶段产物；JSON Schema 在 [schemas/](../schemas/)，运行合同源在 [models.py](../scripts/directorlib/models.py)。`python scripts/director.py check PROJECT` 检查格式与交叉引用。

脚本阶段先读 [视觉表达方法](visual-system.md)，对用户交付按 [脚本标注](visual-storyboard.md#脚本中的呈现类型标注) 分别写明片段类别、画面呈现和声音安排，不将旁白或组件与插画混作同层级类别；本系列插画按 [片段设计要求](character-illustration.md#从脚本到插画片段) 写出可制作的状态、动作与承接。新分镜用 storyboard.shots[].visual 记录表达决定，components 记录组件结构/位置/事件，组件文字仍引用 script.labels。production-plan 的 background/replacement 选择项目素材，操作见 [素材替换](media-replacement.md)。旧工程 visual 可缺省，check 会列出缺项；新模板空值会阻止交接。

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

有已录制或合成的旁白时，production-plan 使用 `audioMode="narration+sfx"` 与 `narration:[{id,file,at,gain}]`。WAV 路径相对创作工程、48kHz/16-bit PCM；handoff 复制到 video/，同时绑定源素材与复制件哈希。导入后按实际语音区间精调字幕和动作；不能为压缩示例时长把旁白截断。没有旁白时保留 sfx-only/silent。

配音生成已移出制作流程，不自动打开剪映或调用其他 TTS。先完成脚本、分镜与工作台粗剪；已有旁白可作为素材导入，需要生成新配音时另行确定处理方式。没有旁白不阻塞画面制作。

production-plan 可用 `speechDuck` 设置旁白期间保留的音效比例，范围0–1，默认0.28；handoff 映射到 audio.json。与每个音效的 level 配合设计，旁白素材和 gain 可独立保持。

配乐使用可选的 `production-plan.bgm` 单对象；不配乐时省略或设为 `null`。`file` 是创作工程内的 48kHz/16-bit PCM WAV，`at` 与 `end` 必须引用 storyboard 事件，区间遵循 `[at,end)`，不能另写配乐秒数表。例如：

```json
{"bgm":{"id":"bgm","file":"media/music.wav","at":{"event":"s1.enter"},"end":{"event":"s4.exit"},"gain":0.18,"loop":true,"trimStartSeconds":0,"fadeInFrames":60,"fadeOutFrames":90,"speechDuck":0.25}}
```

`id` 缺省为 `bgm`，须与 production-plan 的其他对象 ID 区分，保证源映射可唯一定位；`gain` 与配乐自己的 `speechDuck` 范围为 0–1，默认分别为 0.18、0.25；后者设置旁白期间保留的配乐比例，与音效的顶层 `speechDuck` 分开。`loop` 默认 true；`trimStartSeconds` 默认 0；淡入/淡出为非负整数帧，默认 60/90。片段不足时可循环，关闭循环则需有足够素材覆盖所选区间。`title`、`artist`、`sourceUrl`、`licenseUrl`、`changes` 是可选署名记录，缺省为空串，按实际素材来源填写。handoff 原样传给 audio.json，复制配乐 WAV 并绑定源文件、复制件与生成参数哈希；沿源映射回改 BGM 对象。`silent` 模式拒绝显式配乐。

`init PROJECT` 创建待填写模板，空字段会阻止交接。`init PROJECT --example` 复制可运行样例。`--idea` 只记录创意，写脚本和设计分镜仍由使用 skill 的 agent 完成，不把模板伪装成自动创作结果。
