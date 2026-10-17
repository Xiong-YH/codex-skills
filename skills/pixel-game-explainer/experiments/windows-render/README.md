# Windows 原生 Canvas 渲染实验

这是一份已验证的实验副本。它只接受 **8 秒、1920×1080、60 fps、480 帧**，不是通用生产渲染器。

默认使用 `@napi-rs/canvas` 在本地按 `i / 60` 固定时间绘制，使用 Sharp 处理 PNG，再把 RGB 帧送入 FFmpeg。无需浏览器、Playwright、HTML 加载或网络。`windows-render.cjs` 只接受 `--encode-only`。

## 依赖与项目输入

- Node.js 20 或更新版本；Node 依赖见 `package.json`。
- FFmpeg 和 ffprobe：默认从 PATH 查找，或设置 `PIXEL_FFMPEG`、`PIXEL_FFPROBE` 为可执行文件路径。
- Node 包默认使用正常 `require()` 查找；已有依赖目录可通过 `PIXEL_NODE_MODULES` 指定，该值应指向 `node_modules` 目录。
- FFmpeg 需提供 H.264（优先 `libx264`，否则使用 `libo264rt`）、AAC、rawvideo 输入，以及 H.264 解码供核验。
- Windows 字体从 `%SystemRoot%\Fonts` 读取微软雅黑和 Segoe UI Emoji；其他系统依赖已安装字体，排版可能不同。

输入项目需已生成 `project.json`、`animation-sfx.wav`，以及 `source/` 下的 `pixels.js`、`assets.js`、`captions.js`、`mouth.js`、`visual.js`、`motion.js`、`film.js`。场景需暴露此实验使用的 `ProgrammerFilm.ready` 和 `ProgrammerFilm.draw(t)` 接口。仅运行可信的自行编写场景代码；Node `vm` 不是安全沙箱。

## 运行

在本技能目录中执行，使用随技能提供的 8 秒样例。从总仓库根目录先运行 `Set-Location skills/pixel-game-explainer`：

```sh
# 8 个时刻的预览和接触表
node experiments/windows-render/native-canvas-render.cjs examples/small-steps-8s examples/small-steps-8s/outputs/film.mp4 --preview-only

# 只生成完整 480 帧
node experiments/windows-render/native-canvas-render.cjs examples/small-steps-8s examples/small-steps-8s/outputs/film.mp4 --frames-only

# 默认：预览、480 帧、MP4 编码及媒体参数核验
node experiments/windows-render/native-canvas-render.cjs examples/small-steps-8s examples/small-steps-8s/outputs/film.mp4

# 复用已有帧，仅编码并核验
node experiments/windows-render/windows-render.cjs examples/small-steps-8s examples/small-steps-8s/outputs/film.mp4 --encode-only
```

中间文件位于 `PROJECT/work/windows-render/`。编码复用该目录的 `frames/frame_0000.png` 至 `frame_0479.png`，音效使用项目根目录的 WAV。编码输出为 H.264 / yuv420p + AAC / 48 kHz / 双声道，MP4 含 faststart。脚本会覆盖指定 MP4；核验结果写入中间目录的 `verification.json`，检查时长、尺寸、帧率、解码帧数、逐帧时间戳和音轨。

如果没有现成的 Node 依赖，可在本实验目录执行 `npm install`。Codex 本地会话也可以先通过 workspace dependency discovery 找到已有运行时，将其 `node_modules` 目录传给 `PIXEL_NODE_MODULES`，无需把个人缓存路径写入源码。

预览时刻依次为 0.7、2.3、2.85、3.5、4.0、4.8、6.4、7.8 秒。此实验只支持当前 Canvas API 子集和项目结构；不包含播放器、音效生成或任意网页渲染。
