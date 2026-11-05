---
name: pixel-video-director
description: 接手完整文案，拆大模块和片段，以大白话及可弃用线框草图讨论，再共同迭代结构化设计与动态白模，统筹正式制作和审片。分镜、片段衔接或观看体验设计时使用；选题文案归 pixel-video-writer，正式执行归 pixel-game-video。
---

# Pixel Video Director

**核心要求：镜头描述与实际动效一致。** 新增或修改镜头前必读[动态规范与兑现合同](references/motion-direction.md)，结合 FOUNDATION 的可执行 HTML 与共用曲线设计焦点、运动、落稳和阅读；交接到真实配方及事件，出片逐项核对。不能只写运镜形容词、靠静态参考猜效果，或用近似动画替代已采用的方案。固定镜头可明确写固定，不要求每镜都有运镜。

**创作前必读：** 生成或修改视觉脚本、分镜和视听编排前（局部修改也适用），先按 [依赖定位](references/handoff.md) 找到 FOUNDATION，读取其 `references/production-principles.md`，落实核心通用要求及本次相关踩坑。只做分镜不要求建工程或运行 doctor。

**已确认要求主动继承：** 后续新片的普通字幕遵循 FOUNDATION `modules/text/SOFT-HIGHLIGHT.md` 的制作默认，由 Agent 落实到设计、工作台选型及成片审查；特殊表达或既有有效约定使用其他方案时写明具体依据，不等使用者再次提醒。只交设计时仍明确本片采用及例外，制作接手后核对实际调用。

**职责与接稿：** 导演对全片观看体验负责，接手编剧的完整文案，自主完成视听设计、制作统筹与创作审片。选题、观点、论据和逐字文案归 pixel-video-writer；新创意先路由编剧，已有文案按 [协作定位与接稿](references/collaboration.md) 继续。继承“帮谁、问题、价值”的真实确认，不因角色切换重问；方向变化才确认受影响部分。

**命令结果边界：**check 只查创作结构与引用；handoff 只查基础输入。visual/intent 不自动执行，成功不代表动作兑现或视听通过。最终工作台成片用 [Review](references/review.md) 的 workbench-review-init / workbench-review-check 绑定同次导出 JSON 与 MP4；原 review-check 只审导演源合成分支。

**交付前必查：**生成或修改视觉脚本前，必读 [文画对应检查](references/visual-storytelling.md#把讲述推进落实到画面)；制作涉及离散组件动作时，必读 FOUNDATION 的 `modules/motion/TIMING.md`；审片必按 [推进与节奏复核](references/review.md#推进节奏与观看距离的复核) 执行。将检查结果写入当前镜头设计或审片记录，并在交付结论中简记检查范围和未关闭项。缺少文画对应、焦点顺序或动作/阅读安排的设计先补齐，不标可交接；尚未播放的成片不标视听通过。具体判据只在链接目标维护。

按 [导演四阶段](references/director-workflow.md) 执行：**拆大模块 → 大白话与构思草图 → 结构化设计＋动态白模 → 正式制作与审片**。阶段二给静态线框、火柴人和运动箭头，明确只是辅助理解的参考，后续可不采纳；用户明确要求单独继承。阶段三独立选择方案，把原多维检查与可播放白模放在同一迭代中。局部只改受影响片段及关联接镜，不逐镜增加审批。

观众目标、开头/核心/收尾及情绪认知路线从项目继承。需要改主张、论据或关键路线时返回编剧，在唯一内容源修订。当前 [工作台](references/script-review-workspace.md) 默认单片段查看，完整设计按需展开；草图不自动转成动画，描述改变后相关预览待复核。动态播放和样板 WebM 使用 [设计数据](references/director-project.md)，不能代替最终成片。

已有 [同一入口和 JSON](references/script-creator.md) 继续使用；编剧文案保留另一视图，导演实际进度由 stages.director.phase 表示。旧项目和草稿保留，未提供的新设计不从旧稿猜测。纯文案交编剧即可，纯设计按所需阶段交付，不强制正式出片。

新脚本与分镜先按 [镜头数量与合并原则](references/visual-storyboard.md#镜头数量与合并原则) 合并连续解释任务，再按 [紧凑节奏与估时](references/visual-storyboard.md#紧凑节奏与估时) 规划文案、动作和镜头预算；用户指定的节奏、已有工程约束及实际旁白优先。模板帧数只作结构占位，创作时须重新估时。

## 先选任务

| 当前任务 | 读取与交付 |
| --- | --- |
| 只有新创意、需要完整文案或内容改写 | 按 [协作定位](references/collaboration.md) 转编剧；已确认内容直接沿用，不先生成分镜 |
| 已有文案画面化、分镜或局部接镜 | 从当前文案和路线按 [导演四阶段](references/director-workflow.md) 继续，再读 [视觉表达](references/visual-system.md) 与 [分镜标注](references/visual-storyboard.md)；不要求重写文案或完成制作 |
| 建工程、制作交接与出片 | 读 [创作合同](references/authoring.md)、[基础依赖与交接](references/handoff.md)；写创作源，交接后由基础技能进入工作台 |
| 续作、审片与定向修复 | 读 [Review 与影响范围](references/review.md)，区分导演源和工作台剪辑分支，沿实际分支修改并核验 |
| 延续计算机口播系列 | 创作前读 [系列要求](references/computing-voiceover.md) 与 [分类、选角和讲解规范](references/character-illustration.md)，需要插画局部动态时再读 [动态设计](references/illustration-motion.md) |

制作、续作或复盘同样先读该总则；制作时将适用的系列偏好与单片限制写入 brief。下面的基础模块路径均相对定位到的 FOUNDATION，不要求固定同级安装。

## 按七大模块落设计

| 模块 | 导演决定 | 基础能力入口 |
| --- | --- | --- |
| style | 像素语言、构图、光影与视觉层级 | `modules/style/GUIDE.md` |
| library | 需要哪些人物、道具、背景与素材变体 | `modules/library/GUIDE.md` |
| components | 用什么信息结构、实体与局部状态解释观点 | `modules/components/GUIDE.md` |
| text | 讲解、字幕、标签及阅读顺序；文字留在 script | `modules/text/GUIDE.md` |
| motion | 主体运动、相机、交出/接住与落稳；设计转场时先查库 | `modules/motion/GUIDE.md` |
| audio | 旁白安排、必要声音触点与配乐关系 | `modules/audio/GUIDE.md` |
| scenes | 空间、对象关系、机制与人物/无人镜头的编排 | `modules/scenes/GUIDE.md` |

制作前按交接流程运行对应后端的 doctor，再用 `python FOUNDATION/scripts/video.py catalog MODULE --capabilities` 核对调用方式、后端、编辑边界及示例；参数按模块合同读取。只读本次模块与选中的配方。新组件外观及素材生成按 FOUNDATION 的 `modules/style/COMPONENT-ART.md` 共同画风执行。背景/片段接入另读 [素材替换](references/media-replacement.md)，未知机制先补实现并验证。

## 创作与交付约束

- 场景美术按基础层 `modules/style/ART-DIRECTION-CONTRACT.md`：项目选主画风，特殊片段可明确特选；逐镜列明有效画风和回归承接。按同一有效规范展开人物、物种、背景、道具的细化提示词与参考图，不能分支各选。组件独立，不继承场景画风。规范版本与实际使用样板随项目快照交接；不得将美术目录 ID 当作引擎 style ID。

- 每镜明确新增理解、主体状态变化与前后承接。用到组件时，按 [组件需求描述](references/visual-storyboard.md#脚本中的组件需求) 说明信息、初态、触发、变化、结果和保留关系；沿 FOUNDATION 的 `modules/components/DESIGN.md` 判断复用或定制，不要求用户先定义组件。脚本按分镜规范标注片段类别、画面呈现、声音安排及字幕形式（位置、重点、显露与收束）；接镜必须写交出、过程、接住和落稳阅读，直切、同镜继续及首尾也标注。
- 工程只维护 `brief / script / storyboard / production-plan` 四份创作源：目标与限制、文案、镜头时间/事件、能力选择分别归位。入口为 [scripts/director.py](scripts/director.py)；`check` 后 `handoff` 生成 VideoSpec，生成文件沿源映射回改，不静默覆盖手改内容。
- 脚本先审完整语义单元与阅读连续性；有插画人物时，母图先与基准并排检查整体比例，通过后才制作动画。两项按 [Review](references/review.md) 的前置审查执行，最终合成另行复查。
- 创作方案、参考素材、已实现能力与审过的成片分别记录。分析参考片必须看实际画面，运动与转场核对连续片段或前后帧；无法核实时明确未确认内容。示例与参考片不固定新片的题材、角色、构图、片长或镜头顺序。
- 出片前必读 FOUNDATION 的 `references/workbench.md`，在工作台完成分轨剪辑和最终导出；不能以 Studio 或直接 render 代替。保存的工作台 JSON 是独立剪辑分支，不自动回写导演源，继续前先确认使用哪一份源。
- 主动打开工作台并提供地址，交付 MP4 与同次导出项目 JSON。按交接与 Review 合同实测编辑、保存重开及导出，再连续观看、核字和听音；证据绑定当前输入/剪辑项目与成片哈希，未检查项保留 `not_reviewed`。剪映草稿按需从基础技能的 `references/jianying-export.md` 进入。

样例用于核对合同和设计方法，入口见 [创作合同](references/authoring.md) 与 [视觉叙事](references/visual-storytelling.md)；人物插画及其素材/快照按 [插画规范](references/character-illustration.md) 维护。系列规则和历史反馈留在所属记录，不在本入口另存一套。
