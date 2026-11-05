# 非3D运镜移植试样

日常选型和调用使用[HTML动态规范](../../modules/motion/lab/index.html)，不需要翻阅抽帧图。

24秒，1920×1080，60fps，静音。八段分别演示推近、平移、冲击、震动、回全景、
连续关键帧、二维内容组与页面接续。用于实现与导入一致性核验，不代表叙事成片或用户审美认可。
背景和道具沿基础库，不复制上游美术。

```text
python scripts/video.py build examples/pulse-motion
node --test tests/pulse-motion.test.cjs
node tests/pulse-pixels.cjs outputs/pulse-motion
python scripts/video.py workbench examples/pulse-motion
```

像素检查需要 `@napi-rs/canvas`，按现有环境设置 `PIXEL_NODE_MODULES`；浏览器与工作台依赖见基础运行说明。
工作台导入后可编辑镜头 cameraJson 和独立转场 paramsJson；保存重开，最终从工作台导出。
试样保留源字幕便于一致性比较；这不替代正式片的默认字幕方案。

64个实际执行器取样帧已检查源合成／工作台分层一致性、像素不透明和随机跳帧确定性。
首尾、8种片段及页面转场的完整播放与导出记录以本次实际核验为准；未获用户审美确认。

能力边界和参数见[配方说明](../../modules/motion/recipes/pulse-camera.md)，
上游来源、改动与AGPL许可见[NOTICE](../../modules/motion/FRAMETELL-NOTICE.md)。
