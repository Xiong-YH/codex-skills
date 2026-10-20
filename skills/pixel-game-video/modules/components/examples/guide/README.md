# 组件指南的独立参考工程

本工程是 [组件指南](../../GUIDE.md) 内参考图的可编辑源，使用基础 skill 的当前引擎实际渲染。包括十二类组件、流程链与清单组合、代码与标注组合，共十四镜；每镜 240 帧。静音和中性背景仅用于文档对照，不作为视频项目默认值。

| 文件 | 内容 |
| --- | --- |
| project.json | 1920×1080、60fps、pixel-editorial 风格与静音模式 |
| timeline.json | 组件布局、文字内容、镜头与事件 |
| text.json / audio.json | 本示例不使用独立字幕或声音 |
| gallery.json | 各示例截图的镜头、局部帧、标题与状态取帧 |
| media/azong.png | 身份卡引用的已确认 V3 阿棕原始图副本 |

这是 `authoringMode=direct` 工程，组件文字写在 timeline.json；导演工程仍遵守 script.json 与 storyboard.json 的分工。示例中的人物、主题、数值、配色和片长均不升级为通用默认。

从 `pixel-game-video/` 目录运行：

```sh
python scripts/video.py validate modules/components/examples/guide
python scripts/video.py build modules/components/examples/guide
node modules/components/render-reference.cjs
```

打开本工程生成的 `build/film.html` 可播放和拖动检查。修改组件数据或事件后，先重新 build 再生成参考图；渲染脚本会核对目录覆盖和 HTML 输入哈希，并遍历全部帧检查运行错误。

参考图位于 `../../assets/reference/`，来源清单记录源文件哈希、取帧和图片哈希。脚本沿用基础 skill 的 Playwright 依赖及 `PIXEL_NODE_MODULES`、`PIXEL_BROWSER_EXECUTABLE` 配置。依赖说明见 [运行文档](../../../../references/runtime.md)。

截图与状态拼图用于选型和静态验收，不表示声音、连续播放或用户审美认可。对比组的 `sourceShot` 使用前两镜最终画面；条形比较中的数值已在画面中标为示意。
