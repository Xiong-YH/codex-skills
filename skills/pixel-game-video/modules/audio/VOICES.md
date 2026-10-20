# 旁白音色

延续计算机知识口播系列时，默认使用用户选定的 **解说小帅**，稳定参考 ID 为 `voice.jieshuo-xiaoshuai.v1`；用户另选音色时优先采用新要求。该偏好不要求所有视频都有旁白，也不改变其他项目的声音选择。

- [原始试听样本](assets/voices/jieshuo-xiaoshuai-demo.mp3)：用户提供的 `解说小帅-demo.mp3`，约18秒，原始字节保留。
- [音色记录](assets/voices/jieshuo-xiaoshuai.json)：记录默认使用范围、用户选择状态、文件哈希和媒体参数。

制作新片时，将音色名与参考 ID 记入 `brief.constraints`，按 [剪映专业版原生文本朗读](JIANYING.md) 在剪映中生成当前脚本文案。默认路径是直接操作剪映专业版 GUI：把文本加入时间线，在“朗读”中搜索并选择“解说小帅”（中文·平淡），再点击“开始朗读”。以原始试听样本核对声音身份和表达，不自动换成其他候选或系统音色；参考样本只作对照，不能代替当前台词。

生成由剪映原生功能完成，基础引擎负责项目 PCM 旁白的时间校验和混音，未接入公开 TTS API 或声线克隆模型；参考 ID 不是供应商 API 参数。剪映操作、生成、导出及 PCM 转换的实际核验范围见 [剪映工作流](JIANYING.md)。取得当前旁白后，转为项目内48kHz、16-bit PCM WAV，经 `production-plan.narration` 或 direct 的 `audio.json.narration` 接入；先测旁白时长，再安排镜头和事件。混音与 BGM 让位规则见 [声音指南](GUIDE.md) 和 [配乐工作流](MUSIC.md)。
