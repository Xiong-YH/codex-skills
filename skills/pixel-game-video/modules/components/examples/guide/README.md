# 组件指南的独立参考工程

本工程是 [组件指南](../../GUIDE.md) 内参考图的可编辑源，使用当前 Canvas 引擎渲染。共十七镜，每镜 240 帧，含十二类组件、两组组合、三种纯文字纸质组件。静音和中性背景用于文档对照。

原十四镜按[基础组件规范](../../BASIC-COMPONENTS.md)默认用机械风格。可切换能量或朴素风格。新增三镜供纸质范例使用，身份卡采用纯文字。机械、能量、纸质可用 open／inset／relay 和 `features: ["stack"]`。数值与条形完成运动后留阅读时间。

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
node tests/component-styles.cjs modules/components/examples/guide
```

打开本工程生成的 `build/film.html` 可播放和拖动。修改输入或执行器后重新构建，再运行取帧脚本。脚本校验工程锁及运行时哈希，运行每镜首末帧、事件前后一帧及间隔取样。

参考图位于 `../../assets/reference/`。来源清单记录后端、源文件和图片哈希、取帧、画幅及注册字体。取帧使用 `@napi-rs/canvas`，可用 `PIXEL_NODE_MODULES` 指向已有依赖目录，或在技能目录运行 `npm install --no-save --package-lock=false @napi-rs/canvas`。字体用 `PIXEL_REFERENCE_FONT_FILES` 指定，Windows 路径之间用分号，其他平台用冒号。浏览器测试用 Playwright 与 `PIXEL_BROWSER_EXECUTABLE`。通用配置见[运行文档](../../../../references/runtime.md)。

截图与状态拼图用于选型和静态验收，不表示声音、连续播放或用户审美认可。对比组的 `sourceShot` 使用前两镜最终画面；条形比较中的数值已在画面中标为示意。

四种风格的可用样式、堆叠和自定义动作见[完整范例集](../style-atlas/README.md)。
