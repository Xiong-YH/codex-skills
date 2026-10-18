---
name: pixel-video-director
description: Turn an idea or existing script into a pixel game-style video through structured writing, storyboarding, production handoff, and evidence-based review. Requires the pixel-game-video foundation skill.
---

# Pixel Video Director

把创意写成可编辑工程，调用基础 skill 出片，再按证据回改。入口只做路由；写作数据、制作参数和 Review 分开维护。

| 当前任务 | 读取 | 执行产物 |
| --- | --- | --- |
| 新创意、脚本或分镜 | [创作合同](references/authoring.md)、[视觉表达方法](references/visual-system.md)、[视觉叙事](references/visual-storytelling.md) | 先确定信息关系、组件/场景和主体变化，再写四份创作源 |
| 背景生成、用户素材或局部替换 | [视觉表达方法](references/visual-system.md)、[素材替换](references/media-replacement.md) | 固定基调和样板，按镜头选择项目素材 |
| 选人物、人设或动作表演 | 按基础依赖定位 `modules/library/CHARACTERS.md` | 当前五人角色分工、动作参考与半身仿真人使用范围；能力状态以素材库为准 |
| 转场选型或设计 | 按基础依赖定位其 `modules/motion/TRANSITIONS.md`，再读所选配方 | 写清交接主体、动作阶段与落稳后的讲解事件 |
| 加强游戏感与操作反馈 | 按基础依赖定位其 `modules/scenes/GAME_FEEL.md` | 按状态选择细节，安排触点事件与声音，保留试用/认可状态 |
| 音效设计与混音 | 按基础依赖定位其 `modules/audio/GUIDE.md`；街机＋鼓点读 `ARCADE.md` | 先确认独立声音原子，再设计项目事件、音量与旁白关系；已确认库可直接选用 |
| 延续本项目的计算机知识口播 | [已确认的表达方向](references/computing-voiceover.md) | 将相关偏好带入 brief，按新主题设计画面 |
| 交接、预览、出片 | [基础依赖与命令](references/handoff.md) | video/ 中的 VideoSpec 与成片 |
| 审片、修改或继续已有工程 | [Review 与影响范围](references/review.md) | review.json 与定向源文件修改 |

1. 从用户已有产物继续；缺失信息可合理推断时记录在 brief，不设置逐阶段审批。
   新分镜用 `visual` 明确观众疑问、表达形式、主体、动作、理解结果与承接；具体参数仍须选已实现能力。卡片可承载图像和场景，背景由本镜任务决定，不把样板当固定背景。
2. 文案只改 script，镜头时长与事件只改 storyboard，能力选择只改 production-plan。按 ID 引用，执行 `handoff` 生成 VideoSpec。
3. 基础能力通过 `doctor` 定位和基础 `catalog` 查询；超出已实现的场景需先补场景实现。依赖缺失明确报错。
4. `video/` 是生成物；沿 `source-map.json` 回改源文件。工具拒绝静默覆盖手改生成文件。
5. 审片绑定本次输入和 MP4 哈希；连续播放、文字核验和听音都要有实际证据，未检查记为 `not_reviewed`。

执行入口：[scripts/director.py](scripts/director.py)。结构模板在 [assets/templates/](assets/templates/)，完整样例：[12 秒选择机制](examples/bounded-choice/)、[缓存示意](examples/cache-journey/)、[缓存人物表演](examples/cache-adventure/)。样例主题与时长不是全局默认值。

信息组件源例：[基础五类](examples/component-system/brief.json)、[新增七类与组合](examples/component-expansion/brief.json)。从表达关系选型，不把示例的排列、题材或背景作为固定模板。

跨空间叙事实例：[18 秒考研口播](examples/cs-postgrad-narrative-18s/)。复用其设计方法，题材、时长与转场组合按新工程决定。
