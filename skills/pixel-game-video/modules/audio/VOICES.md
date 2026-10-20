# 旁白音色

延续计算机知识口播系列时，默认使用用户选定的 **解说小帅**，稳定参考 ID 为 `voice.jieshuo-xiaoshuai.v1`；用户另选音色时优先采用新要求。该偏好不要求所有视频都有旁白，也不改变其他项目的声音选择。

- [原始试听样本](assets/voices/jieshuo-xiaoshuai-demo.mp3)：用户提供的 `解说小帅-demo.mp3`，约18秒，原始字节保留。
- [音色记录](assets/voices/jieshuo-xiaoshuai.json)：记录默认使用范围、用户选择状态、文件哈希和媒体参数。

制作新片时，将音色名与参考 ID 记入 `brief.constraints`。使用外部配音工具的对应音色生成当前脚本文案，或接收用户提供的成品旁白；以样本核对声音身份和表达。不要自动换成其他候选或系统音色；无法生成对应音色时说明缺少的配音来源，不把参考样本当作新台词。

当前 skill 不内置 TTS 或声线克隆模型，也没有已核验的供应商 voice ID；保留样本不等于已经能自动合成。不要仅凭音色名称猜 API 参数。试听 MP3 只用于选型对照，实际旁白仍转为项目内48kHz、16-bit PCM WAV，经 `production-plan.narration` 或 direct 的 `audio.json.narration` 接入；先测旁白时长，再安排镜头和事件。混音与 BGM 让位规则见 [声音指南](GUIDE.md) 和 [配乐工作流](MUSIC.md)。
