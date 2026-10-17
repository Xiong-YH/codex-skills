# 暗色赛博游戏风格

## 问题与基线

用户确认偏好暗色、绚丽赛博朋克、有游戏感的高级画面。此前日光版虽改善明亮度，但浅青远山、沙色平台与奶油卡片缺少目标氛围；早期单调深蓝底也不符合需求。

沿用已核验的《先给选择设边界》12 秒工程作为对照：四镜、60fps、1920×1080；首镜有人物，后三镜由机制主导。旧日光样片在 `work/transition-cinematic/video/outputs/film-v2.mp4`，其哈希和核验记录见 [强转场核验](transitions-verification.json)。本次保持脚本、事件、字幕时序、嘴型、音效及三段强转场参数一致。

## 独立维护

| 内容 | 位置 |
| --- | --- |
| 风格选择与独立执行器 | `modules/style/catalog.json` |
| 配色、字幕皮肤、文字暗影 | `modules/style/cyberpunk.json` |
| 夜城背景、切角终端面板 | `modules/style/cyberpunk.js` |
| 环境图与生成指令 | `modules/style/assets/` |
| 数据档案、任务芯片、反应堆 | `modules/library/runtime.js` |
| 文字安全区和底板绘制 | `modules/text/runtime.js` |

夜城图由内置 imagegen 生成，直接复制入仓库；[来源与最终指令](../skills/pixel-game-video/modules/style/assets/README.md)独立保存，不塞进 SKILL.md。环境提供远近楼层、湿润屋顶、管线、冷暖反光与青色／洋红霓虹；前景机制使用深金属面板与精简发光接缝。背景细节更丰富，机制道具仍保留较粗的原生像素轮廓。

构建器按风格目录加载可选执行器，将风格图片内嵌为 data URI；路径须留在风格模块，资源 ID 不得覆盖人物素材。字幕在世界运镜之外合成；轻微暗影帮助无面板标签在城市细节前保持可读。卡片墙缝隙与压暗色单独配置，避免亮字色反转成白色墙底。

新建基础工程、director 模板和当前样例使用 `style.cyberpunk.v1`。日光版仍是独立的 `style.modern-pixel.v1`，原预设和执行器保留；已有工程不会被强行改写。导演工程回改 `production-plan.json` 后重新 handoff，直接工程修改 `project.json` 的 style。

## 复跑命令

按 [运行说明](../skills/pixel-game-video/references/runtime.md)配置 Python、Node、浏览器、FFmpeg 和字体；以下命令在仓库根执行，不绑定个人机器路径。

```text
python skills/pixel-video-director/scripts/director.py init work/cyberpunk-premium --example
python skills/pixel-video-director/scripts/director.py handoff work/cyberpunk-premium
python skills/pixel-game-video/scripts/video.py render work/cyberpunk-premium/video
python skills/pixel-game-video/scripts/video.py inspect work/cyberpunk-premium/video
python skills/pixel-game-video/scripts/video.py export-project work/cyberpunk-premium/video work/cyberpunk-standalone
python work/cyberpunk-standalone/pixel-game-video/scripts/video.py build work/cyberpunk-standalone/project
python -m unittest discover -s skills/pixel-game-video/tests
python -m unittest discover -s skills/pixel-video-director/tests
```

本次在新的工作目录完整渲染，再将独立快照导入另一空目录构建并渲染检查帧。具体环境、媒体检查、审查范围与哈希记录见 [本次核验](cyberpunk-verification.json)。未据此扩大平台支持范围。

基础层 28 项、导演层 13 项测试通过。两张 [解码联系表](verification/cyberpunk-contact.jpg)与[组装及推进联系表](verification/cyberpunk-contact-02.jpg)覆盖 55 张关键帧，另查看原尺寸静帧。未进行连续实时播放或主观听觉复审；音效源 WAV 与上一版逐字节一致。

独立重建的第 660 帧已检查，和连续渲染对应源帧存在 156 个边缘像素差异（共 2,073,600 像素，平均通道差 0.000039）；画面、文字和资源完整，不宣称跨渲染逐像素一致。
