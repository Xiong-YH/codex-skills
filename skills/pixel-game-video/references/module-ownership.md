# 七大模块职责与迁移清单

本页用于架构维护时判断内容归属；制作任务从对应模块 GUIDE 按需读取。2026-11-01 完成职责划分、入口整理与首轮交叉内容迁移。表中区分已迁移内容与后续扩展，目标归属不自动成为新增运行能力。

## 分层与职责

任务入口分为三类：pixel-video-writer 管选题、叙事、逐字文案与内容自查；pixel-video-director 管视听表达、分镜、制作统筹与创作 review；pixel-game-video 管工程制作与技术交付。编剧可独立交付文案，导演从当前完整文案继续，不将视觉表设为编剧完成前提。七大模块提供能力，公共执行层负责合同、统一事件时间线、编译、后端适配及工作台桥接。工作台负责独立剪辑分支与最终导出，不是第八个能力模块。

| 模块入口 | 唯一负责 | 输入与输出关系 | 不在本模块决定 |
| --- | --- | --- | --- |
| [style](../modules/style/GUIDE.md) | 色彩、字体角色、像素尺度、材质、光影与视觉规范 | 提供风格预设；供其他模块读取 | 具体素材身份、剧情、人物站位和镜头时间 |
| [library](../modules/library/GUIDE.md) | 可复用视觉素材的身份、尺寸、锚点、变体、来源与原子绘制 | 提供素材 ID 与资源；由场景/组件实例化 | 系列讲述者、动作时序和业务状态；声音资源仍归 audio |
| [components](../modules/components/GUIDE.md) | 可组合视觉单元的结构、局部状态、表现与行为 | 读取风格和素材，消费事件，提供局部视觉单元 | 整镜叙事、公共时间线、通用相机与混音 |
| [text](../modules/text/GUIDE.md) | 排字、测量、换行、字幕/标签布局与文字安全区校验 | 消费文案、事件区间与风格皮肤，输出独立文字层 | 改写脚本、延长镜头或生成口型 |
| [motion](../modules/motion/GUIDE.md) | 通用运动、缓动、相机、转场、遮挡与几何反馈 | 消费目标与编译进度，提供运动/合成结果 | 状态含义、资源守恒、声音选型与独立计时 |
| [audio](../modules/audio/GUIDE.md) | 声音资源、事件音效、旁白导入、配乐与混音 | 消费共享事件，输出声音与实际混音记录 | 视觉状态、自动配音、按动作强制发声 |
| [scenes](../modules/scenes/GUIDE.md) | 空间布局、对象关系、叙事状态与跨模块编排 | 组合其他模块，消费项目事件，输出场景状态/画面 | 复制原子素材、排字器、通用运动或混音实现 |

表中关系是职责分工，不是新增 API。当前字段与后端支持仍以 [制作合同](contract.md)、各模块 catalog/合同及编译器为准。

## 现有文件与目标归属

此表按文件族覆盖现有实现、文档与素材；具体单片内容继续保留在 examples 或项目中。标为“保留”的文件不需要为目录整齐而搬动。

| 现有位置/文件族 | 现状与交叉点 | 目标归属及后续动作 | 本轮状态 |
| --- | --- | --- | --- |
| 七模块 `GUIDE.md` | 选型、参数、历史与实现说明混排 | GUIDE 负责职责、边界、任务路由与验收重点；原入口细节保存在各模块 `details.md` | 已整理；components 原本已为路由，不另拆细节页 |
| `style/catalog.json`、预设 JSON | 原先与背景 environment、presenter 布局耦合 | 美术字段留 style；布局与素材选择进入 scenes/layouts；catalog 的 scenePreset/sceneRuntime 负责兼容选择，由公共层合成运行配置 | 已拆分五套布局；VideoSpec 字段不变 |
| `style/runtime.js`、`cyberpunk.js`、`pixel-*.js` | 风格帮助、面板与具体环境绘制原先混合 | 具体夜城/计算/研途背景执行器进入 scenes/backgrounds；面板皮肤、日光程序后备和中性底色仍留 style | 已拆环境执行器；程序后备不机械搬迁 |
| 原 `style/assets/`、提示词和背景来源记录 | 具体背景素材与风格样板原先一起分发 | 原图、提示词、来源与 ID 目录统一在 library/backgrounds；美术样板解读留 style，引用同一原图 | 已移动且不重编码；构建、锁、例子与测试引用已更新 |
| `style/ART-DIRECTION.md` | 美术基调、空间设计和项目素材接入原先混合 | 美术规范留 style；空间设计进入 scenes/SPACE-DESIGN.md，媒体合同进入 scenes/MEDIA.md | 已拆分；旧锚点继续路由 |
| `library/catalog.json`、`characters/`、`prepare.py`、`computing.js`、`education.js` | 人物/物体身份、图像和原子绘制 | 保留 library；素材集身份与适用范围继续跟随原素材，系列讲述者与姿势由项目/导演系列文件维护 | 保留；人物库入口已去除重复系列要求 |
| `library/CHARACTERS.md`、原 `PRESENTER-ACTIONS.md` | 素材能力、表演接入和系列口播限制原先交叉 | 人物身份/变体留 library；事件合同进入 scenes/PRESENTER-ACTIONS.md；固定姿势等系列偏好只引用当前项目 | 已拆分；library 旧入口为兼容链接 |
| `library/runtime.js`、`actor-performance.js`、原 `presenter-actions.js` | 原子放置与事件姿态适配原先同目录 | 静态放置代理留 library；事件姿态执行器进入 scenes/presenter-actions.js；公共依赖清单按新路径加载 | 已迁移事件适配，原像素与运行接口不变 |
| `components/contract.py`、catalog、`runtime.js`、`plain.js`、`style-layers.js` | 信息组件结构和表现 | 保留 components；消费 style 规范，不把机械/能量行为挪成全局风格 | 保留 |
| `components/apparatus.js`、`fusion-component.js`、`object-components.json` | 独立物体组件与十二类 `shot.components.kind` 路径不同 | 保留 components；明确调用路径与可用范围，不虚构新 kind | 保留 |
| `components/BASIC-COMPONENTS.md`、`DESIGN.md`、`INFORMATION-COMPONENTS.md`、`OBJECT-COMPONENTS.md`、`REFERENCES.md` | 基础合同、设计方法和参考图 | 保留 components；通用动作时长引用 motion，不复制规则 | 保留 |
| `text/runtime.js`、catalog、`narrative-progress.js`、`NARRATIVE-PROGRESS.md` | 排字与叙事覆盖层 | 保留 text；风格给皮肤，项目给标签和事件；系列选择归项目 | 保留 |
| `motion/runtime.js`、`staging.js`、`content-handoffs.js`、`narrative-transitions.js`、`handoffs.py`、recipes/catalog | 通用运动与转场，部分为空间专用实现 | 保留 motion；专用能力不能仅因存于 motion 就宣称通用 | 保留 |
| `motion/game-feedback.js` | 几何、缓动、回弹、角标和粒子辅助 | 保留 motion；业务状态和资源规则由 scenes 拥有 | 保留 |
| `motion/TIMING.md` | 原入口内的通用离散动作与节拍规则 | 独立保留在 motion；components 的设计/基础规则直接引用，旧 GUIDE/details 锚点转发 | 已归一；没有新增组件计时表或公共运动 API |
| `audio/` catalog、WAV 母版/manifest、Python 音源/导入/混音工具、ARCADE/MUSIC/VOICES、试听页 | 声音素材与执行 | 保留 audio；历史音色与正式可选库分开，生成配音不因资料存在而成为能力 | 保留 |
| `scenes/catalog.json`、`contract.py`、`runtime.js`、各场景 JS/MD | 状态机制、场景绘制与局部专用效果 | 场景状态/布局留 scenes；发现重复原子能力时才提取至相应模块 | 保留，重复实现待逐项核对 |
| `scenes/GAME_FEEL.md`、`competition-feedback.js`、`competition-*.js` | 通用反馈索引与竞赛专用实现 | 通用页只讲状态与模块协作；固定数量/路径由 competition-routes 专用合同与实现维护，新场景自行定义规则 | 已去除通用页中的单片限制和重复数值；专用执行器保持兼容，尚未泛化为通用参数 |
| `scenes/media.js`、`whole-illustration.md`、`character-illustration.md`、`performance.py` | 素材接入、完整插画及模拟讲述节奏 | 接入/状态编排留 scenes；插画单片创作源留 director 工程，基础例子是有哈希的独立快照，不另复制成通用素材库 | 保留源/快照关系及能力缺口；未来确有跨项目素材复用再提取 library |
| 各模块 `assets/`、`examples/`、参考图与生成脚本 | 选型证据与可运行试样 | 行为示例及能力专属图层跟随能力拥有者，公共视觉资源归 library，音频母版归 audio | 背景引用已迁移；组件专属资源与单片衍生快照不为目录整齐搬迁 |

## 公共层与规则归属

| 内容 | 唯一归属 | 其他位置的处理 |
| --- | --- | --- |
| 四份 VideoSpec、共享事件/资源/后端校验 | `engine/models.py`、`compiler.py`、`backend_caps.py` 与生成 schema；说明见 [合同](contract.md) | 模块补充本地合同，消费编译结果，不自建全片时间表 |
| 运行依赖、构建、媒体解析、交付打包 | `engine/dependencies.py`、`builder.py`、`media.py`、`delivery.py` 等 | 模块声明所需能力/资源，不复制打包逻辑 |
| Canvas/Remotion 适配与工作台桥接 | `engine/canvas_workbench.py`、`workbench_bridge.py`、`remotion_backend.py`、`engine/remotion/` | 两后端能力范围分别记录，不为接入工作台复制整套 React 实现 |
| 工作台编辑、保存、导出 | `workbench/`；[工作台说明](workbench.md) | 各模块只补充能力验收，不重复全套交付流程 |
| 核心通用要求、常见踩坑与沉淀方式 | [制作总则](production-principles.md) | 制作先读唯一摘要；技术细节归模块，原话/版本/认可证据归历史 |
| 选题、叙事、文案、观众目标与内容交接 | writer 的 SKILL.md、references/script-workflow.md、audience-experience.md、handoff.md；项目内容源 | 导演继承当前版本，旧编剧参考页只作兼容路由，不复制规则 |
| 系列偏好、创作源、review | director 的 `references/computing-voiceover.md`、创作/审片合同；单片 brief/review | 基础 skill 独立使用时由项目提供，不硬依赖 director 相对路径 |
| 历史认可与失败记录 | [迭代记录](iteration-history.md) | 现行模块保留必要限制和链接，不复制历史叙述 |

## 本轮迁移与后续验证

1. 背景与布局已拆分：配置解析、构建与依赖锁共用 selected_style/visual_asset_files，工作台消费同一合成 payload。正式原图已迁移，旧自定义 style.assets 仍兼容且限制在模块内部。
2. 人物事件执行器与合同已归 scenes；素材、锚点与原子放置留 library。固定姿势的系列偏好由项目提供，口型缺口没有因此消失。
3. 组件动作含义留 components，通用节拍归 motion/TIMING.md。现有几何反馈与业务场景本就分开，未为了目录结构添加新 API。
4. 通用反馈页已移除单片限制和重复数值，专用数量留在明确命名的竞赛合同/执行器。将其泛化为跨主题参数属于能力扩展，需另做合同与场景验证，不能仅挪常量冒充完成。

每项迁移先检查调用者与路径，再验证最小工程、关键帧、工作台桥接与独立工程构建；遵守 [模块维护](module-development.md)。本次架构核验与真实剪辑、连续播放和听音分别记录，不把回归测试当作新的成片验收。

## 统一能力目录

第 4 项通过 [能力查询入口](capability-catalog.md) 落地。七模块各自的 capabilities.json 维护补充说明，公共层组合现有运行 catalog、背景目录、独立组件目录及工作流说明；不复制参数总表，不增加运行注册项。后端、工作台编辑/导出方式、文档/示例/测试入口使用统一字段，原生白名单与编译器、工作台支持判断共用。

目录检查只核验引用与元数据，查询始终保留未运行测试/未审片状态；缺少测试源码的独立交付包明确报告省略项。旧 catalog 输出仍作为原合同接口。

## 技能入口与详细规则

两个原 SKILL.md 已收拢为任务路由、七模块入口与关键约束；新增编剧入口只加载内容规则，导演/基础入口保留各自制作能力。基础入口直接链接本包模块，导演入口通过 handoff 定位 FOUNDATION，再读取其模块路径；基础技能独立安装不依赖导演文件。

| 内容 | 详细规则归属 | 入口保留的职责 |
| --- | --- | --- |
| 通用原则与要求层级 | [制作总则](production-principles.md) | 制作、续作和复盘先读；按当前项目应用偏好 |
| 工程字段与统一事件 | [制作合同](contract.md)；导演的 references/authoring.md | 四份输入/创作源分工、源映射回改与时间线唯一 |
| 画面叙事、接镜与参考片 | 导演的 references/visual-storytelling.md、visual-storyboard.md | 设计先确定理解推进，逐镜显式标注交出、接住和落稳 |
| 系列选角、固定姿势、插画分类与讲解 | 导演的 references/computing-voiceover.md、character-illustration.md | 该系列创作先读所属要求，其他项目不自动继承 |
| 后端、参数与能力缺口 | [能力目录](capability-catalog.md)、各模块 GUIDE 与合同 | 按任务选模块，区分已注册、试样、设计索引与未实现项 |
| 工作台、分轨与交付 | [工作台](workbench.md)、[制作流程](production-workflow.md)；导演的 references/handoff.md | 必须工作台剪辑/导出、独立剪辑分支、实测编辑与保存重开、配对交付 |
| 审片与历史反馈 | 导演的 references/review.md；[迭代记录](iteration-history.md) | 实际播放、核字与听音绑定当前版本，未审保留 not_reviewed |
| 创作源示例与素材维护 | 导演的 references/authoring.md 样例入口、character-illustration.md | 按任务找例子，不在主入口列整套案例或复制历史 |

本次角色拆分调整技能描述、任务路由、内容规则归属与创作器展示；不修改工程命令、VideoSpec、时间线合同或已确认素材。引用与元数据核验不等同于新的视频运行或审美验收。
