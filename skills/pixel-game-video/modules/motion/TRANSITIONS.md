# 转场：当前选型入口

日常只读本页和选中的配方。执行ID以[catalog.json](catalog.json)及`python scripts/video.py catalog motion`为准；`design.*`是设计索引，不能填入recipe。参数、引用和后端限制由编译器校验，素材语义与美术效果仍需实际检查。

## 内容交接选型

按前后镜头关系选择，不为每次换句增加动作。以下九种用法由四个新配方族和已有淡化承载，细节只读[内容交接配方](recipes/content-handoffs.md)。

| 关系／原编号 | 执行选择 | 何时优先使用 |
| --- | --- | --- |
| 01 同形主体匹配 | `motion.component-handoff.v1`，mode=`match` | 保留共同主体，优先于整屏匹配溶解；图形及含义须由素材提供 |
| 02 下划线接路线 | `motion.line-handoff.v1` | 一个判断引出步骤或路径 |
| 03 资料重组成比较 | `motion.component-handoff.v1`，mode=`reflow` | 同批对象重排，优先于普通滑页 |
| 04 预览展开为现场 | `motion.preview-expand.v1` | 已有真实现场预览时，优先于焦点冲入／装饰性窗口 |
| 05 档案面板遮挡 | `motion.panel-occlusion.v1` | 档案进入分析，优先替代无来源的书页铺屏 |
| 07 报告回到全貌 | `motion.component-handoff.v1`，mode=`overview` | 信息对象回到版面，优先于整景收卡 |
| 08 双栏结论合流 | `motion.component-handoff.v1`，mode=`merge` | 多个依据合成判断，优先于普通滑页 |
| 09 同构图昼夜变化 | `motion.cross-dissolve.v1`＋项目日／夜素材 | 天色、光源和状态共同表现时间，不只改数字 |
| 10 关键词成为标题 | `motion.component-handoff.v1`，mode=`keyword` | 同一个词接续下一层解释 |

这是选型优先级，旧工程不自动改写。配方可执行不等于任意素材均适配；原试样的正面反馈不代替本片验收。

## 仍有独立用途的基础与旧配方

| 用途 | 配方与用法 |
| --- | --- |
| 直接换镜／同镜继续 | 明写切点或保留关系，不需要添加motion |
| 柔和接续 | `motion.cross-dissolve.v1`；章节间隔用`motion.fade-through-black.v1`。[淡化](recipes/fades.md) |
| 普通信息分页 | `motion.panel-slide.v1`，保留背景和人物。[面板](recipes/panel-slide.md) |
| 阶段信息收拢、展开 | `motion.pixel-iris.v1`，限独立信息区。[窗口](recipes/pixel-iris.md) |
| 个体→集合→目标 | `motion.mosaic-pullback.v1`，须确有集合关系。[卡墙](recipes/mosaic-pullback.md) |
| 剧情打破障碍 | `motion.shatter-reveal.v1`，不作日常换页。[碎裂](recipes/shatter-reveal.md) |
| 明确的实体书页 | `motion.book-sweep.v1`；档案场景先考虑新版05。[书页](recipes/narrative-handoffs.md) |
| 完整场景纳入图卡 | `motion.scene-to-card.v1`，排除独立口播层；信息对象先考虑新版07。[图卡](recipes/narrative-handoffs.md) |
| 强烈进入一个焦点 | `motion.focus-punch.v1`，保留特定重音及旧工程用途。[冲入](recipes/focus-punch.md) |
| 整景缓慢溶解、保留首尾停顿 | `motion.match-dissolve.v1`，不具备自动主体匹配；主体交接先考虑新版01。[溶解](recipes/match-dissolve.md) |

## 范围与禁用

聚焦前移、卡堆展开、目标抽离这[三种空间设计](recipes/card-spatial-handoffs.md)只有竞赛cinematic／gameplay的专用实现，不能填写为通用recipe。

不自动恢复：两个`motion.stage-*`背景裁片、`motion.shelf-travel.v1`书架横移、本轮阵列拉远／俯看、原06信件动作接力，以及已否定的雷电、冲击波、燃烧和棱镜试样。单片限制仍以当前项目为准，不扩大为所有项目禁用合理运镜或特效。

脚本必须说明“前镜交出→变化过程→后镜接住→落稳阅读”，直切、同镜继续和首尾也要写。事件时间、轨道和执行规则见[运动指南](GUIDE.md)；风格按[组件与背景同框](../style/ART-DIRECTION.md#组件与背景在同一画面中定风格)核对。

仅在研究新方法或追溯反馈时读[研究记录](TRANSITION-CANDIDATES.md)／[历史](../../references/iteration-history.md)，它们不覆盖当前能力目录和本页选型。
