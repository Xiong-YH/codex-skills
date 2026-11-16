# 组件：任务入口

组件是可独立摆放、组合、运动或改变状态的视觉单元：物体、图像、文字、光效及其组合均可，不以外框或界面结构为前提。

## 职责边界

本模块拥有组件结构、局部状态与表现。风格规范由 style 提供，素材身份由 library 提供，文字排版复用 text；组件定义动作含义，可复用的几何运动归 motion。整镜叙事和跨对象业务关系由 scenes 编排，公共时间线和混音不进入本模块。

新组件和局部改版先按 style 的 [组件共同画风](../style/COMPONENT-ART.md) 明确材质、厚度、接触与主次，再落实本模块结构/状态。原图库尚未整体重构，旧参考不表示新画风已经全部实现。

## 按任务读取

| 当前任务 | 只读取相关内容 |
| --- | --- |
| 后端、编辑方式、示例与验证边界 | [统一能力目录](../../references/capability-catalog.md)；运行 python scripts/video.py catalog components --capabilities |
| 选择基础组件风格与特性 | [基础组件：风格、样式与可选特性](BASIC-COMPONENTS.md)。纸质适合文字身份卡、清单与结论卡 |
| 查看全部可运行样式与自定义集合 | [完整范例集](examples/style-atlas/README.md)：84 个基础实例（含朴素十二类）与堆叠、五维动作试样 |
| 通用动作时长与节拍 | [motion 动作节拍](../motion/TIMING.md)；组件保留状态含义，不另立时长表 |
| 从脚本判断复用、组合或新机制，设计自定义组件 | [脚本驱动设计与五维](DESIGN.md) |
| 普通片段少字、延续已确认的组件风格 | [设计约定与认可对照](DESIGN.md#少字与组件风格延续)；含同对象机械／能量试样 |
| 实现可暂停、倒拖、复用的自定义试样，准备工程接入 | [自定义实现协议](CUSTOM-RUNTIME.md)；[状态仪表完整例子](examples/state-meter/design.md) |
| 查看实体牌组、悬停印章与任务试做台 | [面试牌桌统一预览](examples/interview-components/index.html)，含五维约定、两种布局与本地表单试做；当前是独立试样 |
| 复用已认可的物体效果 | [物体组件与调用边界](OBJECT-COMPONENTS.md) |
| 确认画风、查看已认可的动作样例 | [画风与动作案例](REFERENCES.md) |
| 查基础组件字段、语义或效果图 | [十二类效果图与选型](INFORMATION-COMPONENTS.md#先看效果再选组件)，按所选 kind 查阅 |
| 写入已有信息组件的执行参数 | [参数与接入](INFORMATION-COMPONENTS.md#参数与接入)，并查询 `python scripts/video.py catalog components` |
| 更新信息组件实现后的参考图 | [参考图来源与更新](INFORMATION-COMPONENTS.md#参考图来源与更新) |

设计中的广义组件与执行字段 `shot.components` 不等同：后者目前只有十二类已实现的信息组件。实物效果按实际能力使用 library/object、场景绘制或项目素材合成；缺口先实现与核验，不虚构 kind 或参数。基础字段以当前模型和合同为准；自定义设计与实现协议不是新增 kind 的许可。脚本需要新机制时主动设计和补齐，不以现有十二类限制可表达内容。

## 验收重点

对照可运行样例检查起态、变化、末态和停留阅读；同镜物体与背景的尺度、材质和接触关系须成立。独立 Canvas 试样不代表已接入工作台。

全片分轨、保存重开和最终导出统一按 [工作台](../../references/workbench.md) 验证，本页不表示已完成当前项目验收。新增能力查 [模块维护](../../references/module-development.md)，职责调整查 [归属与迁移清单](../../references/module-ownership.md)。
