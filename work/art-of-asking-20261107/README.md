# 提问的艺术

当前本机无口播版本为 **R41 · 阅读节奏与人物特写**，1 分 48 秒，24 镜，搭配《步进》V5 的 108 秒编排。跨设备观看可打开随仓库提供的 [R41 有声 Canvas 与十段参考](../../skills/pixel-game-video/examples/asking-motion/index.html)。

| 内容 | 文件 |
| --- | --- |
| 创作器与可编辑状态 | [打开创作器](no-voiceover/script-creator.html) · [工程 JSON](no-voiceover/script-creator.json) · [字幕稿](no-voiceover/提问的艺术-无口播字幕稿.txt) |
| R41 本机审片 | [Canvas](no-voiceover/production/r41-rhythm-focus/index.html) · [MP4](no-voiceover/production/r41-rhythm-focus/asking-r41-rhythm-focus.mp4) · [同版画面与拍点](no-voiceover/production/r41-rhythm-focus/asking-r41-rhythm-focus.project.json) · [修订依据](no-voiceover/production/r41-rhythm-focus/feedback.json) |
| R38 历史成片 | [Canvas](no-voiceover/production/r38-v5-sync/index.html) · [MP4](no-voiceover/production/r38-v5-sync/asking-r38-v5-sync.mp4) · [同版画面与拍点](no-voiceover/production/r38-v5-sync/asking-r38-v5-sync.project.json) · [修订依据](no-voiceover/production/r38-v5-sync/feedback.json) |
| R38 重建输入 | [R37 画面基线](no-voiceover/production/r37-reading-pass/index.html) · [《步进》V5 母带](no-voiceover/media/music/pulse-v5.flac) · [配乐定版记录与分轨](no-voiceover/review/history/pulse-v5.json) |

## 重建历史 R38

从仓库根目录运行下面的命令重建 R38 画面和混音。需要 Node.js 和 FFmpeg。可以通过 `PIXEL_FFMPEG` 指定 FFmpeg。

```sh
node work/art-of-asking-20261107/no-voiceover/production/r38-v5-sync/source/build.cjs
```

重建后可运行同目录的 `source/export.cjs` 导出历史 MP4。导出需要 FFprobe 和可用的 Playwright Chromium，浏览器路径可通过 `PIXEL_BROWSER_EXECUTABLE` 指定。R36 及更早审片的对照入口使用本机归档。
