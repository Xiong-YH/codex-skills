# 历史音色参考

“解说小帅”是本系列历史上选定的音色，参考 ID 为 `voice.jieshuo-xiaoshuai.v1`。这里保留样本与来源用于核对已有素材，不作为自动生成配音的指令。

- [原始试听样本](assets/voices/jieshuo-xiaoshuai-demo.mp3)：用户提供的试听文件，原始字节保留。
- [音色记录](assets/voices/jieshuo-xiaoshuai.json)：保留历史选择、文件哈希和媒体参数。
- [历史生成样本](assets/voices/jieshuo-xiaoshuai-generated.mp3)：先前生成的台词，仅作来源与音色参考。

配音生成已移出默认制作流程，不自动打开剪映或调用其他 TTS。先完成脚本、分镜与工作台粗剪；有当前台词的音频时，转为项目内 48kHz、16-bit PCM WAV，通过 `production-plan.narration` 或 direct 的 `audio.json.narration` 导入，再按实际时长精调。需要新配音时另行确定处理方式，不把历史试听当作本次台词。

基础引擎保留已有旁白的校验与混音能力；参考 ID 不是供应商 API 参数。混音和配乐让位规则见 [声音指南](GUIDE.md) 和 [配乐工作流](MUSIC.md)。
