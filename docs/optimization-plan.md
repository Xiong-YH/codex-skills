# 优化计划与证据基线

记录日期：2026-10-17。当前建立维护仓库，保留原始技能和本次实验，没有全面重构技能或完成 Windows 通用适配。

## 已确认的事实

| 项目 | 证据 | 结论与边界 |
| --- | --- | --- |
| 原始基线 | `assets/starter/`、`assets/reference/ai-programmer-32-v7.mp4` 及随包报告 | 保留原 32 秒示例；随包报告不能冒充本仓库重新执行的结果。 |
| 原始编码入口 | `scripts/render.py` 的平台判断与 Swift 调用 | 编码明确要求 macOS AVFoundation，Windows 会被拒绝。 |
| 本地实验 | `experiments/windows-render/` 及 `examples/small-steps-8s/` | 已通过 `@napi-rs/canvas` 逐帧绘制并调用 FFmpeg 编码。现有渲染器限定 8 秒、60 fps、1920×1080 和 480 帧。 |
| 本次成片 | `examples/small-steps-8s/reference/film.mp4` 与 `verification.json` | 报告为 8 秒、1920×1080、60 fps、480 个不同时间戳、H.264 视频及 AAC 48 kHz 双声道，`verified: true`。 |
| 音频一致性 | 示例 `reference/audio-verification.json` | 源音轨及解码音频均为 384000 个采样，时差 0，双声道相关系数大于 0.9999，无削波，`verified: true`。 |

这些结果只证明本次机器环境下的 8 秒实验。入库的实验副本已移除个人 runtime 与 FFmpeg 路径，支持正常模块查找、PATH 和环境变量；编码脚本只保留 `--encode-only`，不包含浏览器流程。路径清理后的预览与此前预览的 SHA-256 完全一致，复用 480 帧的编码冒烟也已通过。这些检查仍不代表在另一台机器完成验证。

## 本次应保留的复现材料

保留原包目录 `SKILL.md`、`agents/`、`assets/`、`references/`、`scripts/`，原始 32 秒参考素材不被 8 秒实验替换。

- `experiments/windows-render/`：`native-canvas-render.cjs` 与 `windows-render.cjs` 必须相邻，因为原生脚本按自身目录调用编码脚本。依赖版本和运行命令见该目录说明；实际 MP4 抽帧和音频对照流程的通用化留作后续任务。
- `examples/small-steps-8s/`：保留项目 JSON、字幕、嘴型短句、声音分数与事件、音频来源记录、`animation-sfx.wav` 及 `source/`。原生渲染直接加载 `pixels.js`、`assets.js`、`captions.js`、`mouth.js`、`visual.js`、`motion.js`、`film.js`，其中 `assets.js` 已内嵌角色素材。
- `reference/`：保留本次成片、封面、媒体与音频核验报告，以及 `render-metrics.json`、`decoded-frame-metrics.json` 和解码帧拼图。报告内的位置字段已转换为相对位置，数值结果保留；这些报告记录的是此前成片，不是未来修改的验证结果。

不复制 `build/`、逐帧 `frames/`、浏览器 profile、`__pycache__/`、解码 WAV、runtime 或 FFmpeg 二进制。编辑后仍需重新生成数据和媒体；现有报告不是未来改动的验证结果。

## 后续顺序

1. **固定基线。** 记录原 ZIP 散列、环境版本、输入、命令和结果；在干净目录复现 init/build。
2. **统一环境入口。** 基于实验副本已有的模块、PATH 和环境变量支持，统一 Python、Node、FFmpeg/ffprobe 与字体配置；在新环境验证依赖缺失提示和安装流程。
3. **决定 Windows 入口。** 比较原生 Canvas 与浏览器 Canvas 的绘制覆盖和字体差异，再选择最小实现，保留 macOS 既有入口。
4. **移除实验限定。** 按项目配置计算帧数和采样点，分别重跑 8 秒实验与原 32 秒种子，验证后再声明支持范围。
5. **媒体与表现核验。** 查看实际 MP4 的关键帧、转场、文字、角色与音频同步，保留失败证据。元数据通过不能替代视觉和听觉自审。
6. **更新技能说明。** 干净目录重跑成功后，再把已验证依赖、命令与限制写入 `SKILL.md` 和制作参考。

一次 8 秒主题《把大任务拆成小步》只作实验，不成为默认主题、默认片长或永久风格偏好。
