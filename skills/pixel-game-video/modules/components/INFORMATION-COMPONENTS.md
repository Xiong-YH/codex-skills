# 组件参数与运行入口

每行是一个在 Canvas 引擎内已接入的 `kind`。通用几何和事件看 [基础字段](BASIC-COMPONENTS.md)，实际使用看 [图册](examples/style-atlas/README.md)。

| 用途 | `kind` | `data` |
| --- | --- | --- |
| 贴身份、照片或前镜快照 | `identity` | `title`，可加 `eyebrow`、`detail`、`image` 或 `sourceShot` |
| 翻格计数和锁定结果 | `metric` | `title, from, to, startEvent, endEvent`，可加 `unit`、`detail`、`curve`（`linear` 或 `accelerate`） |
| 证据放在同一页比较 | `comparison` | `title, items`，2–3 项需 `title,event`，可加 `value,detail,image,sourceShot,icon` |
| 指向真实对象 | `annotation` | `label,targetX,targetY` |
| 进入新的一章 | `chapter` | `index,title`，可加 `detail` |
| 交代操作顺序 | `flow` | `title,items`，2–5 项需 `title,event`，可加 `detail` |
| 推进阶段顺序 | `timeline` | `title,items`，3–5 项需 `label,title,event`，可加 `detail` |
| 逐行确认或总结 | `checklist` | `title,items`，2–5 项需 `label,event`，可加 `detail,icon` |
| 列出组成或职责 | `hierarchy` | `title,rootTitle,items`，2–4 项需 `title,event`，各项和整组可加 `detail` |
| 按同一尺度比数量 | `bars` | `title,max,items`，2–4 项需 `label,value,event,endEvent`，整组可加 `unit` |
| 跟读代码 | `code` | `title,items`，2–7 行需 `text,event`，整组可加 `language`。保留原缩进。 |
| 收束成可读结论 | `takeaway` | `title`，可加 `eyebrow,detail` |
| 交代来信和回话 | `chat` | `title,items`，1–8 条需 `side,text,event`，可加 `image`。整组的 `visibleRows` 为 2–4，默认 3。 |
| 放置状态或有时间的反馈 | `tag` | `title`，可加 `icon,endEvent`。提供结束事件时上浮离场。 |
| 写入手账 | `notebook` | `title,items`，1–5 行需 `label,detail,event` |
| 分次投放和盖章 | `deck` | `title,items`，2–6 张需 `title,event`。可加 `icon,detail`，盖章时成对写 `label,markEvent`。整组的 `detail,status` 组成页脚。 |
| 让纸张经过槽口 | `tray` | `items`，1–12 张各有 `event`，可加整组 `title`。 |
| 从同组候选里选一项 | `choice` | `title,items,selectedIndex,selectionEvent`，2–5 项需 `title,event`，可加 `icon`。整组可加 `detail`。下标从 0 起。 |
| 操作台按钮改变任务状态 | `action` | `title,label,button,detail,startEvent`，可加 `eyebrow,icon`。按钮按下后显示 `detail`。 |
| 分格补全表达 | `template` | `title,items`，2–5 格需 `label,detail,event` |

组件写入 `timeline.shots[].components`。重要动作使用本镜事件，显露应留在镜头范围内。将分段的声音、镜头和人物也绑定到对应的落点。使用 [源样例](examples/guide/README.md) 或从图册打开可复制的完整镜头 JSON。

`side` 只能填写 `incoming` 或 `outgoing`，消息最多 96 字符并自动换行。可用图标为 `project,paper,book,search,chat,check,clock,person,folder,play,pin,arrow,grid`。图片以项目媒体路径传入，`sourceShot` 引用更早镜头。身份卡的 `fit:"full"` 可使用项目制成的整张卡面，`entryFrom` 写归一化左上角。

## 组合方式

- 投递槽、数值和反馈分别安排事件。槽内纸张是画面取样，实际统计量在数值组件中给出。
- 把聊天窗放在观众阅读一侧，给角色表情留空间。人物在收到指定那条消息后做完整反应。
- 同一张身份卡跨镜使用两侧一致的文字、色调与层数，配置 [组件交接](../motion/recipes/content-handoffs.md#component-handoff)。

导演工程将上屏文字交给 `script.labels`。动作与时长按分镜事件绑定，工作台再检查组件随着镜头播放。
