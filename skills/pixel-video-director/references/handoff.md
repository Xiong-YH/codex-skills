# 基础依赖与交接

本流程适用于工程交接与制作。只做视觉分镜时按 [设计稿与源文件映射](visual-storyboard.md) 交付，进入本流程后再定位基础依赖。

需 Python 3.10+ 与 [requirements.txt](../requirements.txt)。渲染依赖由 pixel-game-video 自己的 doctor 检查。

定位顺序：显式 `--foundation` → `PIXEL_VIDEO_SKILL` → 同级 `pixel-game-video/` → `$CODEX_HOME/skills/pixel-game-video`（未设置则 `~/.codex/skills/`）。显式目录无效时直接报错，不换到另一份版本。独立安装 director 时，同时安装基础 skill 或配置该路径。

```text
python scripts/director.py doctor --foundation FOUNDATION
python scripts/director.py init PROJECT --example
python scripts/director.py check PROJECT
python FOUNDATION/scripts/video.py catalog
python scripts/director.py handoff PROJECT --foundation FOUNDATION
python FOUNDATION/scripts/video.py build PROJECT/video
python FOUNDATION/scripts/video.py workbench PROJECT/video --port 5208 --no-open
```

`PROJECT` 和 `FOUNDATION` 是使用者选择的目录占位符，不写入工程配置。具体出片参数、模块状态和运行条件读取基础 skill 的入口及 `video.py --help`。

handoff 将四份创作源合成为 `video/{project,timeline,text,audio}.json`，设置 `authoringMode=director`。先在同级临时目录调用基础 validate，通过后才写入目标。时间无静默补齐，未知素材、配方和未支持参数由基础层校验拒绝。

`video/source-map.json` 保存：

- generatedHashes：四份生成文件的原始字节 SHA256。
- sourceHashes：四份创作源的字节 SHA256，路径相对 video/。
- mappings：`generatedFile + jsonPointer → sourceFile + stableId + field`。

再次交接前检查生成文件哈希。被手改时，先对照映射把修改回写源文件，再恢复生成文件到上次交接版本；不能用 handoff 强制覆盖丢掉更改。`.director-state.json` 记录上次交接的源快照，供 impact 比较。项目迁移时一起保留源文件、映射与 Review。

基础层独立工程可使用 `authoringMode=direct` 直接编写 VideoSpec；director 不复制基础引擎、素材或运镜规则。

`production-plan.renderBackend` 透传到基础 project。使用 Remotion 时，先运行 `python FOUNDATION/scripts/video.py doctor --backend remotion`，交接后运行 `python FOUNDATION/scripts/video.py studio PROJECT/video`。它仍使用 storyboard 的帧数、事件与文字区间；不会重排时长以适配组件。原生样例见 [remotion-focus-desk](../examples/remotion-focus-desk/README.md)，实际可用场景/配方以基础层校验为准。

## 工作台剪辑与可编辑交付

制作时必读已定位基础 skill 的 `references/production-workflow.md` 和 `references/workbench.md`。导演源负责初始创作与可追溯交接，工作台负责最终剪辑与导出：

1. 在 storyboard 确定镜头顺序、时长、场景机制与参数、动作事件和文字区间；script 保存文案与短标签，production-plan 选择人物、素材、运镜转场和声音，引用同一批事件。已有旁白作为素材导入后按实长精调；配音生成不在本流程内。
2. `check`、`handoff` 后由基础层编译唯一整数帧时间线。Canvas 和原生 Remotion 共用编译合同；Canvas 通过逐帧 runtime 桥接进入工作台，不把 Canvas 全片 MP4 当唯一镜头，也不把它称为原生 React 迁移。
3. 运行 `python FOUNDATION/scripts/video.py workbench PROJECT/video --port 5208 --no-open`，主动打开实际打印地址。从同一编译 payload 拆出镜头、字幕与其他文字、转场、音效、配乐五类独立轨道；有旁白时另轨。场景参数、组件、人物与素材配置通过镜头 props/schema 编辑，叙事进度等叠加项使用自己的单元。
4. 初始导入与源合成做同帧 parity，分轨音频与本次源 WAV 做 PCM 重组核对。再在真实 UI 分别编辑五类轨道，连续播放，检查动作落稳、阅读、转场前中后与听音；保存刷新、下载 JSON 并重新导入，确认修改仍在；逐轨导出，确认只包含所选轨道。原生 Remotion 能力白名单仍按基础层 `references/remotion.md`；Canvas runtime 桥接不扩大该白名单。
5. 最终成片必须从工作台当前项目导出，随后按 [Review](review.md) 检查真实 MP4、解码帧和听音。直接 `render` 只用于源合成调试与一致性对照。任何选用能力尚不能进入工作台、独立编辑或导出时，先补齐并验证，不能静默绕过。
6. 工作台在 `workbench/exports/` 持久保存与 MP4 同名的 `.project.json`；交付 MP4 与「导出版本 JSON」。导出后继续编辑时，「保存工程 JSON」可能是更新状态，不能与旧 MP4 混配。音轨的压低、淡化及 master 包络按源版本烘焙，修改后不会动态重算其他轨道，须重新听音。
7. 需要独立工程时用基础 `export-project` 交付含输入、源码、工作台与资产的 direct 快照，另存导演创作源、源映射和 Review。浏览器自动保存不能代替项目 JSON。用户需要剪映草稿时另读基础层 `references/jianying-export.md`，按当前工作台分支导出与验收；剪映内部动画烘焙程度不等于工作台 props 能力，未在目标应用打开不能声称应用内验收通过。

## 工作台分支的所有权

导演创作源仍负责原版分镜；生成的 `video/build/remotion/src/workbench.ts` 是同源导入清单，不是手改入口。工作台编辑存入独立项目 JSON，不自动回写 `script.json`、`storyboard.json`、`production-plan.json` 或四份 VideoSpec。

继续原导演方案时，回改源文件再 handoff/build，并显式导入工作台；继续工作台剪辑时，加载保存的工作台 JSON 并从工作台导出。镜头片段拖动不代表全部关联字幕、转场和音效自动跟随，修改后逐轨检查并保存。重新构建、切换工程或重新导入原片前，先下载当前工作台 JSON；不得静默覆盖用户剪辑。

工作台改过的成片绑定项目 JSON 与 MP4，不能仅以旧导演源哈希声称新版本通过 Review；审查与证据边界见 [Review](review.md)。
