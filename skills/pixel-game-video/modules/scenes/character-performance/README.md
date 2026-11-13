# 人物动作形态与连贯关系模式

这是独立分层片段的设计、执行参考；**不是新的 scenes recipe，不扩展 VideoSpec 或原生 Remotion 白名单**。

从 [可浏览动作库](index.html) 按行为选型，数据来自 `actions.json` 与 `sequences.json`。导演先按场景目标设计，目录是开放候选，不能变成剧情菜单。动作ID、序列ID不能写进 `shot.performance.pose`；该字段仍只接受 [已接入姿态](../PRESENTER-ACTIONS.md)。

带完整图集的动作可通过普通 Canvas 的 [整幅动作图集字段](../PRESENTER-ACTIONS.md#在普通-canvas-镜头使用整幅动作图集) 接入。引用实际图片和清单中的裁切范围，以本片事件安排原姿态。

## 当前审核版本

最新一轮用户要求补齐参考视频：八项现各有一段独立5秒代码人物排练MP4，详情页直接播放；旧选段保留在previousExamples作为出处，不再充当主参考。视频、源码、复现录制脚本和哈希见examples/relationship-studies/。原九格素材的人物侧桌脚缺失已撤回为结构失败，当前用seated-actions-v2.png；纠错范围、已知限制与本轮核验见 [review-v3.md](review-v3.md)。

schemaVersion=2的sequences.json改为8项抽象关系草案，分“行为关系”“变化与节奏”“段落衔接”，各层可以叠加。每项保存关系、可调变量、分支与不变量；不将写字、拿手机等具体动词当作顶层模式。原12条故事动作链保存在archive/sequences-v1.json，旧案例plan的seq.*引用按该历史表解释，新pattern.*不替换或重制旧片段。

详情页内嵌原生视频播放器，默认暂停，可播放、暂停、拖动和复位；切换模式会停止旧播放。各参考仅证明代码结构排练，不代表正式角色素材或通用动画能力。前轮独立自检与分类依据保留于 [review-v2.md](review-v2.md)。

36项均有参考图：9项使用S02A候选图集，4项用旧姿态作近似参考，23项为代码绘制的动作构图示意。图类型与素材状态分开记录；示意图不作为人物成品或动作实现证据。原始图不修改，页面按sourceRect显示。示意源码在build-references.cjs，可用--check核对；这不是图像生成或动画引擎。

## 存储与复用

| 内容 | 唯一归属 | 使用方式 |
| --- | --- | --- |
| 动词、接触和末态 | actions.json | 判断本镜要什么动作与缺什么素材 |
| 待审核的关系模式 | sequences.json | 跨层组合变量与分支，再设计本镜动作；不复制示例秒数 |
| 导演创作与重复检查 | 导演的 character-performance.md | 读剧情，定目标、阻碍、尝试和结果 |
| 实际图片、源矩形、锚点、来源 | 单片素材清单／library | 检查后绑定到执行计划，不自动注册为全库角色 |
| 当前执行时间 | 单片 plan.json | 事件唯一源，姿态与道具／镜头数值引用事件 |
| 独立片段播放器 | player.js | 帧采样、事件选姿、标量插值；曲线复用 motion/pulse-spec.js |

`existing-pose-reference` 只表示旧六姿态中有完整图；`candidate-example` 表示随附 S02A 例子包含素材，未获本轮美术认可；`design-only` 要按新场景制作。所有动作都仍需空间、支撑与接触核对，目录不保证任意机位可用。

## 独立片段执行合同

先加载 `../../motion/pulse-spec.js`，再加载 `player.js`。`compile(plan)` 校验事件、姿态、数值轨及依赖，`sample(compiled, frame)` 纯采样；正放、拖动、倒序检查从同一帧得到同一结果。`advance` 钳制首帧负时间差，避免隔离预览中时间倒退导致字幕查找越界。

plan 包含 `fps/duration/events/assets/poses/values/dependencies`。events 的 `id/time` 是唯一秒数定义；poses 的 `at/pose`、values 的 `at/value/ease` 与 dependencies 的 `before/after/minFrames` 仅引用事件。数值目标关键帧的 ease 使用 motion 共用曲线，`hold` 保持前值直至事件。起始姿态与数值轨必须在0帧。调用方用 sample.asset 的 sourceRect 绘制完整姿态，不把头和手拆开。运行时不自动补帧、不求解手指、也不进行骨骼形变。

示例见 [S02A 可播放片段](examples/asking-s02a/index.html) 及其 plan.json、assets.json。默认18秒静音估时，为写／停／撤回／拿起留出过程；原文案保留，原15秒白模及主工程不覆盖。源图、提示词、状态与检查范围随例子保存。加载器与打包器使用同一计划；编好的 HTML 可作为独立设计试样，正式片段通过已支持的 replacement 导入，内部轨道不会自动变成工作台可编辑层。

从本技能根目录运行 `node modules/scenes/character-performance/build-index.cjs --check` 检查浏览入口是否过期；运行 `node tests/character-performance.cjs` 检查事件依赖、拖动确定性、原文、源图哈希与首帧时间。示例打包命令为 `node modules/scenes/character-performance/examples/asking-s02a/build.cjs <输出HTML路径>`；不传输出路径仅更新data.js。浏览器回归为 `tests/character-performance-browser.cjs <已有独立HTML所在目录>`，通过PIXEL_NODE_MODULES与PIXEL_BROWSER_EXECUTABLE配置本机依赖，不硬编码安装位置。

## 接触与连贯性检查

依次检查起态、中间姿、触点、释放和末态：角色身份和机位；肩肘腕链与手数；物体身份／数量／持有者；桌沿或脚底锚点；遮挡关系；前后动作的接续。完整图之间几像素的家具或脸型跳动也需要实看；源矩形对齐不能证明所有像素稳定。

不把半透明叠化作为完整姿态切换的默认方式，不用持续漂浮代替行为。阅读区允许全静。序列间若机位、惯用手、持有物或支撑点不相容，补整体连接姿态或明确切镜，不能无条件拼接。
