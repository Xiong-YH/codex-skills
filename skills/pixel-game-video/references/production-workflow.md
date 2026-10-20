# 制作与可编辑时间线

用于把分镜落实为工程内的镜头剪辑、运镜转场、字幕和声音，并让预览、成片与可编辑交付保持一致。创意策划仍由 pixel-video-director 或用户已有分镜提供；初始制作沿用 [制作合同](contract.md) 的四份 VideoSpec，不新增输入字段或手抄第二份时间表。原生 Remotion 工程还可接入 [本地工作台](workbench.md)，由同一编译结果拆成多轨；开始编辑后，工作台项目 JSON 是独立剪辑分支，不自动回写原创作源。`Sequence`、Studio 与工作台步骤仅适用于显式选择的 Remotion 后端，缺省 Canvas 的预览按 [运行与交付](runtime.md) 执行。

## 1. 把分镜落实到唯一创作源

先明确每镜头的表达、主体初态与终态、主要动作、文字、前后承接和声音。为动作落定、阅读和旁白留出帧数；有实际旁白时先测长度，再安排镜头与字幕。时长、画幅和风格遵循当前项目，不把示例片的参数当成默认要求。

| 剪辑决定 | direct 工程修改处 | director 工程修改处 |
| --- | --- | --- |
| 镜头顺序、时长、事件 | `timeline.json` | `storyboard.json` |
| 字幕、注释等文字 cue 的文案 | `text.json` | `script.json` |
| 场景内文案 | `timeline.json` 的 params，依场景合同填写 | `script.json` 的 labels，经 `storyboard.json` 引用 |
| 字幕起止 | `text.json` 中的事件引用 | `storyboard.json` 的文字区间 |
| 场景机制、参数与物体位置 | `timeline.json` | `storyboard.json` |
| 人物、素材、运镜、转场及其事件绑定 | `timeline.json` | `production-plan.json`；引用 `storyboard.json` 的事件 |
| 画幅、帧率、风格与后端 | `project.json` | `production-plan.json` |
| 音效、旁白、BGM、增益及事件绑定 | `audio.json` | `production-plan.json` |

director 工程先按 `source-map.json` 定位创作源，再 handoff；其中的 `video/` 是生成物。基础层 direct 工程直接编辑四份 VideoSpec。`build/resolved-timeline.json` 和 `build/remotion/` 都是派生物，修改生成 TSX 不能作为下一轮剪辑入口。

## 2. 编译成帧级时间线

镜头按输入顺序和 `durationFrames` 累计；本镜事件使用局部整数帧，字幕、动作和声音通过事件引用对齐，例如：

```json
{"event":"s01.choose","offsetFrames":0}
```

运行 `validate`、`build` 后，检查唯一运行时间线 `build/resolved-timeline.json`：

- 镜头、字幕和运动遵循 `[startFrame,endFrame)`；前镜结束帧等于后镜开始帧，最后结束帧等于总片长。
- 每个动作从哪一个事件开始、在哪一帧落定，字幕是否留够阅读时间，声音是否落在实际动作上。
- 转场从后镜 `enter` 开始，占用后镜时长；前镜末态、遮挡切换和后镜落稳按所选执行器核对。
- 修改上游镜头长度后，检查下游事件、文字、旁白及配乐边界是否跟随；修正源引用后重新构建。

分镜表可以记录设计意图，运行时仍只消费编译结果。不要另写 `SHOTS`、`timeline.ts` 或独立秒数表覆盖现有合同。

## 3. 在 Remotion 内完成画面组合

显式选择 `renderBackend=remotion` 时，先读 [Remotion 后端](remotion.md) 并核对能力范围。当前的书桌场景和指定运镜有原生执行器；需要其他场景时先实现与核验，不能把目录里的能力都视为可用于 Remotion。

现有 [Root.tsx](../engine/remotion/src/Root.tsx) 按编译结果为每镜创建 `Sequence`，核心结构如下：

```tsx
payload.resolved.shots.map((shot, index) => (
  <Sequence
    key={shot.id}
    from={shot.startFrame}
    durationInFrames={shot.endFrame - shot.startFrame}
  >
    <FocusDesk payload={payload} shotIndex={index} />
  </Sequence>
))
```

这段代码说明现有执行器如何使用时间线，不要求为每个项目再复制一套组件时间表。场景根据当前帧计算状态、位置、缩放和转场，文字按编译后的 cue 区间显示。动画计算应可逐帧定位和重放，避免用真实时间或未固定种子的随机数驱动画面；播放、暂停或拖动播放头后应呈现对应帧的状态。

扩展原生场景时，沿用已有 scene params、文字 cue 与 motion 合同；把需要编辑的内容写进受支持的输入参数，新增参数先实现校验与执行器。需要可视化编辑的语境参数还要通过组件 props 和工作台 schema 开放，并使用与原合成相同的实际默认值；不要把文案、颜色或动作时点硬写进项目生成物后声称已经支持编辑。弹入时长、错峰、缓动与相机路径等节奏关键参数保持已核验的运动质量。

## 4. 让画面和声音对齐

声音方案可在分镜时确定，具体音效落点在画面时序稳定后核对。音效、PCM 旁白和可选 BGM 均引用同一事件时间线；镜头改动后重新检查动作落点、语句长度、淡化和旁白压低，按当前项目选择声音。

原合成先由 Python 混音器把这些声音合为 WAV，Studio 在全片只挂载一次 `<Audio>`；不会为每个镜头重复播放音轨。逐条音效仍可回到 `audio.json` 或导演的 `production-plan.json` 编辑，再重新交接和构建。

需要在浏览器内独立调整音效时，按 [工作台](workbench.md) 从同一编译结果导出各条 PCM 音效片段及清单；工作台不再叠加全片预混音。初始独立混音要与原混音核对时点、增益和听觉效果。当前工作台支持事件音效或静音工程；含旁白/BGM 的原制作流程不因此扩大为已完成的多轨接入范围。

## 5. 检查已编排的全片

Remotion 工程从本 skill 根目录运行以下命令；`PROJECT` 是工程路径占位符。Canvas 工程检查构建后的 `build/film.html`，按运行说明生成所需预览，不运行 `studio`。

```text
python scripts/video.py validate PROJECT
python scripts/video.py studio PROJECT
```

`studio` 会先构建。在 `PixelFilm` 检查全片，单场景 composition 用于局部排查。检查每镜的入场、动作峰值和落定帧；转场同时看前、中、后帧并连续播放；核对字幕起止、阅读时间和实际听音。静帧不能证明转场连续或音画同步。

修改 direct 输入后重新 `build`；director 工程先回改创作源、重新 handoff，再 `build`。刷新 Studio，确认加载的是当前输入。播放头操作只用于查看，不会保存镜头重排或自动回写创作源。仅需草稿预览时交付 Studio，不强制生成 MP4。

用户要直接改文案、调整镜头/音效时，运行 `python scripts/video.py workbench PROJECT --port 5208 --no-open` 并主动打开打印出的地址。生成的 `build/remotion/src/workbench.ts` 按同一 payload 拆出镜头、字幕、转场和音效，附组件 props/schema；清单和 TSX 是生成物，不作为持久编辑入口。先用 parity 核对未编辑导入与原合成，再用真实 UI 实测修改、保存重开和导出。

## 6. 编码出片并核对预览一致性

用户需要原 VideoSpec 分支的成片时再运行 `render PROJECT`；需要片段时运行 `preview PROJECT --start-frame FIRST --end-frame LAST`，区间为 `[FIRST,LAST)`。用户在工作台改过的分支由工作台当前项目导出到 `workbench/exports/`，不会被原 `render PROJECT` 自动采用。完整命令与覆盖选项见 [运行与交付](runtime.md)。

Remotion 路径的分工为：Remotion 逐帧输出 PNG；Python 提供同一时间线的 PCM 混音；FFmpeg 编码画面、封装音轨为 MP4；ffprobe 核验媒体，FFmpeg 解码关键帧供回看。FFmpeg 既参与最终编码，也参与抽帧检查。

Studio 与导出应使用同一份有效构建、帧率、总帧数和混音。出片后从实际 MP4 核对代表性动作帧、切点前后、字幕和声音；帧数、哈希或媒体格式通过，不能代替视听审查。未看的画面和未听的声音保持 `not_reviewed`。

工作台导出同样核对当前项目 JSON 与 MP4：保存下载项目、重新导入验证，再检查导出帧数、修改后的文字、镜头和音效。原合成 parity 只证明首次拆解一致，不能代替编辑后成片的审片。

额外用 FFmpeg 裁切、拼接、变速、烧字幕或移动声音，会改变最终结果，且不会自动回写 Remotion 工程。需要这些剪辑决定时，先修改拥有该决定的创作源，再重新交接、构建和导出；只改 MP4 的后期版本必须单独标明，不能当作与草稿同步的交付版本。

## 7. 交付可继续编辑的工程

使用 `export-project` 导出含四份输入、运行源码、素材、工作台与依赖说明的独立 direct 快照。director 工程另存原始创作源、源映射与 Review 以便追溯；接收方按导出说明安装依赖、重新构建后继续修改。已请求成片时一并交付当前 MP4 与实际核验证据。

可视化编辑交付还包括工作台项目 JSON 和当前入口。主动打开工作台，告知用户可在属性面板改文案、在时间线调镜头和独立音效，再导出成片。浏览器自动保存不是可迁移的交付物；必须下载项目 JSON，并实测重导入。明确工作台分支不会自动回写导演源或 VideoSpec，原版和修改版分别标明。需要剪映工程时，使用 [剪映草稿导出](jianying-export.md) 生成干净底片、镜头分段、原生字幕和独立音轨；另外检查目标机器安装与应用内打开，不把程序动画描述为可逐元素编辑。
