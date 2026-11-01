# 九种内容交接：正式 Canvas 源工程

18个镜头与9个转场；保留原编号01–05、07–10。无口播人物、无音轨，素材和文字仅为能力例子，不作为其他项目的题材、色调或背景要求。

`gallery.json`是示例导航索引；时长、事件、组件和转场仍只归`timeline.json`。当前五种component-handoff模式、line-handoff、preview-expand、panel-occlusion及cross-dissolve共同承载这九项，不把九项重复登记成九个通用滤镜。

在skill根目录执行：

```text
python scripts/video.py validate examples/content-handoffs
python scripts/video.py build examples/content-handoffs
python scripts/video.py workbench examples/content-handoffs
```

浏览器静态预览为构建后的`build/film.html`；工作台按项目命令启动。新配方的合同、限制、替换建议见[内容交接配方](../../modules/motion/recipes/content-handoffs.md)。正式成片从工作台剪辑导出。

验证：构建后设置`PIXEL_NODE_MODULES`为本机依赖目录，运行`node tests/content-handoffs.cjs`；结果写入忽略的`outputs/content-handoffs/`。Python使用`python -m unittest discover -s tests -p test_content_handoffs.py`。运行结果与覆盖范围以本次实际输出为准。

素材来源：`media/workshop.png`、`archive.png`复用style拥有的已有样板；`day-night-atlas.png`为本轮内置image_gen生成的双状态工作室，现有工作台只作像素材质参考，上半日景、下半夜景，由项目background的anchorY选择。两张图的个别细节有差异，不宣称逐像素注册。`stamp.png`、`ring.png`由[原生图形源](draw-symbols.cjs)生成，可重建；图形示意值68%不是现实统计。

目前已接入编译、构建、Canvas和独立转场单元；UI播放、保存重开与工作台MP4导出不以静帧或单元一致性检查代替。
