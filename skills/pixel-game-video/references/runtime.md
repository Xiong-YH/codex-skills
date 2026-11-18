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
python scripts/video.py workbench work/my-film --port 5208 --no-open
python scripts/video.py preview work/my-film --start-frame 0 --end-frame 120
python scripts/video.py render work/my-film
python scripts/video.py inspect work/my-film
python scripts/video.py export-project work/my-film /path/outside-project/delivery
```

`init` 的中性占位不预选人物、背景、转场或音效，初始 `audioMode=silent`；按本次设计填入素材与事件，采用音乐或音效时设为 `sfx-only`，再导入实际音源。旧运行演示仅用于回归测试，不作为创作模板。

`build` 根据 `project.renderBackend` 生成 Canvas HTML 或 Remotion 原生工程，并写编译合同与工作台同源入口；有声工程另写混音 WAV。`studio` 只用于原生 Remotion 调试；`preview` 导出默认前三秒的 MP4，可选任意帧区间；`render` 导出源合成 MP4 与解码证据，用于调试和一致性对照。最终剪辑与成片必须从工作台完成，不能用 `render` 绕过。重复输出需显式 `--overwrite`。工程目录不用包含手工复制的引擎源码。

制作时运行 `python scripts/video.py workbench PROJECT --port 5208 --no-open`，再打开实际打印的地址。Canvas 通过同源逐帧 runtime 接入，原生 Remotion 使用已有场景执行器；初次使用需安装 `workbench/` 锁定的 Node 依赖。镜头、字幕与其他文字、转场、音效、配乐分别独立轨道，有旁白时另轨；场景内部参数、组件、人物和素材通过 props 编辑。初始音频分轨须通过本次 PCM 重组核对。工作台编辑另存项目 JSON，不回写 VideoSpec；最终从工作台导出到 `workbench/exports/`，MP4 与该次「导出版本 JSON」配对交付。导入一致性、真实分轨编辑、保存/重开与导出验收见 [本地工作台](workbench.md)。

用 `python scripts/video.py import-bgm PROJECT --source LOCAL_AUDIO` 将所选配乐转为项目 WAV。将输出的 `bgm` 配置加入对应创作源，按实际拍点填写裁入和淡化。详见 [配乐工作流](../modules/audio/MUSIC.md)。

独立导出随本项目携带四份输入、已用的运行源码和素材、工作台源码及依赖清单。下载工作台项目 JSON 以继续编辑剪辑分支。director 工程以 direct 快照运行，创作源另存供追溯。需要加入新的画风或场景能力时，从完整技能的源工程补齐并重新导出。

安装包与 `export-project` 共用 `engine/delivery.py` 的文件规则。R41 等参考样例随完整技能提供。独立工程按 `engine/dependencies.py` 的运行依赖和工作台支持文件复制，在交付目录验证重建及工作台清单。所选风格预设的素材以整套为单位绑定，工作台自带的基础音效入口随编辑器保留。

机器核验状态与人工视听状态分别保存；只有实际运行结果才能扩大平台支持范围。旧 Swift 和 Windows 原生 Canvas 实验保留在 legacy，未作为新命令后端。

剪映草稿导出使用可选 `requirements-jianying.txt`，与原 MP4 依赖分开；工作台可通过 `PIXEL_JIANYING_PYTHON` 选择该解释器。入口、干净底片要求与本机安装边界见 [剪映草稿导出](jianying-export.md)。

Mac 安装器自动识别应用版本。精确版本 11.2.0 已用 15 秒 Demo 验证无设备标识、无明文 donor 的安装与原生打开播放；其他 Mac 版本仍需要可用的本机明文 donor，否则停止。保存并 Cmd+Q 后才安装；主应用 `VideoFusion-macOS.app` 及编辑辅助进程需退出，单独的托盘常驻进程可保留。不强杀进程。Windows 尚无本项目真机验收；原生字幕修改后的预览和主观听音仍须另审。
