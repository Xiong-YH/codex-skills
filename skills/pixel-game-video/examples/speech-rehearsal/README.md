# 模拟口播：命中缓存

10 秒技术试样，无旁白，带一次事件音效。不是正式成片；用于验证先估口播、后在剪映配音的同步机制。

```sh
python scripts/video.py build examples/speech-rehearsal
```

打开 build/film.html 播放。文案为“第二次，直接命中缓存。”；默认 60 fps，模拟句首第 30 帧，“命中”第 111 帧，句尾第 187 帧。

- 对象组件的 focusEvent、画面“命中！”标记和一次音效绑定 s01.hit。
- 相机提前 17 帧启动，在 hit 时落稳，随后保持。
- 普通字幕按整句保留，accent 仍是已有静态外观参数，不声称实现逐字高亮。
- 修改 timeline.json 的 rehearsal.unitsPerSecond（例如 3.0），重新 build，所有引用一起跟着移动；不用分别改动作的秒数。原镜头保留 10 秒，不自动缩短阅读或拉长。

该试样只演示拍点，不代替正式片的字幕选型、剪辑和视听验收。导演源、工作台剪辑分支和剪映没有自动回写。完整参数与边界见 [模拟口播同步](../../references/speech-rehearsal.md)。
