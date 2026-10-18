# 运行与交付

依赖：Python 3.10+，`pip install -r requirements.txt`；Node.js，`npm install`；Playwright Chromium（`npx playwright install chromium`）或已安装的 Chromium 系浏览器；FFmpeg/ffprobe（H.264/AAC）。

| 配置 | 用途 |
| --- | --- |
| PIXEL_NODE | Node 可执行文件；默认 PATH |
| PIXEL_NODE_MODULES | 可选 Node 依赖目录 |
| PIXEL_BROWSER_EXECUTABLE | 可选浏览器可执行文件；默认 Playwright Chromium |
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

`build` 生成可播放 HTML、编译合同和 WAV；`preview` 默认前三秒，可选任意帧区间；`render` 输出 MP4 与解码证据。重复输出需显式 `--overwrite`。工程目录不用包含引擎源码。

独立导出包含整个基础运行模块与素材、四份输入、依赖清单，不包含 Python/Node/浏览器/字体二进制。director 工程导出为明确标记的 direct 快照，并另存创作源供追溯。

安装包与 `export-project` 共用 `engine/delivery.py` 的文件规则，排除缓存、运行时二进制和撤回实验。单片 HTML 与输入哈希则按 `engine/dependencies.py` 选择场景执行器、风格预设和实际音效母版；目录合同及公共引擎仍共同绑定。修改被绑定文件需重新构建，修改未使用的场景实现或实验素材不影响本工程。风格素材按整个选定预设绑定，暂不细分到单镜背景。

机器核验状态与人工视听状态分别保存；只有实际运行结果才能扩大平台支持范围。旧 Swift 和 Windows 原生 Canvas 实验保留在 legacy，未作为新命令后端。
