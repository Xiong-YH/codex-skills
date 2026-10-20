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
python FOUNDATION/scripts/video.py render PROJECT/video --name film
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

## 工程内剪辑与可编辑交付

制作前按已定位基础 skill 的 `references/production-workflow.md` 执行；Remotion 能力边界读其 `references/remotion.md`。导演层负责把剪辑决定写进创作源，基础层负责按编译结果执行：

1. 在 storyboard 确定镜头顺序、`durationFrames`、场景机制与参数、动作事件和文字区间；script 保存文案与短标签，production-plan 选择人物、素材、运镜转场和声音，并引用同一批事件。先按脚本完成工作台粗剪；有现成旁白时作为素材导入，再按实长精调字幕、镜头和阅读停顿。配音生成不在本交接流程内。
2. `check`、`handoff` 后由基础层编译唯一整数帧时间线。显式选择 Remotion 时按该结果建立镜头 `Sequence`；Canvas 也使用同一编译时间线。场景、字幕和声音共用编译结果，不再另写 `SHOTS` 或秒数表。
3. 使用所选后端连续预览全片并听音：Remotion 在 Studio 的 `PixelFilm` 查看；Canvas 检查构建后的 `build/film.html`，按基础运行说明生成所需预览。检查主体状态变化、转场承接、字幕起止和声音落点。修改时沿源映射回改创作源，再 handoff、build、刷新预览；播放头操作不会保存剪辑决定。
4. 用户需要 MP4 时，从当前有效构建 render，并按 [Review](review.md) 查看实际成片、解码帧和听音。额外后期裁切、变速或移动声音需要同步回创作源，不能只改 MP4 后声称 Studio 已更新。
5. 用户需要在浏览器内改文案、调整镜头或音效时，读取基础 skill 的 `references/workbench.md`，运行 `python FOUNDATION/scripts/video.py workbench PROJECT/video --port 5208 --no-open`。当前接入原生 Remotion 书桌场景及其独立音效、PCM 旁白和 BGM，初始分轨须通过本次 PCM 重组检查；编辑音轨不会动态重算其他轨道的压低，需重新听音。暂拒绝独立 `role=title` cue，镜头 `heading` 仍可编辑；Canvas 尚未接入。
6. 首次工作台清单从同一编译 payload 派生，镜头、文字、转场与独立音效不得另抄时间表；props/schema 暴露实际画面参数。先对未编辑导入与原合成做 parity，再实测 UI 改文案、调镜头/音效、保存刷新、下载/重导入项目 JSON 和成片导出。主动打开工作台并给出实际地址。
7. 使用基础 `export-project` 交付含输入、源码、工作台与资产的 direct 快照；另存导演创作源、源映射和 Review。工作台编辑的分支交付 MP4 与「导出版本 JSON」下载的同名 `.project.json`；后者在基础 skill 的 `workbench/exports/` 持久保存，绑定该次导出提交的时间线。导出后继续编辑时，「保存工程 JSON」得到的当前状态可能属于更新版本，不能与旧 MP4 混配。浏览器自动保存不能代替交付。用户需要剪映草稿时，再读基础 skill 的 `references/jianying-export.md`；从当前工作台分支导出干净底片、分镜片段、原生字幕与独立音效。主标题与内部动画烘焙，安装是独立步骤；未在目标剪映打开时不能声称应用内验收通过。

## 工作台分支的所有权

导演创作源仍负责原版分镜；生成的 `video/build/remotion/src/workbench.ts` 是同源导入清单，不是手改入口。工作台编辑存入独立项目 JSON，不自动回写 `script.json`、`storyboard.json`、`production-plan.json` 或四份 VideoSpec。

继续原导演方案时，回改源文件再 handoff/build/render；继续工作台剪辑时，加载保存的工作台 JSON 并从工作台导出。镜头片段拖动不代表全部关联字幕、转场和音效自动跟随，修改后逐轨检查并保存。重新构建、切换工程或重新导入原片前，先下载当前工作台 JSON；不得静默覆盖用户剪辑。

工作台改过的成片绑定项目 JSON 与 MP4，不能仅以旧导演源哈希声称新版本通过 Review；审查与证据边界见 [Review](review.md)。
