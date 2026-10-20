# 声音与混音

声音绑定可见事件。[游戏音效选型库](ARCADE.md)包含已确认的6种街机＋鼓点基础动作。AI按语义、显著程度、主触点与间隔选型；后续扩展与蓄力候选未获认可，已退出可选库。原有19类G2材质仍可用于其他项目；完整25类／40个可用组合见 [catalog.json](catalog.json)。默认无旁白、无背景音乐。

| 文件 | 职责 |
| --- | --- |
| `catalog.json` / `palette.py` | 稳定ID、variant上限、音色选择与旧G2合成 |
| `arcade.py` / `assets/arcade-motion/` | 六个已确认母版、三层素材、设计参数与哈希 |
| `game_audio.py` | 合成基础、单声道放置、PCM写入 |
| `mixer.py` | 事件混音、保留原生立体声、混音报告 |
| `narration.py` | 项目内PCM旁白校验、对齐、平滑压低音效 |
| `music.py` / `import_bgm.py` | 项目配乐、音量、淡入淡出、循环与旁白压低；[配乐工作流](MUSIC.md) |
| `preview.py` / `preview.html` | 独立试听；`--bank arcade`或`arcade-core`导出已确认的六种及分层 |

## 事件与混音

输入cue为 `id / sound / at(event+offsetFrames) / level / x / variant`。`x`为0–1横坐标，只做轻度声像平衡。声音跟随选择、抵达、受阻或完成；配合 [游戏反馈细节](../scenes/GAME_FEEL.md) 按阶段发声，不为每个粒子配音。

街机母版已定音色和力度，混音器保留双声道与原始电平；旧G2单声道保留既有归一化和声像逻辑。两者再经事件level、旁白压低和总线处理。混音WAV为48kHz双声道，按视频帧数定长；片尾截断尾音，需预留奖励音的结束时间。`sfx-events.json`记录事件帧、采样点、时长、电平策略、旁白范围和最终峰值／RMS。

## 旁白与验收

本计算机口播系列的默认旁白音色为用户选定的“解说小帅”，原始试听与使用范围见 [旁白音色](VOICES.md)。其他项目按用户要求选声；音色参考不代替当前文案的旁白录音。

`project.audioMode="narration+sfx"`启用旁白；`audio.json.narration`填写 `id/file/at/gain`。file须为项目内相对路径，48kHz、16-bit、单或双声道PCM；旁白不得重叠或超出成片。录音／合成语音作为外部素材导入，skill不内置TTS。旁白参与输入哈希，独立导出携带WAV；嘴型与字幕仍按事件安排。

`audio.json.speechDuck`为旁白期间音效保留比例，0–1，缺省0.28；director在production-plan同名字段设置。它与cue.level都由项目混音决定，已确认音色不代表已确认成片音量。`--silent`或silent模式不生成、内嵌或复用音轨。

可选 `audio.json.bgm` 与导演的 `production-plan.bgm` 使用独立配乐对象。先用 `import-bgm PROJECT` 导入内置《Chill Wave》，再按 [配乐工作流](MUSIC.md) 配置事件区间、音量与淡化。Canvas 与 Remotion 共用该混音层；配乐自己的 `speechDuck` 与音效分别控制，旁白本身不被压低。

先独立试听声音原子，再听实际MP4检查同步、音量、清晰度和密度。技术指标与用户反馈分别记录，未主观检查的项保留 `not_reviewed`。嘴型能力见 [scenes](../scenes/GUIDE.md)。
