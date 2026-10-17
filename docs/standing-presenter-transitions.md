# 固定侧边人物与强转场

**此方案已于 2026-10-18 被用户否定。** 右侧背景裁片破坏了连续房间的空间关系；下文为 `4fb5401` 的历史实验记录，不再作为制作指导。技术指标通过不代表该视觉方案合格。修复见 [整幅转场复核](world-transitions-review.md)。

输入基线：`76b80c4` 的 18 秒《计算机，要不要考研？》。首版遵守了人物站立口播，却把之前确认的强转场换成 28 帧轻滑动与 32 帧小窗口。复现使用其实际 MP4 解码帧与 storyboard/production-plan：人物固定正确，景别变化强度不足。两项要求必须同时保留。

## 本片的修改

| 起点 | 转场 | 叙事作用 |
| --- | --- | --- |
| 3.3s | 36 帧，沿学位帽急推 7 倍 | 从两个方向进入读研条件，以同一物体承接 |
| 8.4s | 48 帧，拉远成 5×5 场景墙，再推入中心 | 重新查看路线，再聚焦就业实践 |
| 13.2s | 36 帧，沿项目电脑急推 6 倍 | 从实践画面切入目标与岗位判断清单 |

只变换右侧约六成画幅的背景与内容；02 暖棕蓬发人物仍固定在左侧，仅嘴型与眨眼。配音四个 WAV 与 script 字节不变，片长仍为 18 秒；字幕、模拟嘴型与声音事件跟随重新安排的旁白起点。进入新镜的主物体提前显露，旁白在转场落位后开始。

## 维护位置

- motion：两个 stage 配方复用已有急推、场景墙算法，不复制运动曲线；参数登记与验证同步更新。
- scenes/player：内容舞台裁片含该区背景和图文，排除人物及字幕。缩略图库同样排除人物，场景在 catalog 声明自己的裁片范围。
- director：镜内事件在 storyboard，运镜与声音在 production-plan；brief、创作合同与视觉叙事记录两项并行约束。没有增加一段大 prompt。

## 复跑与证据

先按基础 skill 的 runtime 参考配置运行依赖、字体、浏览器与 FFmpeg，在仓库根运行：

```text
python -c "import shutil; shutil.copytree('skills/pixel-video-director/examples/cs-postgrad-18s','work/cs-postgrad-strong-transitions')"
python skills/pixel-video-director/scripts/director.py handoff work/cs-postgrad-strong-transitions
python skills/pixel-game-video/scripts/video.py render work/cs-postgrad-strong-transitions/video
python skills/pixel-game-video/scripts/video.py inspect work/cs-postgrad-strong-transitions/video
python skills/pixel-game-video/scripts/video.py export-project work/cs-postgrad-strong-transitions/video work/cs-postgrad-strong-transitions-standalone
python work/cs-postgrad-strong-transitions-standalone/pixel-game-video/scripts/video.py build work/cs-postgrad-strong-transitions-standalone/project
node skills/pixel-game-video/tests/stage-transitions.cjs
```

目录已存在时换新目录，保留旧片。实际媒体参数、源码绑定、人物区域比较与独立工程复现见 [核验记录](standing-presenter-transitions-verification.json)。旧版媒体与首版核验记录保持原样；这里只声明当前配置的 Windows 实验结果。

本次成片为 18.0 秒、1920×1080、60fps、1080 解码帧，21 项媒体与源码绑定检查通过。基础层 36 项、导演层 14 项测试通过；两个 skill 的结构校验通过。84 帧裁片 fixture 检查首尾精确、舞台外固定、无透明边缘、乱序采样一致和显著焦点放大。

浏览器源画面检查覆盖三次转场的全部 120 帧，另含 5 张稳定帧：人物头发、躯干与脚所在区域差异字节数为 0，每帧只绘制一次人物，图库未调用人物绘制。导出工程在干净目录重建并单独渲染第 528 帧，和完整渲染的场景墙中间帧比较，2,073,600 个像素差异为 0。

从实际 MP4 密集解码三次转场共 120 帧，并查看其代表联系表：[急推读研](verification/standing-transition-1.jpg)、[场景墙转就业](verification/standing-transition-2.jpg)、[急推判断清单](verification/standing-transition-3.jpg)。另查看四句字幕的原尺寸解码帧。text/technical 为 passed；未完成连续实时播放与主观听音，其余整类 review 保持 not_reviewed，不以技术检查或静帧代替。
