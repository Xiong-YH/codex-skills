# 模块维护

先选择拥有者，再修改。一个功能只在一个模块实现，其余模块引用 ID 和编译结果。

职责判断、现有文件族与待迁移项见 [七大模块职责与迁移清单](module-ownership.md)。各模块 GUIDE 统一负责职责边界、任务路由与验收重点；原入口的参数、实现和兼容说明保存在模块内 details.md，按任务读取。目标归属不等于实现已搬迁，改动旧路径前先检查调用者。

| 新增内容 | 修改位置 |
| --- | --- |
| 信息卡片与可复用组件 | modules/components；结构/状态合同、绘制器、catalog；自定义按 [设计](../modules/components/DESIGN.md) 与 [实现协议](../modules/components/CUSTOM-RUNTIME.md)，场景适配仍归 scenes；配色字体归 style |
| 风格预设 | modules/style/catalog.json 与风格实现 |
| 可复用视觉素材/原子绘制 | modules/library；身份、目录、尺寸、锚点、来源与解码；现有背景等跨模块资源按迁移清单处理 |
| 文字排版 | modules/text；不改变脚本、镜头总时长 |
| 运镜/转场 | modules/motion；登记参数、目标类型及执行器 |
| 音色 | modules/audio；登记变体范围及生成器 |
| 场景机制 | modules/scenes；参数合同、事件引用和绘制器 |

GUIDE 只解释选型和验收。参数放 catalog/schema，算法放代码，项目内容放 JSON；不要把三者拼成一个 prompt。

统一选型用 `python scripts/video.py catalog 模块 --capabilities`；原 `catalog` 输出保持运行合同。补充说明在各模块 capabilities.json 维护，字段、状态和查询方式见 [能力目录](capability-catalog.md)。新增或移动条目后运行 `python scripts/video.py catalog --capabilities --check` 检查引用；这个命令不执行其列出的测试。

增加 scene/motion ID 时同步其参数验证与运行实现；未知字段要报错。编译器负责公共时间、资源引用和能力校验。修改 models 后重新运行 schemas 导出。

会自行选择环境的场景同步维护 scenes/contract.py 的 background_environments，让编译器覆盖内部切换而不只检查 params.environment。新增代码道具绘制器应扩展 library.hasProp，保证工作台与实际绘制都拒绝未加载的 ID。注册状态判断统一使用 engine/registry.py，目录与编译器不得各写一份。

新增执行器时同步 `engine/dependencies.py` 的场景/配方依赖；预览组装与运行哈希共用该清单。竞赛场景由 `competition-routes.js` 显式选择基础、paced 或全画幅实现，不覆盖其他模块的 draw。可复用纹理与业务动作分别维护，撤回实验移出 skill；导出文件规则统一放在 `engine/delivery.py`。

新增或修改场景、文字、转场与声音能力时，同步检查工作台桥接的单元、props/schema 和实际渲染读取。镜头、文字、转场、音效、配乐按类别独立，不能只补源合成执行器后绕过工作台交付；Canvas runtime 继续复用原模块，不为每种能力复制一套 React 实现。新素材或人物须先进入源工程与编译 payload，再构建导入。

用一个最小项目验证新增能力，并检查中间帧与退出后状态；再验证工作台导入一致性、独立编辑、保存重开、逐轨及成片导出。文字、音效或场景事件变化时，检查该镜字幕、文字排练节奏、运动和音效是否仍一致；排练节奏不生成嘴型。验证产物放忽略的 work/outputs；只跟踪必要证据与源输入。

现阶段按完整项目重建，preview 可缩小渲染区间；没有帧缓存复用或片段自动拼接。不要根据文件夹存在就声明能力可用。
