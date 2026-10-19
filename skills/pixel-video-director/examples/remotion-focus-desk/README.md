# Remotion 书桌样例

12 秒、60 fps、三镜的原生 React 场景试作。四份 JSON 仍分别拥有文案、镜头时间、能力选择和创作约束；`renderBackend=remotion` 只在制作计划选择，交接后进入基础层。

本例用同一书桌的状态变化演出：多项待办拥挤 → 选出一件并暂存其余 → 为它腾出连续工作空间。三项任务依次为「写方案」「回消息」「查资料」，第一项始终为主任务。主角沿用侧站静态素材；没有新增表演或旁白。

| 镜头 | 局部帧 | 动作与停顿 |
| --- | --- | --- |
| s1 overload | 0–239 | 36–126 帧待办进入并拥挤，24–144 帧轻推，之后落稳 |
| s2 choose | 0–239 | 0–48 帧书页铺屏换景，64–150 帧挑选/暂存，全镜保持上一镜的 1.08 景别 |
| s3 focus | 0–239 | 48–146 帧展开连续工作空间，0–144 帧从 1.08 放宽到 1.0 景别，随后保持 |

时间区间仍遵循 `[startFrame,endFrame)`；转场包含在 s2 的 240 帧内，全片共 720 帧。字幕与场景文字只在 `script.json` 维护。`phrases` 用于现有节奏合同，音频模式是 `silent`，不代表已配旁白。

从仓库根目录运行，`PROJECT` 是选择的临时工程目录；先复制本目录中的四份 JSON 到该目录，再交接。运行时依赖与 Remotion 命令以基础技能文档为准。

```text
python skills/pixel-video-director/scripts/director.py check PROJECT
python skills/pixel-video-director/scripts/director.py handoff PROJECT --foundation skills/pixel-game-video
python skills/pixel-game-video/scripts/video.py doctor --backend remotion
python skills/pixel-game-video/scripts/video.py build PROJECT/video
python skills/pixel-game-video/scripts/video.py studio PROJECT/video
```

在 Studio 中交互预览和调整。只有明确需要 MP4 时，再执行导出：

```text
python skills/pixel-game-video/scripts/video.py render PROJECT/video --name focus-desk
```

本目录保存创作源与设计意图，不包含 MP4、依赖缓存或审片结论。需要检查实际渲染的书页全遮挡、前后帧、文字、静态人物和连续播放后，才能标记视觉与运动 review。
