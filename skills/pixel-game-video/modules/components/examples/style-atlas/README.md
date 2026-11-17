# 完整组件范例集

图册从现有案例打开完整动作。先看物件怎样变化、何时交给下一步，再按需选信息组件的材质、样式和堆叠。基础范例从 [guide](../guide/README.md) 载入正式 Canvas 执行器与源镜头。字段见[基础规则](../../BASIC-COMPONENTS.md)与[信息合同](../../INFORMATION-COMPONENTS.md)。

在 `pixel-game-video/` 目录运行：

```sh
python scripts/video.py build modules/components/examples/guide
python modules/components/examples/style-atlas/build.py
```

打开生成的 `build/index.html`。`build.py --project PATH --output PATH` 可读取另存的参考工程并写到项目预览入口。HTML 内含工作坊背景、原齿轮、组件输入和可播放试样。

- 93 个范例、174 种配置。机械和能量有 72 个范例，含堆叠共 144 种。朴素有 12 个范例。纸质身份卡、清单和结论各有三种样式，含堆叠共 18 种。
- 当前选择可播放、逐帧和复制组件 JSON。数值、流程、清单和代码可以按 guide 已有注解跳到关键状态。可以对比同一组件的可用样式、切换背景和堆叠。
- [参考配置清单](variants.json)记录每例源镜头与覆盖字段；图片、事件和前镜快照仍由 guide 工程提供，复制到新项目时同步接入。
- 「按动作找组件」收纳五个可播放试样。状态交接、排队与积压、状态失效、转移与遮挡、逐件装配使用各自已收录的示例源。按[物体组件目录](../../OBJECT-COMPONENTS.md)查看案例的能力与认可范围。
- [章节样式对照](../../assets/reference/style-atlas/overview.jpg)、[朴素十二类](../../assets/reference/style-atlas/plain.jpg)和[纸质三类](../../assets/reference/style-atlas/paper.jpg)由同一 Canvas 执行器捕获，取帧和哈希见[清单](../../assets/reference/style-atlas/manifest.json)。

样式用于组织内容。早期合集和八组件美术试样的认可范围见[组件共同画风](../../../style/COMPONENT-ART.md#能力与验收)。当前图片记录技术取帧，新内容、布局和实际运动仍需审看。

## 生成时只看选中样式的实际参考

| 风格 | 开放 open | 一体 inset | 传递 relay |
| --- | --- | --- | --- |
| 机械 | [十二类无框并列](../../assets/reference/style-atlas/mechanical-open.jpg) | [十二类一体铭牌](../../assets/reference/style-atlas/mechanical-inset.jpg) | [十二类齿条揭幕](../../assets/reference/style-atlas/mechanical-relay.jpg) |
| 能量 | [十二类开放刻度](../../assets/reference/style-atlas/energy-open.jpg) | [十二类玻璃铭牌](../../assets/reference/style-atlas/energy-inset.jpg) | [十二类充流揭幕](../../assets/reference/style-atlas/energy-relay.jpg) |

[章节运动状态对照](../../assets/reference/style-atlas/chapter-states.jpg)提供关键取帧，完整动态可用 HTML 播放。构建 guide 后运行 `node modules/components/render-atlas.cjs` 更新图片与来源清单。捕获依赖见 [guide](../guide/README.md)，可选位置参数为参考工程路径和图片输出路径。

## 脚本驱动的自定义范例

[复合仪表与条块散落](../state-meter/index.html)展示从需求、五维设计到状态与绘制的过程。[凭条落槽与展开](../slot-transfer/index.html)展示同一对象的移交、触发和结果保持。两项均为独立 Canvas 试样。
