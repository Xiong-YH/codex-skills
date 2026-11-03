# 完整组件范例集

本集调用正式基础组件执行器，不另画一套宣传稿。基础示例来自 [guide](../guide/README.md) 的十二类输入，选择一种风格和一种样式，按需加堆叠。职责与字段仍见[基础规则](../../BASIC-COMPONENTS.md)和[信息合同](../../INFORMATION-COMPONENTS.md)。

在 `pixel-game-video/` 目录运行：

```sh
python scripts/video.py build modules/components/examples/guide
python modules/components/examples/style-atlas/build.py
```

打开生成的 `build/index.html`；也可给 `build.py --output PATH` 写入已有预览入口。输出为自包含的局部参考页，附真实工作坊背景和已认可原齿轮，不依赖本机绝对路径。缓存不提交。

- 十二类 × 机械／能量 × open／inset／relay：72 个基础实例；堆叠开关共 144 种配置。
- 当前选择可播放、逐帧、复制组件 JSON；同内容六样式对比，全部图库可展开。
- [参考配置清单](variants.json)记录每例源镜头与覆盖字段；图片、事件和前镜快照仍由 guide 工程提供，复制到新项目时同步接入。
- 自定义单列：筹码入托盘（当前五维动作范例）；供能加工装配（历史认可的混合外观，新制作须按单风格重设计）。独立场景不伪装成新的 `shot.components.kind`。
- [六样式总览图](../../assets/reference/style-atlas/overview.jpg)由本集的实际执行器捕获；状态、哈希与验证范围见同目录 manifest.json。

样式是可复用的组织手法，不是外框白名单。用户已认可本轮合集；后续新内容和布局仍需核验。技术测试、参考取帧与正式视频审片分别记录。

## 生成时只看选中样式的实际参考

| 风格 | 开放 open | 一体 inset | 传递 relay |
| --- | --- | --- | --- |
| 机械 | [十二类无框并列](../../assets/reference/style-atlas/mechanical-open.jpg) | [十二类一体铭牌](../../assets/reference/style-atlas/mechanical-inset.jpg) | [十二类齿条揭幕](../../assets/reference/style-atlas/mechanical-relay.jpg) |
| 能量 | [十二类开放刻度](../../assets/reference/style-atlas/energy-open.jpg) | [十二类玻璃铭牌](../../assets/reference/style-atlas/energy-inset.jpg) | [十二类充流揭幕](../../assets/reference/style-atlas/energy-relay.jpg) |

[章节运动状态对照](../../assets/reference/style-atlas/chapter-states.jpg)只提供关键取帧，动态播放以 HTML 为准。在构建本集后运行 `node modules/components/render-atlas.cjs` 更新图片与源文件哈希。参考配置、执行器或素材改变后重新捕获，不能沿用旧图证明当前实现。

## 脚本驱动的自定义范例

[复合仪表与条块散落](../state-meter/index.html)独立展示需求→五维→状态/绘制→试样的完整路径，源码与边界见其[设计记录](../state-meter/design.md)。本合集不把它计入基础 kind 或样式数量，也未将其接入工作台。

## 朴素原版

另含十二类 `visualStyle: "plain"` 范例，不选机械／能量三样式，也不叠加 stack。共 84 个基础范例、156 种配置。[朴素十二类总览](../../assets/reference/style-atlas/plain.jpg)由原版绘制器实际捕获。界面选择“朴素 / 无风格”即可查看与复制参数。
