# 原生 Remotion 后端

Remotion 负责基础层的场景绘制、帧采集和 Studio 预览。导演仍决定可见动作与镜头，四份 VideoSpec 仍由编译器统一解析成整数帧；不再维护第二张组件时间表，也不把 Canvas 成片嵌入 React。

## 安装与预览

从本 skill 根目录运行：

```sh
pip install -r requirements.txt
npm ci --prefix engine/remotion
python scripts/video.py doctor --backend remotion
python scripts/video.py init work/my-desk --backend remotion --title "先选一件"
python scripts/video.py validate work/my-desk
python scripts/video.py studio work/my-desk
```

Node 依赖锁定 Remotion 4.0.534、React 19.2.0，存于 `engine/remotion/package-lock.json`。`doctor` 检查完整出片环境，包括 Python、Node、已有 Chrome/Chromium 和 FFmpeg/ffprobe；仅使用 Studio 时，缺少最后两项不妨碍启动预览。可用 `PIXEL_BROWSER_EXECUTABLE` 指定浏览器，命令不会自动下载浏览器。其他配置见 [运行说明](runtime.md)。

`studio` 先构建，然后打印实际本地 URL。打开该地址，在 `PixelFilm` 查看全片，在 `Scenes/FocusDesk` 单独检查场景；场景 composition 的 `shotIndex` 指向编译后的镜头。默认先交付可交互预览，修改创作源后重新 handoff（director 工程）并 build，再刷新 Studio。

浏览器可能要求一次用户手势解锁音频上下文；若程序调用播放后帧不推进，点击 Studio 的播放按钮，再检查实际帧号，不能仅凭 `playing=true` 判断播放成功。

明确需要 MP4 时运行 `python scripts/video.py render PROJECT`；需要片段 MP4 时使用 `preview PROJECT --start-frame FIRST --end-frame LAST`。二者沿用现有 FFmpeg 编码、音轨切片、解码帧及媒体核验。区间始终为 `[FIRST,LAST)`，输出帧编号从零开始；Studio 中音轨只挂载一次。

## 当前能力

| 项目 | 可用范围 |
| --- | --- |
| 后端选择 | direct 的 `project.renderBackend` 或导演的 `production-plan.renderBackend` 为 `remotion`；缺省仍为 Canvas |
| 输出 | 1920×1080；合同允许 30/60 fps，当前静帧与 Studio 核验为 60 fps |
| 风格 | `style.pixel-editorial.v1` |
| 场景 | `scenes.focus-desk.v1`，原生 SVG/HTML 房间、桌面、灯、纸张、书与托盘 |
| 主体变化 | `phase=overload/choose/focus`；分别呈现待办拥挤、选出主项并暂存其余、展开工作纸面 |
| 人物 | `actor.azong.v3` 静态基准图或 `actor:null` |
| 运镜 | `motion.camera-track.v1`，房间、物体与人物整体平移/缩放 |
| 转场 | `motion.book-sweep.v1`，以前镜末态起步，书页全遮挡时切换到后镜 |
| 文字/声音 | 编译后的四类文字角色；现有音效/PCM 旁白混音或 silent |

scene params 必须提供 `heading`、恰好三项 `labels`（第一项是主任务）、`startEvent` 与 `completeEvent`。事件引用本镜 local ID，必须前后有序且早于 exit；动作开始前保持初态，完成后保持终态。字符串上限属于输入合同，实际排版仍需检查长文本与字体。

当前场景拥有固定桌面道具，不接受额外 `objects`、十二类 `components`、项目 `background/replacement`；其他风格、人物、场景和 motion 会明确报错。需要扩展时补原生执行器和验证，再扩大能力白名单。不能把可用目录 ID 等同于两种后端都已实现。

## 构建与可迁移性

`build` 写入 `build/remotion/`（TSX 源码、public/payload.json、可选音轨、依赖清单）、`build/remotion-build.json`、统一时间线及锁。生成目录是派生物，修改它会在渲染时触发哈希拒绝；应修改创作输入或 skill 的原生源码，再构建。Canvas 的 `build/film.html` 不参与这条路径。

`export-project` 继续导出可编辑 direct 快照，附完整基础源码与资产，排除 node_modules、缓存、浏览器和字体二进制。移到新环境后按导出 RUN.md 安装依赖、重新构建；生成目录的本机依赖链接只是预览便利，不是交付依赖。

原验证环境为 macOS。2026-10-20 合并验证补充 Windows + 已安装 Edge：12 秒导演样例成功交接，并实际导出 `[228,300)` 的72帧片段，60 fps、1920×1080，编码与解码技术检查通过；覆盖切镜前与书页转场区间，不代表 Windows Studio、全片连续播放或听音已经验收。其他平台不据路径候选列表宣称已支持。技术检查不代替视听审查，未检查状态保持 `not_reviewed`。
