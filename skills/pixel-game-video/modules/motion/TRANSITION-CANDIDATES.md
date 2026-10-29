# 转场研究档案（非日常选型入口）

日常设计读[转场入口](TRANSITIONS.md)，不要按本文的旧编号直接制作。本文仅供研究方法、核对来源或追溯实验；首轮候选和被否定试样不自动成为recipe，历史推荐不覆盖当前选择。

2026-10-29。下方首轮10项是**研究候选**，不是可写入VideoSpec的recipe；当前9项的正式映射见页首链接。已阅读来源的原理、示例说明及效果参数；没有把未连续观看的网页教程宣称为完整视频审片。HTML 中的动画是本项目的新适配试样，不是原作者成品或插件效果的逐帧复刻。

参考动作与交接方式，不照搬其三维、模糊、闪光或材质。保持当前像素密度、受光和空间关系；不恢复已撤回的阵列俯看或书架横移。

| 候选 / 设计索引 | 来源中的方法 | 本体系适用场景与设计 | 边界 |
| --- | --- | --- | --- |
| 01 图形匹配切 `design.graphic-match.v1` | 相同轮廓、位置或颜色承接；[Adobe](https://www.adobe.com/uk/creativecloud/video/discover/match-cut.html)、[School of Motion](https://schoolofmotion.com/blog/match-cuts) | 圆形计时器接圆形流程节点；同一标记从案例进入总结 | 先匹配首尾构图，直接切换，不靠溶解掩盖不对位 |
| 02 动作接力切 `design.action-match.v1` | 在动作中切镜并延续方向；[School of Motion](https://schoolofmotion.com/blog/six-essential-motion-design-transitions-tutorial) | 光标点击后切到结果、物体落位接下一场景中的同一物体 | 方向、速度和动作阶段接得上；需分别准备前后动作素材 |
| 03 快速横甩 `design.whip-pan.v1` | 高速横向运动连接镜头；[Boris FX 原创课程](https://vfx.borisfx.com/sapphire-essentials-creating-transitions) | 突然发现另一侧的问题、观点反转、并行地点交接 | 整幅统一运动；用短像素拖线替代大面积柔糊，不倾斜扭曲房间 |
| 04 实物遮挡切 `design.object-occlusion.v1` | 动作遮挡隐藏切点；[School of Motion](https://schoolofmotion.com/blog/six-essential-motion-design-transitions-tutorial)、[Apple 动态遮罩](https://help.apple.com/motion/mac/5.0/help/English/en/motion/usermanual/chapter_20_section_16.html) | 已建立来源的箱盖、门扇或经过镜头的道具覆盖焦点时接新景 | 不是复活书架横移；遮挡物必须由内容需要产生，需真实素材与遮罩 |
| 05 明暗揭示 `design.luma-reveal.v1` | 按亮度生成遮罩；[Apple Luma Keyer](https://support.apple.com/en-gb/guide/motion/motn14b9a05a/6.4/mac/26.6)、[Boris FX Luma Dissolve](https://cdn.borisfx.com/borisfx/download_files/Sapphire-Users-Guide-AE.pdf) | 灯亮后从亮区显露新场景、从局部证据进入结论 | 亮度顺序有动机；像素小块取样，避免人脸和文字长期残缺 |
| 06 像素块消散 `design.block-dissolve.v1` | 随机块透明化；[Adobe Block Dissolve](https://helpx.adobe.com/after-effects/desktop/apply-effects-and-animation-presets/list-of-effects/transition-effects.html#block_dissolve_effect) | 数据清除、缓存更新、旧状态被替换 | 是平面遮罩，不是场景缩成卡墙；块大小服从画风 |
| 07 光线扫接 `design.light-sweep.v1` | Light Wipe / Line Sweep；[Adobe 转场](https://helpx.adobe.com/after-effects/desktop/apply-effects-and-animation-presets/list-of-effects/transition-effects.html)、[Boris FX Glow](https://vfx.borisfx.com/sapphire-essentials-creating-transitions) | 扫描、检验完成、同方向的信息递进 | 一次窄光带携带揭示边缘，不用整屏白闪或持续频闪 |
| 08 时钟扇形擦接 `design.clock-wipe.v1` | 径向旋转遮罩；[Adobe Radial Wipe](https://helpx.adobe.com/after-effects/desktop/apply-effects-and-animation-presets/list-of-effects/transition-effects.html#radial_wipe_effect) | 日程、倒计时、周期结束后进入下一阶段 | 扇形与时间语义相关，不给普通换话题套时钟 |
| 09 分条错峰擦接 `design.staggered-bands.v1` | 条带遮罩；[Adobe Venetian Blinds](https://helpx.adobe.com/after-effects/desktop/apply-effects-and-animation-presets/list-of-effects/transition-effects.html#venetian_blinds_effect)、[Premiere Band Slide](https://helpx.adobe.com/premiere/desktop/add-video-effects/effects-and-transitions-library/list-of-video-transitions.html) | 多项并列、对照页进入下一组、界面重组 | 只移动遮罩，不把连续背景切成各自变形的实体条 |
| 10 纹理扩散揭示 `design.texture-wipe.v1` | 灰度纹理控制显露顺序；[Adobe Gradient Wipe](https://helpx.adobe.com/after-effects/desktop/apply-effects-and-animation-presets/list-of-effects/transition-effects.html#gradient_wipe_effect) | 纸上墨迹扩散、地图显露、旧记录进入新篇章 | 纹理需匹配纸张或当前材质；使用像素阶梯边缘，不直接套写实水墨 |

首轮当时的试验建议（历史，非当前推荐）：01图形匹配、02动作接力、05明暗揭示、06像素消散。它们可以由内容驱动，也容易保持二维画风。03、07属于明显重音，需控制出现频率。04依赖专用遮挡素材；08依赖时间语义；09、10需看中途是否遮字。

书页铺屏的优化判断：旧实现突然生成一本无来源的大书、中心书脊和网络图，视觉焦点被虚构道具抢走；先建立页面来源，再让**一张薄页＋翻起的边角＋全遮挡时换景＋扫离后的明确落点**承担动作。当前执行已移除书脊、纸堆和网络图，补了折角与较短的铺屏阶段，仍是待反馈试样。参考 [Premiere Page Peel / Page Turn 分类](https://helpx.adobe.com/premiere/desktop/add-video-effects/effects-and-transitions-library/list-of-video-transitions.html)，不宣称达到插件级纸张曲面或三维物理效果。文档脱敏片已明确禁用的地方不恢复。

## 第二轮：4个强特效方向

用户认为第一批不够绚丽后，另做四项独立像素适配试样；它们不改变上面10项的候选身份，也未注册引擎配方。

| 方向 | 参考与迁移 | 用途 |
| --- | --- | --- |
| 雷电撕幕 | [DissolveZap](https://borisfx.com/documentation/sapphire/ofx/dissolvezap/)；分叉电弧、余辉与粒子配合裂口遮罩 | 系统觉醒、突破、观点反转 |
| 能量冲击波 | [DissolveUltraGlow](https://borisfx.com/documentation/sapphire/ofx/dissolveultraglow/)；多层辉光思路配合径向揭示，是新组合 | 关键结果、章节高潮 |
| 辉光燃烧 | [FilmBurnTransition](https://borisfx.com/documentation/sapphire/ofx/filmburntransition/)；借鉴热光和边缘材质，改成平面像素火线与余烬 | 旧规则作废、记录消失 |
| 棱镜闪切 | [DissolveGlintRainbow](https://borisfx.com/documentation/sapphire/ofx/dissolveglintrainbow/)；彩色光谱、斜向耀斑与星芒收束 | 章节开场、重要结论 |

四项都在完整像素背景上试，不旋转、拉伸或扭曲房间。只核对了来源图文原理与本地关键状态，不宣称复刻插件或完整审过原教程。**后续用户明确认为这批效果老土，指出高级感不能用特效夺目代替；四项均已否定，不再作为本轮推荐方向。**

## 国内资料学习入口

本轮先学习镜头之间的关系、构图、运动承接与节奏，不继续堆叠特效。以下资料尚不代表新的已实现或已认可配方。

| 资料 | 学习重点 |
| --- | --- |
| 崔小骏：[动态设计的转场心法](https://www.zcool.com.cn/article/ZMTExMzE1Mg%3D%3D.html) | 从OUT／IN关系分析遮、移、承、切；重点理解两镜为何这样接 |
| OK_先生：[五种MG动态设计转场分析总结](https://www.zcool.com.cn/article/ZNzQ3NDI4.html) | 遮挡、局部与整体、变形和元素承接；筛选适合二维画风的例子 |
| 视频设计师MG先生：[MG入门系列02：《飞碟说》转场技巧分析](https://www.bilibili.com/video/BV12s411m7Sh/) | 科普内容的图形交接与叙事连贯；当前只核对标题与作者简介 |
| 安戈力：[《了不起的传承》实拍结合MG动画](https://www.zcool.com.cn/work/ZNzM2MDEyNDg%3D.html) | 制作方说明药碗与保温杯的匹配交接；学习含义延续，不照搬实拍风格 |
| 优设：[UI转场过渡动效设计必知的6大设计原则](https://www.uisdc.com/transition-animations-practical-guide) | 速度、层级与强调的控制；仅提炼适合视频的细节 |

核对日期2026-10-29。摘要依据检索可读的作者图文、案例说明与视频简介；站酷和优设直接读取存在robots／403限制，B站直接页面返回412。未连续观看动画GIF或视频，不能据此确认每一段示例的视觉质量。

## 当前优先参考9项

本节保留旧链接入口；当前选型以[转场库](TRANSITIONS.md#内容交接选型)为准，已接入的格式与限制查[内容交接配方](recipes/content-handoffs.md)。原HTML坐标、轮次编号与关键帧数量不是制作参数或能力合同。

来源对应：新版01、02、03、04、07提炼自OK_先生的局部、变形与元素过渡；05、08、10提炼自崔小骏的遮、承与软切；09参考安戈力制作说明中的对象与含义延续。这是项目重新设计，未逐帧复刻原作者动画。迭代过程和删除原因只在[历史记录](../../references/iteration-history.md)追溯。
