# 资料 A 的两次读取

16 秒无口播示例。第一次读取从工作台去源站，资料回来时落一份副本，第二次读取直接用副本。小棕在普通 Canvas 场景走到卡边触发状态，同一张资料卡在两个场所间交接。

| 时间 | 动作 |
| --- | --- |
| 0–4 秒 | 小棕走到资料卡，2 秒触卡并显示缓存未命中。 |
| 4–8 秒 | 沿原卡进机房，4.5 秒落位，5 秒显示源站已取回。 |
| 8–12 秒 | 原卡回到工作台，9 秒在旁边落本地副本。 |
| 12–16 秒 | 视线移到本地副本，13.5 秒小棕触卡并显示命中。 |

[编剧源](script.json) 保存叙事段、主句与标签。[分镜](storyboard.json) 用同一组事件安排触点和阅读。[制作选择](production-plan.json) 接入走位、手部触点、纸质组件、交接、火花、晕染、掠光和分轨声音。

## 构建两种预览

在仓库根目录执行下列 PowerShell 命令。项目目录可自行替换。运行环境沿基础技能的 [运行说明](../../../pixel-game-video/references/runtime.md)。

```powershell
$cacheDemo = 'work/beat-driven-cache'
New-Item -ItemType Directory -Path $cacheDemo -Force | Out-Null
Get-ChildItem -LiteralPath 'skills/pixel-video-director/examples/beat-driven-cache' -Filter '*.json' -File |
  Copy-Item -Destination $cacheDemo
node skills/pixel-game-video/modules/audio/bgm-system/build.mjs --out "$cacheDemo/music" --preset pulse
python skills/pixel-game-video/scripts/video.py import-bgm $cacheDemo --source "$cacheDemo/music/pulse.wav"
python skills/pixel-video-director/scripts/director.py check $cacheDemo
python skills/pixel-video-director/scripts/director.py handoff $cacheDemo
python skills/pixel-game-video/scripts/video.py build "$cacheDemo/video"
```

打开 `video/build/whitebox.html` 和 `video/build/film.html` 查看相同事件与声音下的构图、动作和阅读。两个入口共用同一个 inputHash。用 `video/build/sfx-events.json` 的采样位置对照 `music/pulse.beats.json`，再看 2 秒、9 秒和 13.5 秒的触发。正式剪辑与导出沿 [工作台](../../../pixel-game-video/references/workbench.md)。
