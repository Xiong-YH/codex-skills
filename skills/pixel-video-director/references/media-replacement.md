# 按镜头替换素材

风格要求、时序和素材文件分开维护。production-plan.shots 的两个可选字段：

- `background`：替换背景，保留场景、人物与组件。
- `replacement`：替换整个镜头画面，保留组件和独立字幕；原场景与人物暂不绘制，清除此字段即可恢复。

```json
{"id":"s2","actor":null,"objects":[],"motions":[],
 "background":{"file":"media/room.png","kind":"image","fit":"cover","dim":0.15}}
```

支持 PNG/JPG/WebP 与 MP4/WebM。视频源音轨不加入混音，原旁白/音效继续播放；需要源声音时另提供符合旁白合同的 WAV。`fit=cover` 等比铺满、`contain` 保留完整画幅；`anchorX/anchorY`（0–1）选择裁切焦点，`dim`（0–0.85）控制压暗。

以下入口导入素材、只改指定镜头的选择，执行 handoff 并验证；失败恢复原计划，导入文件留在 media/ 可继续使用：

```text
python scripts/director.py replace-media PROJECT s2 --file NEW_IMAGE --layer background
python scripts/director.py replace-media PROJECT s2 --file NEW_VIDEO --layer replacement --trim-start 1.2
python scripts/director.py replace-media PROJECT s2 --file SHORT_VIDEO --layer replacement --hold-last-frame
python scripts/director.py replace-media PROJECT s2 --clear --layer replacement
```

默认视频必须覆盖镜头长度；hold 明确允许不足时保持最后一帧。不会自动加速、循环、截断字幕或改变后续镜头。时长也要改变时回改 storyboard 和事件，再交接。重新 build 后显式导入工作台，剪辑并导出当前版本后审片；直接 render 仅作源合成对照。当前仍完整重建，没有帧缓存拼接。

替换文件字节也会使输入哈希和审片证据失效。交接、独立导出会带上引用素材；不写个人机器绝对路径。按新的素材重新核对 visual 意图与构图。

当前边界：视频依赖浏览器解码，导出逐帧等待 seek，FFprobe 校验源时长。多镜 mosaic 不支持视频源。竞赛 cinematic/gameplay 自带全景调度，暂不支持这些覆盖字段；新自由构图使用 scenes.canvas.v1。
