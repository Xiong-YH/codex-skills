# 游戏音效

保留已确认 G2 赛博竞技音色，默认无人声、无音乐；声音跟随可见事件。

| 文件 | 维护内容 |
| --- | --- |
| `catalog.json` | 音效 ID 和 variant 上限 |
| `game_audio.py` | 音符、包络、立体声写入 |
| `palette.py` | 十九类动作材质与音色 |
| `mixer.py` | 编译后帧事件混音、报告 |
| `preview.py` | 独立生成音色试听 WAV |

输入 cue：`id / sound / at(event+offsetFrames) / level / x / variant`。
`x` 是 0–1 的画幅横坐标，只做轻度声像展开；音量保持作者的相对关系。
机械触点用于选择；玻璃用于连接修复；电路故障用于异常；完成才加奖励层。
同类小变化用 variant，不同语义先换材质。

`python modules/audio/preview.py --out <临时目录>` 生成每个音色及试听索引。
`--silent` 或项目 silent 模式不生成、内嵌或复用旧音轨。
WAV 为 48 kHz 双声道，长度按完整视频帧数计算；尾音在片尾截断。
`sfx-events.json` 记录事件帧、采样点、音头长度、峰值和 RMS。

验收：听实际视频并检查关键动作同步；无削波、长气音或无理由的连续提示音。
嘴型独立于音效波形，见 [scenes](../scenes/GUIDE.md)。
