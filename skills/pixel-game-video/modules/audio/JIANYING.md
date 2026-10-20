# 从剪映获取默认旁白

计算机口播系列默认使用**剪映专业版 → 文本朗读 → 解说小帅（中文·平淡）**。有可用的剪映桌面环境时，直接操作剪映生成当前脚本，不要求用户另找配音工具。原始试听是声音对照，不能替代新台词。

## 生成与导出

1. 通过可用的原生应用控制工具定位“剪映专业版”，新建独立配音草稿。存在多个相同 bundle ID 时，从应用清单选主应用，避开 framework/helper。不要改动用户已有草稿。
2. 点击“文本 → 新建文本 → 默认文本”，用卡片右下角的加号加入时间线。仅点卡片可能只是在预览，需确认时间线出现文本片段。
3. 选中片段，点击右侧文本输入框，全选并粘贴 `script.cues[].text` 的本次台词。确认界面实际内容已更新；本轮该输入框的 accessibility `setValue` 没有生效，点击后粘贴有效。
4. 打开右侧“朗读”，点击搜索图标，输入“解说小帅”并回车，等待资源结果。选名称**完全一致**的“解说小帅”，标签为“中文·平淡”；同屏的“激昂解说”“磁性解说”等不能替代默认音色。
5. 点击“开始朗读”，等待“文本朗读中”结束，确认出现新的音频片段和波形。按旁白实长安排镜头；文本片段的原始3秒时长不是合成语音的时长。
6. 点击“导出”，关闭“视频导出”，启用“音频导出”，选择可用音频格式。本轮实际导出 MP3。使用新文件名，保存到当前项目或忽略的工作目录，看到“音频导出完成”后再检查文件。

操作时读取当前界面重新定位控件，不固定坐标或跨状态复用 accessibility 编号。剪映不可用时报告具体阻塞，不自动改用其他声线。

## 接入制作流程

建议按 cue 分段生成和导出，让音频文件直接对应稳定 cue ID。整段生成的语音需先分段或按实际时长调整 storyboard；不能截断句子来迁就旧镜头。

将导出的音频转换成基础合同接受的项目内 PCM WAV，例如：

```text
ffmpeg -i SOURCE_AUDIO -vn -ar 48000 -ac 2 -c:a pcm_s16le PROJECT/media/voice-c1.wav
```

`SOURCE_AUDIO` 和 `PROJECT` 是使用者的文件/目录占位符；新台词使用对应的新文件名，保留原始导出。通过 ffprobe/PCM 读取检查时长和非静音内容。director 在 `production-plan.json` 中写入：

```json
{"audioMode":"narration+sfx","narration":[{"id":"voice-c1","file":"media/voice-c1.wav","at":{"event":"s1.enter"},"gain":0.9}]}
```

`at` 引用本片 storyboard 事件；确认语音完整落在片内，再 `check → handoff → build`。direct 工程分别在 `project.audioMode` 与 `audio.json.narration` 配置。Chill Wave 继续用独立 `bgm` 轨道及其旁白压低参数，不在剪映配音导出里叠加第二份 BGM。具体混音见 [声音指南](GUIDE.md) 和 [配乐](MUSIC.md)。

## 当前实际验证

2026-10-20，在 macOS 剪映专业版通过上述原生界面选中“解说小帅（中文·平淡）”，生成新台词并完成 MP3 音频导出。实际新音频为10.031秒、44.1kHz、双声道；文件、台词、哈希和来源见 [音色记录](assets/voices/jieshuo-xiaoshuai.json) 与[本次生成样本](assets/voices/jieshuo-xiaoshuai-generated.mp3)。原始用户试听仍单独保留。其他版本与平台需按实际界面复核。

当前获取方式是剪映桌面 GUI，不是从试听克隆声线，也不是已接通的后台 TTS API。逻辑参考 ID `voice.jieshuo-xiaoshuai.v1` 不作为供应商 API 参数。一般功能入口可参考[剪映官网](https://www.jianying.com/)，具体音色与导出结果以上述实际界面为证。
