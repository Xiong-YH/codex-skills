# 像素信息组件

组件负责信息结构与局部状态，可叠在任意已支持镜头上；不拥有镜头时长、背景或人物。用 `python scripts/video.py catalog components` 查十二个已实现家族。样式取当前 style 的语义色与字体，`style.pixel-editorial.v1` 提供深底、暖金边角与清晰层级的可选主题，不改变其他主题。

| kind | data 必填 | data 可选 |
| --- | --- | --- |
| identity | title | eyebrow, detail, image, sourceShot |
| metric | title, from, to, startEvent, endEvent | unit, detail |
| comparison | title, items（2–3项） | 每项 title/event 必填，value/detail/image/sourceShot 可选 |
| annotation | label, targetX, targetY | 无 |
| chapter | index, title | detail |
| flow | title, items（2–5项，每项 title/event） | 每项 detail |
| timeline | title, items（3–5项，每项 label/title/event） | 每项 detail |
| checklist | title, items（2–5项，每项 label/event） | 每项 detail |
| hierarchy | title, rootTitle, items（2–4项，每项 title/event） | 根节点 detail，每项 detail |
| bars | title, max, items（2–4项，每项 label/value/event/endEvent） | unit |
| code | title, items（2–7行，每行 text/event） | language |
| takeaway | title | eyebrow, detail |

公共字段：`id,kind,x,y,width,height,data`；坐标按画幅 0–1。`showEvent` 默认 enter；可用 `focusEvent` 在指定事件后保持强调；`tone` 从 gold/accent/secondary/danger 选择色彩职责。事件使用本镜 local ID，不能引用 exit，数值的 startEvent 必须早于 endEvent。

```json
{"id":"result","kind":"metric","x":0.30,"y":0.24,"width":0.58,"height":0.40,
 "showEvent":"enter","focusEvent":"done","tone":"gold",
 "data":{"title":"已完成","from":0,"to":3,"unit":"项","startEvent":"begin","endEvent":"done","detail":"结果保持到镜头结束"}}
```

在基础 timeline.shots[].components 中使用以上结构。导演工程在 storyboard 同名字段安排布局和事件，title/eyebrow/detail/label/unit/index/rootTitle/language/text 等显示文字全部引用 script.labels；comparison.value 也是文字引用，bars.value 是数值。其余数值与事件直接写入。自由布局可用 `scenes.canvas.v1`，保留 props、人物、项目背景或替换片段，组件绘制在其上，字幕最后叠加。

`image` 是项目 media/ 内的 PNG/JPG/WebP 路径；`sourceShot` 引用更早镜头的最终完整画面（不含独立字幕），二者互斥。快照保留源场景身份，适合回顾与比较。不会递归引用当前或未来镜头。数值变化在终点精确落到 to 并保持，不循环计数。

组件形态不同：身份卡组织图像/名称/特征，数据卡突出数值，对比组维持同构结构并按事件显露，标注连接实际对象，章节用编号与标题组织段落。共用留白、描边、角饰与显露时间。组件文字溢出会报错，应扩展布局或缩短标签，不会自动缩成小字或静默裁切。

## 扩展组件的语义与状态

- flow 的箭头表示明确写出的步骤或传递关系，事件按列表顺序推进；当前节点强调，已到达节点保持。仅有先后关系时，不把箭头解读为因果证明。
- timeline 同样按事件顺序显露，但节点等距，只表达阶段次序；时间标签可写真实日期或阶段名。它不是按实际时长比例绘制的时间图。
- checklist 的标签从开始就可读，事件表示该项已满足，勾选累计并保持；允许条件乱序完成。不要把未检查项伪装成已通过。
- hierarchy 是一层从属结构，根节点稳定，分支按事件显露。表达模块组成、分类或职责；更深层的树拆镜讲解。
- bars 必须给出共同 max，数值在 0..max 内，全部从零基线绘制。每项 event 到 endEvent 完成增长后保持终值；单位一致。未知数不能填零，示意数据要在脚本中标明。
- code 原样显示空格缩进与行号，event 表示当前讲解行，列表事件按顺序排列。每项为单行，使用空格而非 Tab；最多 7 行，单行不自动换行，也不执行代码。较长程序先摘取相关片段。
- takeaway 使用开放式主句和边缘标记，适合原则、总结与记忆点；主句与字幕避免重复逐字占屏。

## 组合方式

单镜先选一个主组件，再按解释需要添加辅助组件。可采用 flow + checklist 表示“处理路径与校验条件”，code + annotation 指认当前代码，bars + takeaway 连接证据与结论，hierarchy + identity 展开某一分支。通过事件错开关注焦点，位置避开字幕和主要对象。不要把十二类全部装进同一镜。

完整新增家族与组合示例见导演 skill 的 `examples/component-expansion/`。每镜的具体文案、场所与时长仍由创作决定。

背景、图像样板与动态素材见 [风格规范](../style/ART-DIRECTION.md)。组件不意味着全屏处处填框；重要对象保留空间，标签与连接线避开其他文字和字幕。使用真实画幅与小屏尺寸查看前、中、后状态。

实现：runtime.js 绘制与状态，contract.py 验证，catalog.json 发现；引擎按实际使用锁定与导出依赖。主题属性归 style，项目文案归 script，帧事件归 storyboard。当前只支持通用组件级显露/强调和上述内部状态；没有开放任意 CSS/HTML 渲染。
