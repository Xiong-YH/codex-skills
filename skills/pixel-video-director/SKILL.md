---
name: pixel-video-director
description: 把创意或既有文案转成像素视频的可见动作、构图光影、运镜转场与视觉分镜，也可交接结构化工程、出片、审片和定向修复。增强画面感、把抽象观点演出来或迁移参考片手法时使用；制作交接与出片依赖 pixel-game-video。
---

# Pixel Video Director

把观点设计成观众看得懂的画面，再写入可编辑工程、调用基础 skill 出片，并按证据回改。用户只要视觉方案或分镜时，交付设计即可；需要制作时再进入工程与基础依赖流程。

| 当前任务 | 读取 | 执行产物 |
| --- | --- | --- |
| 新创意、脚本或分镜 | [创作合同](references/authoring.md)、[视觉表达方法](references/visual-system.md)、[视觉叙事](references/visual-storytelling.md) | 先确定信息关系、组件/场景和主体变化，按范围交付分镜；需要制作时写四份创作源 |
| 只做画面方案、加强画面感或局部接镜 | [视觉表达方法](references/visual-system.md)、[视觉叙事](references/visual-storytelling.md)、[视觉分镜与工程映射](references/visual-storyboard.md) | 交付主体状态变化、构图光影、运镜、前后承接与素材需求；已有工程沿用其源文件 |
| 背景生成、用户素材或局部替换 | [视觉表达方法](references/visual-system.md)、[素材替换](references/media-replacement.md) | 固定基调和样板，按镜头选择项目素材 |
| 选人物、人设或动作表演 | 按基础依赖定位 `modules/library/CHARACTERS.md` | 当前五人角色分工、动作参考与半身仿真人使用范围；能力状态以素材库为准 |
| 转场选型或设计 | [视觉叙事](references/visual-storytelling.md)；实现时按基础依赖定位其 `modules/motion/TRANSITIONS.md`，再读所选配方 | 写清前镜交出、后镜接住、动作阶段与落稳后的讲解事件 |
| 学习《深度工作》参考片的画面方法 | [参考片观察](references/deep-work-case.md) | 迁移母题、光影、尺度与语义承接；新主题重新选择人物、道具和场所 |
| 加强游戏感与操作反馈 | 按基础依赖定位其 `modules/scenes/GAME_FEEL.md` | 按状态选择细节，安排触点事件与声音，保留试用/认可状态 |
| 音效、配乐与混音 | 按基础依赖定位其 `modules/audio/GUIDE.md`；街机＋鼓点读 `ARCADE.md`；延续计算机口播系列时读 [配乐要求](references/computing-voiceover.md#配乐要求) | 先确认声音素材，再设计项目事件、音量与旁白关系；按本项目已确认要求选择配乐 |
| 延续本项目的计算机知识口播 | [已确认的表达方向](references/computing-voiceover.md) | 将相关偏好带入 brief，按新主题设计画面 |
| 交接、预览、出片 | [基础依赖与命令](references/handoff.md) | video/ 中的 VideoSpec 与成片 |
| 审片、修改或继续已有工程 | [Review 与影响范围](references/review.md) | review.json 与定向源文件修改 |

1. 从用户已有产物继续；缺失信息可合理推断时记录在 brief，不设置逐阶段审批。
   新分镜用 `visual` 明确观众疑问、表达形式、主体、动作、理解结果与承接；具体参数仍须选已实现能力。卡片可承载图像和场景，背景由本镜任务决定，不把样板当固定背景。
   纯设计没有音轨时标明建议时长；不为交付分镜强制建工程或运行 doctor。设计附件不能成为已有工程的第二份时间线，映射规则见视觉分镜参考。
2. 工程阶段文案只改 script，镜头时长与事件只改 storyboard，能力选择只改 production-plan。按 ID 引用，执行 `handoff` 生成 VideoSpec。
3. 制作时通过 `doctor` 定位基础能力并查询 `catalog`；超出已实现的场景需先补场景实现。依赖缺失明确报错。
4. `video/` 是生成物；沿 `source-map.json` 回改源文件。工具拒绝静默覆盖手改生成文件。
5. 审片绑定本次输入和 MP4 哈希；连续播放、文字核验和听音都要有实际证据，未检查记为 `not_reviewed`。

分析新参考片需查看真实画面，运镜和转场需核对连续片段或前后帧；无法取得素材时，明确未确认内容，可继续提供标为新设计的方案。设计稿、生成素材、已实现能力和审过的成片分别记录，参考手法不自动成为引擎能力。

执行入口：[scripts/director.py](scripts/director.py)。结构模板在 [assets/templates/](assets/templates/)，完整样例：[12 秒选择机制](examples/bounded-choice/)、[缓存示意](examples/cache-journey/)、[缓存人物表演](examples/cache-adventure/)。样例主题与时长不是全局默认值。

信息组件源例：[基础五类](examples/component-system/brief.json)、[新增七类与组合](examples/component-expansion/brief.json)。从表达关系选型，不把示例的排列、题材或背景作为固定模板。

跨空间叙事实例：[18 秒考研口播](examples/cs-postgrad-narrative-18s/)。复用其设计方法，题材、时长与转场组合按新工程决定。


历史插图素材与失败复盘：[32 秒 AI 行业短片](examples/ai-industry-32s/)。其中配角开场口播、姓名条、多姿态切换和细线串点导航已撤回，不能作为新片默认方案。计算机口播按系列规则由单一主角固定姿态只开闭嘴，配角用于插图；先在 brief.singleNarrator 声明讲述者与隐藏姓名，顶部使用实心矩形进度条。
