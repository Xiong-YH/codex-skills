# 运行与交付

公共依赖：Python 3.10+，`pip install -r requirements.txt`；Node.js；导出 MP4 需要 FFmpeg/ffprobe（H.264/AAC）。Canvas 默认使用根 `package.json` 的 Playwright：运行 `npm install`，配合 Playwright Chromium（`npx playwright install chromium`）或已安装的 Chromium 系浏览器。原生 React 后端的独立安装、预览和边界见 [Remotion](remotion.md)。

| 配置 | 用途 |
| --- | --- |
| PIXEL_NODE | Node 可执行文件；默认 PATH |
| PIXEL_NODE_MODULES | 可选 node_modules 目录，需包含所选后端的依赖 |
| PIXEL_BROWSER_EXECUTABLE | 浏览器可执行文件；Canvas 默认 Playwright Chromium，Remotion 只查找已有 Chrome/Chromium，不下载 |
| PIXEL_FFMPEG / PIXEL_FFPROBE | 编解码与媒体检查；默认 PATH |

字体配置与解析方式见 [style](../modules/style/GUIDE.md)。系统字体会影响实际文字外观；换环境后重新查看关键帧。

```text
python scripts/video.py doctor
python scripts/video.py init work/my-film --title "我的主题"
python scripts/video.py validate work/my-film
python scripts/video.py build work/my-film
python scripts/video.py preview work/my-film --start-frame 120 --end-frame 240
python scripts/video.py render work/my-film
python scripts/video.py inspect work/my-film
python scripts/video.py export-project work/my-film /path/outside-project/delivery
```

`build` 根据 `project.renderBackend` 生成 Canvas HTML 或 Remotion 原生工程，并写编译合同和非静音 WAV。`studio` 只用于 Remotion 交互预览；`preview` 导出默认前三秒的 MP4，可选任意帧区间；`render` 导出 MP4 与解码证据。Remotion 默认先用 Studio，按用户的导出要求再运行后两条命令。重复输出需显式 `--overwrite`。工程目录不用包含手工复制的引擎源码。

需要浏览器内改文案、镜头和音效时，运行 `python scripts/video.py workbench PROJECT --port 5208 --no-open`，再打开实际打印的地址。它构建原生工程并接入 `workbench/`；初次使用需安装该目录锁定的 Node 依赖。当前支持 Remotion 书桌场景与事件音效/静音工程，其他后端或未经多轨接入的音频明确拒绝。工作台编辑另存项目 JSON，不回写 VideoSpec；工作台成片导出到 `workbench/exports/`。导入一致性、保存/重开与导出验收见 [本地工作台](workbench.md)。

需要配乐时先运行 `python scripts/video.py import-bgm PROJECT`，用 FFmpeg 将内置 Chill Wave 转为项目 WAV，再将输出的 `bgm` 配置加入对应创作源。可调音量、淡入淡出与旁白压低；详见 [配乐工作流](../modules/audio/MUSIC.md)。

独立导出包含整个基础运行模块与素材、四份输入、工作台源码与依赖清单，不包含 Python/Node/浏览器/字体二进制、node_modules 或渲染缓存。工作台编辑过的分支另存下载的项目 JSON；浏览器缓存不能代替交付。director 工程导出为明确标记的 direct 快照，并另存创作源供追溯。

安装包与 `export-project` 共用 `engine/delivery.py` 的文件规则，排除缓存、运行时二进制和撤回实验。输入哈希按 `engine/dependencies.py` 选择后端源码、风格预设和实际音效母版；Remotion 绑定原生组件及依赖锁，Canvas 不绑定未使用的 TSX。目录合同及公共引擎仍共同绑定。修改被绑定文件需重新构建，修改未使用的场景实现或实验素材不影响本工程。风格素材按整个选定预设绑定，暂不细分到单镜背景。

机器核验状态与人工视听状态分别保存；只有实际运行结果才能扩大平台支持范围。旧 Swift 和 Windows 原生 Canvas 实验保留在 legacy，未作为新命令后端。

剪映草稿导出使用可选 `requirements-jianying.txt`，与原 MP4 依赖分开；工作台可通过 `PIXEL_JIANYING_PYTHON` 选择该解释器。入口、干净底片要求与本机安装边界见 [剪映草稿导出](jianying-export.md)。

Mac 安装器自动识别应用版本。精确版本 11.2.0 已用 15 秒 Demo 验证无设备标识、无明文 donor 的安装与原生打开播放；其他 Mac 版本仍需要可用的本机明文 donor，否则停止。保存并 Cmd+Q 后才安装；主应用 `VideoFusion-macOS.app` 及编辑辅助进程需退出，单独的托盘常驻进程可保留。不强杀进程。Windows 尚无本项目真机验收；原生字幕修改后的预览和主观听音仍须另审。
