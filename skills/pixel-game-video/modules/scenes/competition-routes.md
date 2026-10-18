# 竞赛投入与选择

`scenes.competition-routes.v1` 与 `style.pixel-competition.v1` 组合。当前项目使用 `cinematic` / `gameplay`；旧 `paced` 和未指定模式的基础画面保留兼容。已否定的 `spatial` 不再接受，旧工程通过原快照复现。认可范围与失败依据统一见 [迭代记录](../../references/iteration-history.md)。

| phase | 基础环境 | cinematic / gameplay 环境 | 解释任务 |
| --- | --- | --- | --- |
| question | workspace | workspace | 建立投入路径 |
| training | training | workspace | 节点连接、编码与验证 |
| cost | atlas | workspace | 有限时间的分配与挤占 |
| trial | atlas | workspace | 短期试练与复盘 |
| project | workshop | workshop | 代码生成、输出校验交付物 |
| decision | atlas | atlas | 两个前序镜头作为判断材料 |

公共 params：`phase,environment,heading,kicker,startEvent,completeEvent,sourceShots`。场景拥有道具布局，`objects` 为空；startEvent 早于 completeEvent。decision 的 sourceShots 是两个不同的前序镜头，其余阶段为空；右卡 `.54,.30`、宽 `.29`，可由 scene-to-card 接住前一镜。

`labels[3]` 在基础 / paced / project / decision 中必填；全画幅的前四阶段不使用它，可省略。已有三项标签继续接受，便于旧源工程重建。文案仍通过 script.labels 引用。

## 当前全画幅模式

`presentation:"cinematic"` 使用正面统一相机，房间、人物和独立卡片一起等比变换。题板300:146、时间卡81:94、日历263:123的固有比例全程固定。镜头从题板近景转到三卡布局，再跟随已有日历卡进入近景；阅读时停止运镜。前三种交接仍是本场景实现，尚无通用 recipe。

四个阶段事件 `settleEvent,readEvent,prepareEvent,handoffEvent` 依次递增：落稳后显示标题，句尾准备下一镜。镜头事件是唯一时间源。`budgetLabel,calendarLabel,prepareLabel` 在此模式不使用，可省略；旧工程已提供的字段仍作文本校验。

`competition-routes.js` 显式分派；前四阶段由 `competition-cinematic.js` 绘制完整世界，project/decision 使用 `competition-paced.js`，基础图卡来自 drawBase。无 draw 覆盖链，也不依赖旧 spatial 或 WebGL。`competition-cards.js` 保存无局部倾斜的固定尺寸纹理；相机和布局仍归 cinematic，反馈状态归 feedback。

## 游戏反馈

`presentation:"gameplay"` 沿用 cinematic 的比例与相机，在 question/training/cost/trial 增加 [六类反馈](GAME_FEEL.md)。project/decision 使用 cinematic，不把 gameplay 当作全场景开关。

`feedbackCues` 每项含 `kind,index,startEvent,hitEvent,endEvent`，满足 start < hit < end；触点不得落在 exit。同类 index 从0起且不重复，主动作依序，允许节点抵达后的微小回弹与下一段信号重叠。

| phase | cues | 必需 feedbackLabels |
| --- | --- | --- |
| question | focus×1 | boardTitle、idle、active、passed、checks、boardFooter |
| training | node×4、confirm×1 | question 的六项，加 budgetUnit、competition、course、project |
| cost | transfer×3 | training 的十项，加 calendarTitle、calendarFooter、settled |
| trial | milestone×2、settle×1 | budgetUnit、competition、course、project、calendarTitle、calendarFooter、settled |

只绘制当前布局中的纹理；允许旧源提供表内其他阶段的已知标签，但不接受未知键。所有标签均由 script.labels 引用。

本例有12枚筹码，编号05、09、06从课程、项目、课程转至竞赛，4/4/4成为7/2/3；源、途中、目标保持一份，总量含在途始终12。14天日历是另一单位，不与预算格等价转换。跨主题时重新设计数量和状态规则。

## 兼容 paced

`presentation:"paced"` 保留固定题板内的连续变化；cost/trial 环境改为 training，仍使用上述四个阶段事件。它的额外标签按实际阶段填写：training 需要 prepareLabel；cost 需要 budgetLabel、prepareLabel；trial 需要 budgetLabel、calendarLabel；其他阶段不强制。新增制作优先使用当前全画幅模式。

音效按 [ARCADE](../audio/ARCADE.md) 选择，并绑定同一动作事件。独立声音认可、项目混音和完整视听 review 分别核验。
