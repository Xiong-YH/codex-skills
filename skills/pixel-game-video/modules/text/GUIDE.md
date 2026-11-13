# 文字与排版：任务入口

负责字幕、标题、注释、标签及叙事进度覆盖层的测量、换行、布局和可读性，消费文案、事件区间与风格皮肤。

## 职责边界

文案和镜头时长归项目；style 提供字体/配色角色与皮肤，text 拥有实际安全区校验与排字。场景和组件复用排字能力，本模块不生成口型。

## 按任务读取

| 当前任务 | 读取入口 |
| --- | --- |
| 后端、编辑方式、示例与验证边界 | [统一能力目录](../../references/capability-catalog.md)；运行 python scripts/video.py catalog text --capabilities |
| 按场景选择字幕形式、画面文字及实现边界 | [表现选型](EXPRESSION.md) |
| 特殊字幕从屏幕前方砸入，落点震动并闪屏 | [景深砸入字幕](EXPRESSION.md#景深砸入字幕) |
| 普通字幕采用暖金关键词、下划线和左右渐隐底板 | [已认可基线与工作台执行器](SOFT-HIGHLIGHT.md)；工作台卡 `soft-highlight-caption`，支持编辑及 MP4 导出，不新增 VideoSpec 字段 |
| 防止选了方案却仍用临时白字 | [实际调用与导出检查](SOFT-HIGHLIGHT.md#实现边界与使用方式)；项目保存选型，导出检查实际卡 ID |
| 借鉴参考片中的字幕与反馈手法，并按新主题原创转化 | [可迁移手法参考](EXPRESSION.md#可迁移手法参考按主题重新设计)、[原创检查](EXPRESSION.md#参考转化与原创检查)；设计参考不等于固定效果预设 |
| 角色选型与布局 | [角色与排版细节](details.md)、[能力目录](catalog.json) |
| 位置、强调、换行、底板与事件区间 | [字段与绘制约束](details.md)、[公共合同](../../references/contract.md) |
| 让标题、重点词和标注随同一源进入白模 | [创作源中的单行标题与标注](details.md#创作源中的单行标题与标注) |
| 工作台 Canvas 的独立底板、富文本强调与旋转 | [工作台字幕属性](details.md#工作台-canvas-字幕属性)；不新增 VideoSpec 字段 |
| 全片叙事进度 | [叙事节点进度条](NARRATIVE-PROGRESS.md)；Canvas 支持，原生 Remotion 拒绝 |
| 字体皮肤与场景关系 | [风格](../style/GUIDE.md)、[场景](../scenes/GUIDE.md)；不把文字烘焙进背景 |

## 验收重点

核对小屏阅读、停留时间、换行、裁切、遮挡与旧字幕残留；连接线、边框和转场前景也须避字。超长文字拆句或回改时序，不靠极小字号挤入。

全片分轨、保存重开和最终导出统一按 [工作台](../../references/workbench.md) 验证，本页不表示已完成当前项目验收。新增能力查 [模块维护](../../references/module-development.md)，职责调整查 [归属与迁移清单](../../references/module-ownership.md)。
