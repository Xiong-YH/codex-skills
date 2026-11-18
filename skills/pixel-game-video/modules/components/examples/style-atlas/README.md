# R41 组件图册

图册加载实际 Canvas 执行器，提供按类别浏览、原速重播、逐帧、按节点跳转和镜头 JSON。资料卡、消息、读数、装订页、章节牌与操作台采用 [R41 组件规范](../../../style/COMPONENT-ART.md)。

在技能目录执行：

```sh
python scripts/video.py build modules/components/examples/guide
python modules/components/examples/style-atlas/build.py
```

打开本目录生成的 `build/index.html`。构建器可通过 `--project` 和 `--output` 指定源样例和输出位置。可选 `--reference-dir` 提供 R41 原帧截图，用于浏览器里的画面核对。截图由 [R41 随包播放器](../../../../examples/asking-motion/index.html) 取出，图册播放只用当前的编译源。
