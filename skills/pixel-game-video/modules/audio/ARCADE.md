# 九种正式常用音效

这是 [Garden 声音设计](GARDEN.md) 中可选的一组材质，适合需要电子主体、鼓点和回弹的触点。九种均为 48kHz、16-bit、双声道固定 WAV，`variant=0`，制作时读取母版并校验哈希。

| ID | 时长 | 适用触点 | 避用 |
| --- | --- | --- | --- |
| `arcade-select` | 0.202s | 有效选择确认 | 仅浏览焦点；与轻选择叠加 |
| `arcade-pickup` | 0.420s | 需要强调资源离开原位 | 每次搬运都配起落双声 |
| `arcade-seat` | 0.420s | 关键抵达、落槽 | 未抵达就确认；与同结果奖励叠加 |
| `arcade-launch` | 0.535s | 短启动、空间打开 | 持续蓄力；每次面板入场 |
| `arcade-reject` | 0.430s | 操作被阻止、碰壁 | 允许继续的普通提醒 |
| `arcade-reward` | 0.840s | 重要完成、阶段结算 | 每格进度或小步骤 |
| `arcade-confirm-soft` | 0.180s | 重要小按钮的轻确认，含鼓点 | 与 arcade-select 或额外鼓点叠加 |
| `arcade-focus` | 0.230s | 重要焦点移动并锁定 | 普通浏览、连续游走逐项配音 |
| `arcade-unfold` | 0.320s | 结构逐层揭示 | 与 arcade-launch 叠加；逐张卡片播放 |

## 来源与素材边界

- 原六种及电子/鼓点/回弹分层见 [基础清单](assets/arcade-motion/manifest.json)。母版保持原 PCM，三个分层已经包含在完整声音里，不要再与母版叠加；分层不要分别归一化。
- 新增三种见 [常用扩充清单](assets/common-motion/manifest.json)。轻选择来自旧 `select/variant=1`，含短低鼓和45ms轻鼓边回拍；焦点移动来自 `focus-step/0`，系统展开来自 `system-unfold/0`。正式注册保存最终试听字节，使用独立 ID；新增三种只提供完整母版。
- 九种素材随 skill 打包，工程锁定实际使用的母版。旧 G2 ID 为历史工程兼容保留。可调音色走独立的 [合成入口](SYNTHESIS.md)，选型时可与这里的固定母版搭配。

来源、哈希及认可范围以 manifest 与 [迭代记录](../../references/iteration-history.md) 为准。原子试听认可不等于新片混音已验收；音量与执行边界见 GUIDE。

## 试听

从本 skill 根目录执行：

```sh
python modules/audio/preview.py --out <试听目录>
python modules/audio/gallery.py --out <单文件试听目录>
```

`preview.py` 默认导出九种及原六种分层。`--bank arcade-core` 选原六种，`--bank common` 选另外三种，`--bank library` 一起试听 Garden 的 33 种合成音色。`gallery.py` 导出包含九种、18 个分层、配乐、人声参考和规范快照的单文件 HTML。
