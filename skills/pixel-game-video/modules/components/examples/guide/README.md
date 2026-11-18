# R41 组件图册源镜头

这个可编辑的 Canvas 工程提供 20 类组件和 22 段预览。资料卡组、并排对照、消息上推、收件计数、进入练习和纸签跨镜都由实际镜头和事件驱动。

- `project.json` 定义画幅和帧率。
- `timeline.json` 保存组件、动作事件及一组两镜交接。
- `gallery.json` 保存播放范围、取帧和动作节点。
- `text.json` 和 `audio.json` 是此静音样例的空轨。

从技能目录运行 `python scripts/video.py build modules/components/examples/guide`。接着按 [图册构建](../style-atlas/README.md) 打开交互预览。
