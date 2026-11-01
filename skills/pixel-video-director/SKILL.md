---
name: pixel-video-director
description: 把创意或既有文案转成像素视频的可见动作、构图光影、运镜转场与视觉分镜，也可交接结构化工程、出片、审片和定向修复。增强画面感、把抽象观点演出来或迁移参考片手法时使用；制作交接与出片依赖 pixel-game-video。
---

# Pixel Video Director

把观点设计成可见动作、构图光影、运镜转场与分镜；按需交接制作、审片并定向修复。沿用用户已有文案和工程，只交付视觉方案时可停在设计阶段。面向用户的脚本默认按 [脚本表格规范](references/script-format.md) 输出项目基调、片段总览和逐片段多维详情；局部修改仅输出受影响片段，明确覆盖组件选择、风格/组织样式/堆叠、形态材质及可见行为，不留给制作补猜。

## 先选任务

| 当前任务 | 读取与交付 |
| --- | --- |
| 新创意、文案画面化、分镜或局部接镜 | 先确定 [整段理解推进](references/visual-storytelling.md#先确定整段如何推进理解)，再按 [视觉表达](references/visual-system.md) 与 [分镜标注](references/visual-storyboard.md) 设计主体、动作、结果及承接；交付视觉方案即可，不强制建工程或运行 doctor |
| 建工程、制作交接与出片 | 读 [创作合同](references/authoring.md)、[基础依赖与交接](references/handoff.md)；写创作源，交接后由基础技能进入工作台 |
| 续作、审片与定向修复 | 读 [Review 与影响范围](references/review.md)，区分导演源和工作台剪辑分支，沿实际分支修改并核验 |
| 延续计算机口播系列 | 创作前读 [系列要求](references/computing-voiceover.md) 与 [分类、选角和讲解规范](references/character-illustration.md)，需要插画局部动态时再读 [动态设计](references/illustration-motion.md) |

开始制作、续作或复盘时，按 [依赖定位](references/handoff.md) 找到基础技能，读取其 `references/production-principles.md`，将适用的系列偏好与单片限制写入 brief。下面的基础模块路径均相对定位到的 FOUNDATION，不要求固定同级安装。

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
