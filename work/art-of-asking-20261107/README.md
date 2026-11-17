# 提问的艺术

当前工程为 **R38 步进 V5 卡点版**，2026-11-17，1 分 28 秒。拉取仓库后，从本目录打开创作器即可继续编辑。

| 内容 | 文件 |
| --- | --- |
| 创作器与可编辑状态 | [打开创作器](no-voiceover/script-creator.html) · [工程 JSON](no-voiceover/script-creator.json) · [字幕稿](no-voiceover/提问的艺术-无口播字幕稿.txt) |
| R38 观看与交接 | [Canvas 审片](no-voiceover/production/r38-v5-sync/index.html) · [MP4](no-voiceover/production/r38-v5-sync/asking-r38-v5-sync.mp4) · [同版画面与拍点工程](no-voiceover/production/r38-v5-sync/asking-r38-v5-sync.project.json) · [本次调整依据](no-voiceover/production/r38-v5-sync/feedback.json) |
| R38 重建输入 | [R37 画面基线](no-voiceover/production/r37-reading-pass/index.html) · [《步进》V5 母带](no-voiceover/media/music/pulse-v5.flac) · [配乐定版记录与分轨](no-voiceover/review/history/pulse-v5.json) |

从仓库根目录运行下面的命令重建 R38 画面和混音。需要 Node.js 和 FFmpeg。可以通过 `PIXEL_FFMPEG` 指定 FFmpeg。

```sh
node work/art-of-asking-20261107/no-voiceover/production/r38-v5-sync/source/build.cjs
```

重建后可运行同目录的 `source/export.cjs` 导出 MP4，再用 `source/attach-workbench.cjs` 校验并绑定同版作品。导出需要 FFprobe 和可用的 Playwright Chromium，浏览器路径可通过 `PIXEL_BROWSER_EXECUTABLE` 指定。R38 之前的历史审片只读文件中，R36 及更早的对照入口使用原电脑的本地归档。
