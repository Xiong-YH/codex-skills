---
name: pixel-video-director
description: Turn an idea or existing script into a pixel game-style video through structured writing, storyboarding, production handoff, and evidence-based review. Requires the pixel-game-video foundation skill.
---

# Pixel Video Director

把创意写成可编辑工程，调用基础 skill 出片，再按证据回改。入口只做路由；写作数据、制作参数和 Review 分开维护。

| 当前任务 | 读取 | 执行产物 |
| --- | --- | --- |
| 新创意、脚本或分镜 | [创作合同](references/authoring.md)、[视觉叙事](references/visual-storytelling.md) | brief / script / storyboard / production-plan |
| 延续本项目的计算机知识口播 | [已确认的表达方向](references/computing-voiceover.md) | 将相关偏好带入 brief，按新主题设计画面 |
| 交接、预览、出片 | [基础依赖与命令](references/handoff.md) | video/ 中的 VideoSpec 与成片 |
| 审片、修改或继续已有工程 | [Review 与影响范围](references/review.md) | review.json 与定向源文件修改 |

1. 从用户已有产物继续；缺失信息可合理推断时记录在 brief，不设置逐阶段审批。
2. 文案只改 script，镜头时长与事件只改 storyboard，能力选择只改 production-plan。按 ID 引用，执行 `handoff` 生成 VideoSpec。
3. 基础能力通过 `doctor` 定位和基础 `catalog` 查询；超出已实现的场景需先补场景实现。依赖缺失明确报错。
4. `video/` 是生成物；沿 `source-map.json` 回改源文件。工具拒绝静默覆盖手改生成文件。
5. 审片绑定本次输入和 MP4 哈希；连续播放、文字核验和听音都要有实际证据，未检查记为 `not_reviewed`。

执行入口：[scripts/director.py](scripts/director.py)。结构模板在 [assets/templates/](assets/templates/)，完整样例：[12 秒选择机制](examples/bounded-choice/)、[缓存示意](examples/cache-journey/)、[缓存人物表演](examples/cache-adventure/)。样例主题与时长不是全局默认值。

跨空间叙事实例：[18 秒考研口播](examples/cs-postgrad-narrative-18s/)。复用其设计方法，题材、时长与转场组合按新工程决定。
