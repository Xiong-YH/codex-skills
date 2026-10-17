# 像素计算场景与缓存叙事试片

## 目标与实际结果

参考片的启发是让物体身份、状态变化与运镜共同解释概念。用户确认保留像素游戏画风，采用暗色、精致的计算主题环境，避免城市赛博背景；人物按叙事需要出现。本次以《缓存：让第二次访问少走一段路》做完整试片，6 镜、28.4 秒、1920×1080、60fps，包含中文合成旁白与事件音效。

此前的背景探索未验证这些背景与计算主题机制、旁白及转场合成后的效果。本次从已生成的 16 张中选 02 工作室与 03 服务器通道，在新目录完成交接、整片渲染、解码核验，再独立导出到另一空目录重建并渲染检查帧。环境与输入/成片哈希见 [核验记录](cache-narrative-verification.json)。

## 叙事与分层维护

| 时间 | 解释任务 | 可见变化与镜头 |
| --- | --- | --- |
| 0–4.9s | 提出重复访问问题 | 工作台上建立程序与原始数据的远距离关系；A 保留固定身份 |
| 4.9–10.1s | 第一次回源 | 推入原始数据锚点，切到冷色机房，沿长路径往返 |
| 10.1–14.6s | 保留副本 | 跟随同一 A 回到工作台，放大缓存，展示原件保留与副本落位 |
| 14.6–20.3s | 再次请求命中 | 保持世界关系，走近处短路径；读取后缓存仍留有 A |
| 20.3–23.7s | 未命中 | 金色 B 查询存有 A 的缓存，再回源读取，不混淆命中条件 |
| 23.7–28.4s | 收束概念 | 重复近处读取，稳定画面承载最后一句 |

没有常驻人物。前半用两次 `focus-punch` 改变景别与环境，后半主要依靠数据状态和路径变化推进，避免每句话都靠全屏特效。字幕位于运镜之外，旁白在前两次强转场结束后进入。

| 维护对象 | 位置 |
| --- | --- |
| 环境、色板与字幕皮肤 | `pixel-game-video/modules/style/pixel-computing.json`、`.js`、`assets/` |
| 终端、数据仓、缓存盒、A/B 数据块 | `pixel-game-video/modules/library/computing.js` |
| 六阶段数据状态和路径 | `pixel-game-video/modules/scenes/cache-journey.js` 与合同 |
| 运镜与强调 | 现有 motion 配方；样例 `production-plan.json` |
| 脚本、标签、事件、镜头意图 | director 样例的四份创作 JSON |
| 旁白文件与混音 | 样例 `media/`、基础 audio 的 `narration.py` |

两个 SKILL.md 继续只做路由。原始生成指令独立保存用于素材追溯，不成为执行长 prompt。新风格仅在本样例显式选择；已有工程与历史 32 秒、8 秒媒体保留。

## 旁白与可复跑工程

示例位于 [cache-journey](../skills/pixel-video-director/examples/cache-journey/brief.json)，随附 6 段 PCM WAV。试片语音通过 Windows System.Speech 的 Microsoft Kangkang、rate=1 合成；文本与生成信息记录在 `media/narration-source.json`。运行层只导入工程内相对路径 WAV，不要求 Windows TTS。更换声音后需按实际片长调整事件与字幕，再重新核验。

`narration+sfx` 模式校验 48kHz、16-bit、单/双声道 PCM，拒绝单说话人重叠和超出影片的声音。声音文件参与输入哈希，交接和独立导出都携带源 WAV；语音窗口压低音效。字幕按语句事件排布，不声称已完成音素或人物嘴型对齐。

按 [运行依赖](../skills/pixel-game-video/references/runtime.md)配置 Python、Node、浏览器、FFmpeg 与字体后，在仓库根执行：

```text
python -c "import shutil; shutil.copytree('skills/pixel-video-director/examples/cache-journey','work/cache-narrative')"
python skills/pixel-video-director/scripts/director.py handoff work/cache-narrative
python skills/pixel-game-video/scripts/video.py render work/cache-narrative/video
python skills/pixel-game-video/scripts/video.py inspect work/cache-narrative/video
python skills/pixel-video-director/scripts/director.py review-init work/cache-narrative --manifest work/cache-narrative/video/outputs/film-verification/render-manifest.json
python skills/pixel-game-video/scripts/video.py export-project work/cache-narrative/video work/cache-narrative-standalone
python work/cache-narrative-standalone/pixel-game-video/scripts/video.py build work/cache-narrative-standalone/project
```

目录已存在时应选新的工作目录，避免覆盖。独立工程包含源文件、素材和技能代码，运行时与字体仍需配置；本次只验证当前 Windows 环境，不扩大平台支持范围。

## 核验与待评估点

基础层 32 项、导演层 14 项测试通过；两个 skill 的结构校验通过。成片媒体核验 21 项通过，1704 帧的时间戳逐帧连续，H.264 与 AAC 音轨时长符合 28.4 秒。混音峰值 -5.756dBFS。独立快照在新目录重建、渲染第 1002 帧成功，已查看环境、素材和文字是否完整。

实际 MP4 解码的 122 张静帧覆盖端点、镜头交界、事件与运动起中止，逐张联系表和六句字幕的原尺寸代表帧已查看：未发现字幕截断、关键遮挡、黑边或 A/B 身份混淆。联系表：[01](verification/cache-contact.jpg)、[02](verification/cache-contact-02.jpg)、[03](verification/cache-contact-03.jpg)、[04](verification/cache-contact-04.jpg)。

审查范围是实际 MP4 解码帧与媒体技术检查，未完成连续实时观看和主观听音；review 的 text/technical 为 passed，content/visual/motion/audio 保留 not_reviewed，不把静帧和元数据冒充整体审片通过。

画面方向更接近暗色像素计算空间，数据身份与长短路径有助于理解。前景道具仍比背景简化，场景层次、物体与环境的接触关系、合成旁白自然度，以及强转场的连续观感需要用户实看片后判断。路径长短是解释比喻，不代表硬件实测延迟；本片不展开缓存一致性、容量与淘汰策略。
