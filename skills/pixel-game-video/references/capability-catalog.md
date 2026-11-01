# 七大模块能力目录

从基础 skill 根目录运行。旧 `catalog [模块]` 继续返回原运行目录；增加 `--capabilities` 后返回统一选型视图，不改变可执行 ID、VideoSpec 字段或后端支持范围。

## 按任务查询

```text
python scripts/video.py catalog --capabilities
python scripts/video.py catalog components --capabilities
python scripts/video.py catalog --capabilities --backend remotion
python scripts/video.py catalog audio --capabilities --status legacy
python scripts/video.py catalog --capabilities --status not_implemented
python scripts/video.py catalog --capabilities --id object.resource-bundle-into-tray.v1
python scripts/video.py catalog --capabilities --check
```

模块名为 style、library、components、text、motion、audio、scenes。`--id` 精确匹配；模块、状态与后端可组合筛选。ID 不存在时报错，存在但被其他条件排除时返回空列表。`--check` 检查完整目录，不能与筛选组合；它不执行测试。

## 每条记录回答什么

| 字段 | 含义 |
| --- | --- |
| id / module / kind | 查询标识、能力拥有者和分类；背景 ID 仍可保留历史 style 前缀，但拥有者为 library |
| status / sourceStatus | 统一的实现/注册状态与原始状态；素材的历史认可不自动变成本片审片通过 |
| source | 原运行目录或工作流说明的来源，以及相关本地资源路径 |
| invocation | 实际字段、命令或独立试样入口；先读这里，再使用 ID |
| backends | Canvas 与原生 Remotion 各自是否支持及适用范围；仍需满足项目组合合同 |
| workbench | 编辑方式、所属轨道、是否独立片段及导出边界 |
| references | 文档、示例、测试源码，均相对 skill 根目录 |
| notes | 模块限制与条目说明，并保留原目录中的选型优先级、撤回原因和替代建议 |
| verification | 查询不运行测试、不播放和听音，始终返回 not_run / not_reviewed；测试文件存在只是参考/覆盖入口 |

场景、人物、组件、声音与运动的 ID 不全部写在同一个字段。信息组件写 kind，文字写 role，工作流按 invocation 配置。新增的 `audio.narration-import.v1`、`text.narrative-progress.v1` 等是**查询标识**，不是新增 sound、scene 或 motion recipe。

## 状态与编辑方式

| status | 表示什么 |
| --- | --- |
| registered | 已在现有运行目录注册，包括由场景预设引用的背景 ID；不保证任意项目组合都可用 |
| workflow | 通过现有字段或命令完成的流程/特性，不是新的可执行目录项 |
| legacy | 保留给旧工程重建的兼容能力；不自动作为新片首选 |
| standalone | 仅独立 HTML/Canvas 试样可运行，尚未作为 VideoSpec 能力接入工作台 |
| unavailable | 已撤回或不可调用的运行目录项 |
| not_implemented | 已知能力缺口，没有执行器 |

原运行目录中的 planned、draft 会归入 unavailable，sourceStatus 保留原值；目录与编译器共用注册状态规则，不能仅因条目存在就标为已注册。

`--backend canvas` 会包含可在 Canvas 独立运行的试样，应继续核对 status 和 workbench，不能将其视作已接入制作工程。原生 Remotion 结果直接使用 backend_caps 的执行白名单：当前只有 pixel-editorial、focus-desk、主角静态基准图、两种运动以及共用的文字/声音流程，组合约束仍由编译器检查。

| workbench.editing | 编辑与交付范围 |
| --- | --- |
| project-config | 修改源配置后重建；不是独立轨道，例如风格与预设背景选择 |
| shot-props | 在镜头属性中编辑；组件、道具、姿态、相机等跟随镜头导出，不各自成为独立轨道 |
| text-track | 字幕与其他文字的独立片段 |
| transition-track | 转场独立片段 |
| audio-track | 音效、旁白或配乐的独立片段，具体看 track |
| overlay-track | 叙事进度等独立覆盖片段 |
| not-integrated | 没有对应工作台能力，不能据此承诺编辑或导出 |

编辑入口与片段是否独立分别由 editing、independentTrack 表示。声音当前按创作混音烘焙 PCM 分轨，后续移动/调音量不会动态重算其他轨道压低和总线包络。可编辑声明不等于当前项目已完成保存重开、逐轨导出或成片验收，仍按 [工作台](workbench.md) 执行。

## 唯一归属与维护

- 各模块 `catalog.json` 继续拥有可执行条目与参数；背景目录和独立组件目录分别继续拥有原有定义，不复制成另一份总表。
- 各模块 `capabilities.json` 只维护补充说明、文档/示例/测试路径及现有工作流。defaults 放共享说明，items 按已有 ID 补充；features 只能声明 workflow 或 not_implemented，不能凭元数据注册新执行器。
- `engine/capabilities.py` 按查询组合这些来源；`engine/backend_caps.py` 的原生白名单同时服务编译校验、工作台支持判断和能力视图。Canvas 场景使用原 catalog 的 backends 声明。
- metadata 不能修改参数、状态注册或扩大后端范围。新增执行能力仍按 [模块维护](module-development.md) 完成实现、运行合同和工作台接入，再补查询说明。
- `--check` 会拒绝重复 ID、未知字段/状态、悬空注解 ID、缺失的本地文档/示例/资源及越出 skill 的路径。测试源码通常随仓库提供；无 tests/ 的独立交付包会明确列出 omittedTestReferences，不能据此声称测试通过。
- 选型说明不参与运行合同；改文档或元数据不会注册能力。当前项目的运行、播放、文字与听音结果仍留在本片证据中，不把历史反馈或本目录状态当作当前验证。
