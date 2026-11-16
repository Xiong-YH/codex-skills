# 创作合同

按 [接稿合同](collaboration.md) 继承编剧已确认的受众、问题、价值和当前完整文案；已有有效确认不重复询问。内容创作规则由编剧维护，导演从视听设计继续。交接工程时，受众写入 brief.audience，问题、价值和实际确认依据写入 brief.constraints，沿用现有字段，不新增运行 schema。已有文案或工程不自动证明选题已确认；续作沿用有效确认。

项目主画风与片段特选按基础层 [画风透传合同](../../pixel-game-video/modules/style/ART-DIRECTION-CONTRACT.md) 记录在 brief.constraints 与镜头 intent。片段有效画风必须将通用描述、人物/物种/背景/道具细化要求、规范版本和样板一起交给制作，不能只交风格名称；组件独立。现有 schema 不新增美术字段，美术 ID 不替换 production-plan.style，解析结果与样板快照为派生交接附件。

前期视觉方案按 [导演四阶段](director-workflow.md) 从模块和草图细化到结构化设计与白模。正式交接时按 [设计格式](script-format.md) 和 [视觉分镜与工程映射](visual-storyboard.md) 对应现有字段。制作视频从基础技能的工作台剪辑并最终导出，镜头、文字、转场、音效与配乐各用独立轨道。

制作交接继承 [全局创作目标](audience-experience.md)，在 brief.constraints 记录情绪与认知目标、开头／核心／收尾、配乐来源和实际入点。执行层在当前剪辑核对开场可读性、主要触点与全片兑现。

新项目默认 `production-plan.shots[].actor: null`，由本镜的组件、物件或情境承担画面。需要人物时在 `visual.subject/action` 写明人物的动作与结果，按 [人物表演](character-performance.md) 选择素材和后端。用 [素材替换](media-replacement.md) 接入完整情境时，复核素材内部的构图与屏幕文字的阅读关系。

四个 JSON 源文件是可独立继续的阶段产物；JSON Schema 在 [schemas/](../schemas/)，运行合同源在 [models.py](../scripts/directorlib/models.py)。`python scripts/director.py check PROJECT` 检查格式与交叉引用。

从编剧交来的路线和完整上屏文案开始，按 [导演四阶段](director-workflow.md) 接稿，再读 [视觉表达方法](visual-system.md)。按 [脚本标注](visual-storyboard.md#脚本中的呈现类型标注) 写明画面呈现、屏幕文字、动作与接镜。新分镜用 storyboard.shots[].visual 记录表达决定，components 记录组件结构、位置和事件，组件文字引用 script.labels。production-plan 的 background/replacement 选择项目素材。check 会列出缺失的 visual 项，新模板空值会阻止交接。

| 文件 | 唯一拥有的内容 | 稳定标识 |
| --- | --- | --- |
| brief.json | 编剧确定的创意、受众、核心观点与约束；导演继承并补视听限制 | id |
| script.json | 叙事段落、屏幕主句、标签与句意。内容修改按协作合同回写 | beats[].id / cues[].id / labels[].id |
| storyboard.json | 镜头顺序与 durationFrames、beatId、表达意图、场景机制、物体位置、事件、文字时间 | shots[].id / events[].id / objects[].id / cues[].cueId |
| production-plan.json | 标题、输出规格、renderBackend、风格、人物与道具素材、文字角色、运镜和声音选择 | id / shots[].id / text[].cueId / audio[].id |

文字用短句表达一个意思，游戏状态变化承载因果；转场服务焦点交接。**面向用户的每份视频脚本必须显式写出接镜／转场**，包括直切、同镜继续与首尾入场／收束；按 [转场标注](visual-storyboard.md#脚本中的呈现类型标注) 写交出、过程、接住和阅读开始条件。设计意图放 `visual.continuity` / `intent`，执行选择归production-plan；候选方案不能冒充可调用配方。不是每镜都需要运镜或音效。保留用户指定角色与表现方向。

阶段三详细设计及正式交接按 [屏幕文字与阅读](visual-storyboard.md#屏幕文字与阅读) 写明用途、位置、层级、显露、稳定阅读区间和实现状态。沿现有 intent 与事件交接。

声音按基础层的 [Garden 工作流](../../pixel-game-video/modules/audio/GARDEN.md) 设计。brief.constraints 记录配乐和音效来源、段落起伏、所用重音和视觉触点。动作和相应音效引用同一分镜事件。确认、碰撞对齐可听起音，换场可对齐掠过声的包络峰或蓄力声的结束点。

`production-plan.audio[]` 可选 [Garden 音色或街机 WAV](../../pixel-game-video/modules/audio/SYNTHESIS.md) 的 `sound`，也可填项目内 PCM `file`。合成参数写 `params`，落点写 `align`，`at` 引用 storyboard 事件。handoff 将 cue 与引用素材交给基础工程。按本片的材质与叙事节奏决定叠层、密度和留白。

`production-plan.renderBackend` 缺省为 `canvas`；显式选 `remotion` 时由 handoff 透传到 project，不复制时间表。先查看基础层 `references/remotion.md` 的能力边界；[12 秒书桌示例](../examples/remotion-focus-desk/README.md) 演示同一套源文件如何交给原生 React 执行器。Canvas 与原生 Remotion 都必须进入工作台完成剪辑与最终导出。Studio、build/film.html 和直接 render 用于源合成调试与一致性对照，不代替工作台分轨编辑、保存和导出验收。

`script.labels` 管理场景内短标签；storyboard 的 params 用 `{"labelId":"goal"}` 引用。handoff 把引用解析成基础合同字符串，源映射仍指向 script。例如：

```json
{"items":[{"label":{"labelId":"goal"},"event":"goal_done"}]}
```

时间只在 storyboard 定义：每镜自动有 enter/exit，本镜事件 frame 是局部整数帧；文字、运动和声音用 `{"event":"s1.choose","offsetFrames":0}` 引用。params 内的场景事件使用本镜 local ID（例如 `choose`）。坐标 x/y 为 0..1 画幅比例；输出规格当前遵循基础层已支持的 1920×1080、60 fps。

新无口播项目用 `script.beats[]` 接住编剧段落。每段填写 `before`、`change`、`result`、`carry` 与 `cueIds`，末段可省略 carry。分镜按段落顺序引用 `beatId`，允许同段连续跨多镜。每个 cue 在自己的叙事段中放置一次，并在 production-plan.text 选择角色。旧工程可沿用已有文案结构。

连续主句用 `subtitle`，无旁白时 `phrases` 留空。需要参与构图的关键词可用 `title` 或 `annotation`，场景内短标签放进 script.labels。需要更长阅读时间时，回改 storyboard 的镜头时长和事件。

配乐与事件音效使用 `audioMode="sfx-only"`。将选定配乐作为 `production-plan.bgm`，`file` 为创作工程内的 48 kHz、16-bit PCM WAV，`at` 与 `end` 引用 storyboard 事件，区间遵循 `[at,end)`。下面示例从首镜入场到末镜退出，使用一段连续配乐。

```json
{"bgm":{"id":"bgm","file":"media/music.wav","at":{"event":"s1.enter"},"end":{"event":"s4.exit"},"gain":0.45,"loop":false,"trimStartSeconds":0,"fadeInFrames":0,"fadeOutFrames":12}}
```

`id` 缺省为 `bgm`，须与 production-plan 的其他对象 ID 区分。按实测拍点填写裁入，按实际段落选循环及淡化，按授权来源填写 `title`、`artist`、`sourceUrl`、`licenseUrl`、`changes`。参数见基础层 [配乐工作流](../../pixel-game-video/modules/audio/MUSIC.md)。handoff 传给 audio.json，复制配乐 WAV 并绑定源文件、复制件与生成参数哈希。修改沿源映射回写。

`init PROJECT` 创建待填写模板，空字段会阻止交接。模板的 `intent` 保持为空，创作时须填写具体镜头意图；`durationFrames=480` 在模板 60 fps 下为 8 秒，仅是结构占位。按 [紧凑节奏与估时](visual-storyboard.md#紧凑节奏与估时) 重估每镜，结合本片目标重设 brief 的总时长范围，不能沿用占位帧数补空白。估时提示只保留在本说明，不写入待填写的 `intent`。`init PROJECT --example` 复制可运行样例，其时长也只属于该示例。`--idea` 只记录创意，写脚本和设计分镜仍由使用 skill 的 agent 完成，不把模板伪装成自动创作结果。

组件从脚本到实现沿 [组件需求描述](visual-storyboard.md#脚本中的组件需求)。设计附件只拥有需求、五维和验证范围，不复制 script 文案或 storyboard 时间；它不由 handoff 自动解释执行。已有字段不能表达的新机制先在基础技能实现和注册适配器，再回填真实能力选择。

## 合同与样例入口

按当前任务选例子，不默认读取全部样例，也不把示例题材、片长或镜头结构当作新片约束。

| 要核对什么 | 创作源或参考 |
| --- | --- |
| 四份源文件与基本选择机制 | [模板](../assets/templates/)、[选择机制](../examples/bounded-choice/brief.json) |
| 缓存事件与场景编排 | [数据旅程](../examples/cache-journey/brief.json)、[人物取数](../examples/cache-adventure/brief.json)；人物真实表演范围仍按基础层能力目录 |
| 无口播全链路与同源白模 | [资料 A 的缓存过程](../examples/beat-driven-cache/README.md) |
| 信息结构与组件组合 | [基础五类](../examples/component-system/brief.json)、[扩展与组合](../examples/component-expansion/brief.json) |
| 原生后端交接 | [原生书桌工程](../examples/remotion-focus-desk/README.md) |
| 完整插画、素材与快照维护 | [插画创作源](../examples/whole-illustration/storyboard.json) 和 [插画动态设计](illustration-motion.md) |

连续组件、选拍与审片方法见 [无口播信息动效与音乐卡点](beat-driven-explainer.md)。
