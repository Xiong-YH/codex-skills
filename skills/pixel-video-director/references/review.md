# Review 与定向修复

```text
python scripts/director.py review-init PROJECT --manifest PROJECT/video/outputs/film-verification/render-manifest.json
python scripts/director.py review-check PROJECT
python scripts/director.py impact PROJECT --source script.json --id c1 --field /text
python scripts/director.py impact PROJECT
```

review-init 检查完整成片、当前源文件、基础输入哈希和 MP4 SHA256；技术指标可据核验报告赋值，内容、视觉、运动、文字与音频初始为 `not_reviewed`。review-check 不代替实际审片；退出码 0 为 passed，2 为失败或尚未完成，1 为合同/依赖/版本错误。

实际连续观看成片、查看关键静帧/转场并听音后填写 checks。证据路径相对 PROJECT，`checked:true` 只表示确实已检查。内容/视觉/运动通过必须有 playback 证据，文字可引用解码 frame，音频需 audio 或 playback，技术需 metadata。静音工程可用媒体报告证明没有音轨。未检查项不能通过，元数据不能证明视觉或听觉质量。

运镜检查要看完整画幅的空间关系：桌面、墙面与人物是否遵循同一镜头，是否出现局部背景贴片的硬边，切点两侧焦点物体的位置/尺寸是否承接。无透明边角、人物像素固定、首尾一致不能替代这些判断；已发现的静态割裂应记 visual failed，不能用尚未完整播放来淡化已发现的问题。

每条问题填写：

```json
{
  "issueId":"i1", "category":"text", "severity":"major", "shotId":"s1",
  "timeRange":{"startFrame":12,"endFrame":170},
  "evidence":[{"kind":"frame","path":"evidence/s1.png","description":"字幕遮住选项","checked":true}],
  "expected":"字幕保持可读，同时选项完整可见",
  "ownerModule":"text",
  "sourceRef":{"file":"production-plan.json","stableId":"c1","field":"/y"},
  "status":"failed"
}
```

timeRange 为最终影片的全局半开帧区间。sourceRef 的 field 是相对于稳定对象的 JSON Pointer。问题状态 failed = 待修复，not_reviewed = 已改待复核，passed = 有证据复核通过；所有问题和所有检查都通过才算完成。

对单条局部内容/视觉静态问题，可以用实际解码 frame 确认修复并标 passed；这不使 content/visual 整类检查通过。涉及动作连续性的问题仍须 playback，声音问题仍须听音证据。

按 sourceRef 回改源产物 → impact 看影响镜头 → handoff → 完整 render → 用 `review-init --output review-v2.json` 建新版本并复核。保留旧 Review，不能把旧成片证据直接标成新版本通过。

| 改动 | 核验重点 |
| --- | --- |
| 字幕/短标签 | 排版、嘴型、阅读时间与对应场景 |
| 角色/物体/风格 | 相关镜头、锚点、遮挡与文字可读性 |
| 运镜/转场 | 相关镜头和交接连续播放、关联声音 |
| 声音 | 事件时点、混音、实际听音和封装 |
| 镜头时长/事件 | 当前和下游镜头、声音、最终合成 |

impact 当前是保守影响诊断；不声称已有帧级缓存或局部拼接。重复同一失败时保留证据并说明具体缺项，不无限循环改动。
