# 制作合同 v1

结构约束来自 `engine/models.py`；`schemas/*.schema.json` 由 `scripts/video.py schemas` 导出。编译器还检查跨文件引用、事件边界和执行能力。

| 文件 | 唯一拥有的内容 |
| --- | --- |
| project.json | 标题、编写模式、画幅、帧率、风格、种子、声音模式、renderBackend |
| timeline.json | 镜头时长、场景、人物/物体引用、组件、项目背景/替换素材、事件、运镜 |
| text.json | 字幕、注释、标题、标签及讲解短句 |
| audio.json | 音色、强度、声像和事件绑定 |

看 `assets/project-template/` 的 Canvas 实例及 `assets/remotion-project-template/` 的原生 React 实例。所有坐标 x/y 为画幅归一化的 0..1；Canvas 世界图层在 320×180 绘制，文字在 1920×1080 绘制；Remotion 在同一输出画幅用 SVG/HTML 绘制像素形体。当前只接受这一尺寸组合，fps 可为 30 或 60；实际测试范围见运行说明。

`project.renderBackend` 可为 `canvas`（缺省兼容旧工程）或 `remotion`。它选择基础层执行器，不改变时间线所有权；不能把 Canvas 场景自动包装成 Remotion。后端能力不对等，未支持的场景、素材组合和运动会在编译时拒绝，见 [Remotion 能力范围](remotion.md)。

每镜头 `durationFrames` 为正整数；`events` 是镜内相对帧，自动具有 `enter=0` 和 `exit=durationFrames`。外部引用为 `{ "event": "s01.enter", "offsetFrames": 6 }`。场景 params 内的事件使用本镜 local ID。

镜头、文字、动作区间统一为 `[startFrame,endFrame)`。音效起点不能等于总片长；转场只从后一个镜头 enter 开始，占用后一个镜头的时间，不另延长片长。碎屏需要前一镜头。

`subtitle` 的 `phrases` 使用拼音短句，生成模拟讲述节奏计划；当前 V3 静态人物尚未接入口型图集，不会随计划张嘴。字幕内容与拼音需要一起改。其他文字角色可不提供 phrases。单说话人字幕不能重叠。

`build/resolved-timeline.json` 是唯一运行时间线；`build/project-lock.json` 记录四份输入与运行代码/素材哈希。生成物不可作为下一轮编写源。

direct 工程可以编辑四份输入。director 工程通过源映射验证四份生成文件和创作源的哈希；任意手改/上游变更会要求重新 handoff。

镜头 `actor:null` 表示人物不出镜；Canvas 机制采用居中放大的构图，Remotion 书桌保留场景固定布局。省略 actor 则沿用默认人物。全景转场作用于整幅场景，字幕独立；轻面板转场限于 scenes 目录定义的内容舞台。
