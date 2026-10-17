# 局部转场问题复核与整幅修复

输入为 `4fb5401` 的 18 秒成片。用户指出局部转场割裂，检查其实际 MP4 第 216 帧即可复现：右侧矩形把放大的墙面和道具贴在原房间上，桌面、灯与墙面在边缘断开；人物仍锁在原景别，画面没有统一相机。第 528 帧的场景墙同样只在右侧区域发生。旧报告已追加用户否定记录，旧 review 的 visual 改为 failed 并定位 sourceRef。

此前对“人物站着口播”的解释有误。它限制人物的独立肢体活动，不能推导为转场期间锁死人物屏幕坐标。人物区域像素固定、首尾一致、无透明边缘等测试都不能证明空间关系或观感合格。

## 修复范围

- 移除背景裁片执行路径，两项 stage 配方标记 unavailable，防止继续按旧默认制作。
- 本片改用完整画幅的急推、场景墙后拉和再次急推，房间、人物、物体遵循统一镜头。人物仍原地讲述，没有跑跳取物；外围场景墙不重复独立人物层。
- 急推增加可选 incoming 焦点与倍率，学位帽切点两侧接近同一位置和尺寸，再拉回新构图；电脑到目标图案同样从焦点特写回落，避免大特写突然跳回中景。
- 纠正导演入口、创作合同、场景参考及 review 指引；图文面板的轻交接仍保留，连续房间不做局部裁切。四句文案、四份 PCM、混音、片长及原人物素材保留。

参数仍在 production-plan；镜内事件仍在 storyboard；算法在 motion；画面合成在 player；没有增加长 prompt。

## 复跑

按基础 runtime 参考配置依赖后，在仓库根运行：

```text
python -c "import shutil; shutil.copytree('skills/pixel-video-director/examples/cs-postgrad-18s','work/cs-postgrad-world-transitions')"
python skills/pixel-video-director/scripts/director.py handoff work/cs-postgrad-world-transitions
python skills/pixel-game-video/scripts/video.py render work/cs-postgrad-world-transitions/video
python skills/pixel-game-video/scripts/video.py inspect work/cs-postgrad-world-transitions/video
node skills/pixel-game-video/tests/world-transitions.cjs
```

目录已存在时改用新目录，保留旧片。证据与审查范围见 [本次核验](world-transitions-verification.json)。被否定的局部版本保留于忽略工作目录与历史提交，不能作为当前视觉方案。

## 本次检查结果

实际成片为 18.0 秒、1920×1080、60fps、1080 解码帧，21 项媒体及源码绑定检查通过。旁白四个 WAV、script 与混音 WAV 均与上一版字节一致。基础层 37 项、导演层 14 项测试、两个 skill 的结构校验通过；84 帧合成器检查只用于验证统一画幅、图库人物层、首尾状态及随机拖动，不据此判断观感。

已查看实际 MP4 的三段密集序列：[学位帽](verification/world-transition-1.jpg)、[完整场景墙](verification/world-transition-2.jpg)、[电脑到目标](verification/world-transition-3.jpg)；以及每 0.25 秒一张的全片序列：[0–6 秒](verification/world-overview-1.jpg)、[6–12 秒](verification/world-overview-2.jpg)、[12–18 秒](verification/world-overview-3.jpg)。房间不再保留局部缩放矩形边界；学位帽切点两侧以特写承接；稳定讲述的人物仍原地站立。另检查四张原尺寸字幕帧，文字完整可读。

独立导出工程在新目录重建，单独渲染第 217 帧焦点切入与第 528 帧场景墙，和完整渲染的源 PNG 均为 0 差异像素。技术参数和解码序列检查仅代表这些已检查项；未完成连续实时播放和主观听音，整体 review 仍为 not_reviewed。已确认的矩形背景割裂作为局部 visual 问题记录修复通过，不将整类运动审查标为通过。
