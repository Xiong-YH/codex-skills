# 模拟口播同步

适用于先制作画面、后在剪映配音。只按文本估计节奏，不合成声音、不调用 TTS、不声称真实逐词对齐。

文案仍唯一保存在 text.json。timeline.json 每镜可添加 rehearsal，按 cueIds 顺序估时；原有手填 frame 事件保持兼容。

```json
"rehearsal": {
  "cueIds": ["line1"],
  "startFrame": 12,
  "unitsPerSecond": 4.3,
  "commaSeconds": 0.18,
  "stopSeconds": 0.35,
  "gapSeconds": 0.2
}
```

事件二选一：frame 或 speech，不可同时填写。speech 的 edge 为 start、end 或 word；word 按原文精确匹配，occurrence 从零选择重复词，offsetFrames 用于提前或延后。start/end 不接受 word 和 occurrence。

```json
{"id":"hit","speech":{"cueId":"line1","word":"命中"}}
```

字幕强调、对象 focusEvent、相机 start 与音效 at 都引用 s01.hit。动作有自己的短窗口，阅读靠停留；不要把动作均摊到整句。相机若要在词首落稳，从事件减去动作帧数开始。

中文等字母数字字符按单位估算；连续 ASCII 英文按单词长度粗估音节，数字每位 0.9 单位；标点提供停顿，词内部不做真实发音细分。字符时间仅是估值。句间不逐句舍入，最终从连续秒数统一量化为最近帧。改语速、标点或词位置后重新 build，相关事件一起重算。超出镜头、找不到词、重复序号越界会报错，不自动拉长镜头或回退句首。

build/resolved-timeline.json 的 speechRehearsal 保存 estimated 标记、算法版本、逐字符及句起止的镜内帧和全局句范围，可用于核对模拟依据；运行消费者依然只读取同一编译后的事件时间线，不依赖第二个运行时钟。配置和文案随四份输入参与哈希。

可运行例子见 [speech-rehearsal](../examples/speech-rehearsal/README.md)。当前接入 direct 基础工程；director 创作源仍只接受 frame 事件，不可直接在其生成文件添加 speech。工作台导入的是已解析帧，修改语速需回源重建再明确重新导入；不会覆盖或自动移动已剪辑分支。字幕外观仍按 text 模块和工作台选型，模拟器不新增逐字高亮执行器。

后续真实配音可人工校准拍点，或另行接入时间戳数据。剪映配音不自动反向同步；本次不实现音频识别、强制对齐、自动变速或剪映回传。扩展时保留稳定 cue ID 和事件 ID，只替换时间来源。
