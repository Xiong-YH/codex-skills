# 18 秒考研视频：跨空间叙事实验

基线是 `c3b16e1` 的 `cs-postgrad-world-transitions`。用户指出：虽然改成整幅运镜，仍只在一个背景里来回缩放，视觉叙事太单调。旧 production-plan 的三次交接为 focus-punch / mosaic-pullback / focus-punch，四镜均沿用工作台。新版本保留旁白、18 秒时长和站立人物，重设场所、道具状态与交接关系。

## 镜头设计

| 时间 | 空间与内容 | 转场承担的关系 |
| --- | --- | --- |
| 0–3.3s | 书桌：打开的书与电脑并列，人物站左侧提出问题 | 先建立两条路线 |
| 3.3–8.4s | 暖金研究档案馆：书中展开论文节点，学位帽配合研究/学历条件 | 书页放大铺满，在遮挡中换景，再扫开进入研究空间 |
| 8.4–13.2s | 青绿开发工坊：代码逐行生成，出现项目交付档案 | 两个完整房间横移，中间实体书架挡住交界；原人物先退出，新人物再显露 |
| 13.2–18s | 俯视路线桌：研究与项目的真实镜头成为两张图卡，连接到目标和岗位要求 | 工坊整幅收成右卡，前面的场景变成结尾的判断材料 |

前三镜角色只站立、眨眼和模拟口型；末镜人物不单独出镜。转场为 36 / 48 / 36 帧，新字幕和旁白都在落位后开始。没有缩放连续背景的局部裁片，也没有把同一房间重复成场景墙。

## 模块与来源

- 创作源：[cs-postgrad-narrative-18s](../skills/pixel-video-director/examples/cs-postgrad-narrative-18s/brief.json)，与旧例并存。
- 场景：[study-routes](../skills/pixel-game-video/modules/scenes/study-routes.md)，拥有道具布局、论文/代码状态和真实镜头卡；文字仍由 script.labels 维护。
- 转场：[narrative-handoffs](../skills/pixel-game-video/modules/motion/recipes/narrative-handoffs.md)，单独执行书页、横移与图卡交接。
- 风格：[pixel-study.json](../skills/pixel-game-video/modules/style/pixel-study.json)，三个新背景和一个前景书架用内置 image_gen 生成；原图已保存在 style/assets，完整提示词见 [study-scenes-prompts.json](../skills/pixel-game-video/modules/style/assets/study-scenes-prompts.json)。背景/道具通过 480×270 像素网格合成，文字保持输出分辨率。
- 音频：沿用四份 PCM 旁白，重新绑定纸页、横移、落卡及内容完成的提示音。语义与语音原字节不变，口型仍非真实音素对齐。

## 复跑

按现有运行文档配置 Python、Node、Playwright、浏览器、FFmpeg 与字体；从仓库根复制样例到一个新的忽略目录：

```text
python -c "import shutil; shutil.copytree('skills/pixel-video-director/examples/cs-postgrad-narrative-18s','work/narrative-rerun')"
python skills/pixel-video-director/scripts/director.py handoff work/narrative-rerun
python skills/pixel-game-video/scripts/video.py render work/narrative-rerun/video
python skills/pixel-game-video/scripts/video.py inspect work/narrative-rerun/video
python skills/pixel-game-video/scripts/video.py export-project work/narrative-rerun/video work/narrative-export
python work/narrative-export/pixel-game-video/scripts/video.py build work/narrative-export/project
```

当前交付在忽略目录 `work/cs-postgrad-narrative/video/outputs/film-v2.mp4`，独立快照在 `work/cs-postgrad-narrative-standalone-v2`。初次编码审片发现结尾连接点碰到文字，已缩短连线重新完整输出。初次编码仍保留在 work，未覆盖。不宣称完成 Windows 通用适配。

## 核验范围

媒体、时间戳、源绑定、音轨、运行环境和 SHA256 见 [本次核验数据](narrative-transitions-verification.json)。完整解码 1080 帧，保存三段转场全部 120 帧和全片 4fps 抽帧；检查转场联系表 [书页](verification/narrative-transition-1.jpg)、[横移](verification/narrative-transition-2.jpg)、[落卡](verification/narrative-transition-3.jpg)，以及 [全片 1](verification/narrative-overview-1.jpg)、[2](verification/narrative-overview-2.jpg)、[3](verification/narrative-overview-3.jpg)。四句字幕另查原尺寸解码帧。

基础合同测试累计 40 项、导演层 14 项通过；新转场合成器覆盖 120 帧，原整幅转场回归覆盖 84 帧。检查了遮挡完整性、精确首尾、随机跳帧可复现、图卡拒绝当前/未来镜头引用。独立快照重建的第 528、950 帧与本次源 PNG 逐像素一致。

解码序列能检查构图、文字、切点和明显拼接问题，不代表主观听音或连续实时观看已通过。Review 的 text/technical 按实际证据填写；其余整类保留 not_reviewed。新版是可观看和继续评审的设计实验，不预先宣布用户审美验收通过。
