# 导演工作台数据与白模工具

本页维护设计层数据；工程字段仍由 [创作合同](authoring.md) 与 FOUNDATION 维护。代码入口是 [model.js](../assets/director-workspace/model.js)、[renderer.js](../assets/director-workspace/renderer.js)、[workspace.js](../assets/director-workspace/workspace.js)。

## 项目与版本

沿用 schemaVersion=1、projectId、revision、title、activeStage 和 stages。新增 `stages.director`：

| 字段 | 内容 |
| --- | --- |
| phase | 导演实际阶段 1–4，浏览切页不改变它 |
| agreements | 全片共识与必须继承的用户约定 |
| modules[] | id、title、purpose；模块任务及推进关系 |
| segments[] | id、moduleId、title、cueIds、description；文案引用与大白话 |
| segments[].requirements | 用户明确要求，持续继承，不从草图自动推断 |
| segments[].dependsOn | 需一起复核的其他片段 ID |
| segments[].sketch | 可弃用的静态构思参考 |
| segments[].plan | 独立选定的结构化动态设计 |

完整示例见 [演示项目](../examples/director-workflow/project.json)，背景布局的矢量源见 [background.svg](../examples/director-workflow/background.svg)。示例有独立 projectId 和 isExample=true，不代表用户已确认或成片认可。

## 静态草图

`sketch.elements` 用 id、label、kind（box/person）与 x/y/w/h（百分比）表示占位。`sketch.arrows` 用 x1/y1/x2/y2 和 label 表示运动方向；可以结合大白话表达起末态。不会执行任意 HTML 或脚本。草图明确是参考，不自动转换为 plan，也不能作为正式人物、组件或素材能力。

## 动态设计

| 字段 | 用途 |
| --- | --- |
| duration | 本段秒数，当前工具范围 0.2–180；无音轨仍为预估 |
| background | description、color，以及可选的内嵌 PNG/JPEG/WebP image；单图不超过 2 MB |
| camera.keyframes[] | 可选平面相机关键帧，at 为本段秒数，x/y 为画幅百分比平移，正值向右/向下，scale 为 1–2 倍等比缩放。起始默认居中且为 1 倍，按帧线性插值并限制平移范围以覆盖画幅 |
| overlay | 可选的内嵌 PNG/JPEG/WebP 画幅叠层，绘制于相机场景之上、屏幕元素之下。透明 PNG 可用于固定字幕底板 |
| elements[] | id、label、kind、x/y/w/h，以及可选 keyframes；默认跟随场景，可设 layer=screen 固定在画幅上。box 可设 shape=bubble 或 text（纯文字、无底板边框），label 可换行；textStyle 可设 size（960宽基准字号）、weight、color；pivot 可指定共同旋转/缩放中心（画面百分比），默认元素中心 |
| elements[].image | 可选内嵌 PNG/JPEG/WebP，适用于未设 shape 的 box。图片居中等比放入元素范围，跟随其关键帧、pivot 和图层。label 保留为工作台中的元素标记 |
| keyframes[] | at 为本段秒数，x/y/opacity/scale/rotation 按时间递增；scale 为等比缩放，rotation 为角度；不提供的属性沿用前态 |
| subtitles[] | cueId、from、to；引用 stages.copy 的原文，不另写一份字幕文案 |
| layout / action | 构图重点、动作与阅读安排 |
| stateIn / stateOut / continuity | 起态、末态和接镜说明 |
| audio | 声音设计说明；当前白模工具不自动渲染音轨 |
| transition | 当前执行支持 cut、continue、fade；复杂转场需额外试样，不冒充支持 |

渲染当前支持背景图、矩形/左尾气泡和火柴人占位、线性位置/透明度/等比缩放/平面旋转、字幕与基本接镜。平面相机以画面中心缩放背景与场景对象，再按 x/y 平移，两个轴的有效平移各限制在 ±50 × (scale − 1)% 以内。普通字幕、屏幕层和固定叠层保留画幅坐标。共同 pivot 可让多个占位对象绕同一点旋转缩小；场景文字随对象一起变换，不代表透视或纸张形变。相邻片段在同一时间线上连播。正式运镜配方、手部表演、3D 或复杂形变仍需实际制作与核验。

本工具的时间仅服务前期白模；建正式工程时映射到原 storyboard 统一事件，不能同时维护两个正式时间源。

### 白模中的字幕选用

普通字幕和特殊字幕均可使用，按本段的表达、构图和阅读需要选择，也可在同段组合，不要求每段加入特殊字幕。普通字幕承载连续讲述，按已选方案保证稳定阅读；需要文字参与焦点、强调、场景或转场时，可采用画面大字、分步显露、场景内文字或随对象运动等特殊形式，并避免与普通字幕重复堆叠。

需要核验字幕时，用选定形式的最简表示保留有表达作用的相对位置、显露顺序与阅读停留。只在文字运动影响理解或接镜、需要实播判断时加动态。关键效果超出通用工具能力时明确实现缺口，必要时按独立执行器约定试样。选型和时序仍归同一片段设计，文案引用唯一源。

### 设计与执行同步

已有结构化字段能表达的时间、对象位置和关键状态，由当前设计数据驱动，执行器负责求值和绘制，不在代码中另抄一套可独立修改的值。定制动作超出通用模型时，保留必要的专用实现，明确其参数来源及与片段/事件的对应；不要为填满 `elements` 复制一套无效占位数据。

独立执行器若仍有硬编码值，修改设计时同步核对受影响代码并重新生成预览与视频，记录当前设计版本、执行器和导出文件的对应。仅更新文字、basis 或路径不能使旧视频成为新设计。此为制作约定，当前通用工具不自动同步或校验任意独立执行器。

## 依据与过期检查

草图和动态设计各自保存 `basis`，通过 `DirectorModel.segmentBasis(project, segment)` 计算。依据包含本段描述、明确要求、实际文案、模块、全片共识与相邻描述。生成后将实际核对过的依据写入 sketch.basis 或 plan.basis。

内容变化会显示待复核，过期 plan 不能导出；只重新计算 basis 不构成修复，agent 必须先核对对应设计。局部结构/时序的有效编辑即时进入本地白模；相关段仍需按影响范围联审。不同阶段的参考与采用决定分别保存。

## 播放、导出与记录

正式制作记录可在 `stages.director.production.summary` 说明当前范围，`artifacts.video / project / review` 引用相对同一 HTML 的本地文件。阶段四显示原生视频播放器与下载入口；这里只接受无上级跳转的相对文件路径。提供视频不代表已审片通过。

片段使用独立执行器时，`plan.rendererSource` 只记录来源，不能让项目 JSON 指定任意脚本加载。`plan.artifacts` 可记录相对入口的 preview、video、webm、design、review；主页面播放已导出白模并链接独立预览，不能用通用矩形播放器空跑或导出冒充该执行器。内容变化后仍需核对并重新导出；独立片段暂不进入通用全片白模导出。

页面可播放当前片段、相邻片段及全片；通过浏览器 Canvas captureStream + MediaRecorder 导出 WebM。导出按实际时长进行，保持页面可见，可取消。另下载同次 manifest，包含项目版本、设计摘要、片段时间范围与 plan 摘要；导出使用开始时的设计快照，期间修改不会混入该文件。

浏览器需支持 Canvas、captureStream 和 WebM MediaRecorder；不支持时如实提示，不伪造下载或生成结果。白模可用布局底色，正式场景按本片参考设计。视频明确无音轨、时长预估、正式成片未审。最终 MP4 仍走 FOUNDATION 工作台。

页面编辑保存在本地草稿，未自动写回磁盘。整理请求带 projectId、revision、baseHash、字段路径、原值/新值、意见与保留的旧记录；agent 核对后回写唯一源、递增 revision 并重建同一入口。新背景可下载完整草稿 JSON 交回，聊天请求不塞入大段图片编码。

### 白模接入与局部迭代

- **先落实可重建的接入。** 已有主创作器时，独立白模的播放分支和资源引用由构建器或其源模板生成；不把直接补生成 HTML 作为完成方案。接入后用正常构建命令重建，再打开同一主入口的目标片段，确认播放器仍存在、资源可加载且为当前版本。
- **验证用户使用的入口。** 独立预览播放成功仅证明独立预览；主入口须另查目标片段、当前项目 revision、视频版本及实际播放。测试窗口成功不能证明用户已打开的页面加载了新版；无法观察该页面时明确验证范围，提供准确入口及刷新或重开说明，不声称用户页面已确认可用。
- **按问题决定重跑范围。** 页面接入问题先用现有视频检查播放器、资源路径和构建结果，不因页面修改重复导出未变的视频。动作修改先定位关键时刻及短区间，确认后再导出受影响片段；最终视频仍正常速度连续播放。只有内容或版本对应存在疑问时才重新导出。
- **定位并记录耗时。** 白模的动作改动与主入口接入按 [修订定位与耗时](review.md#修订定位与耗时) 分开记录，沿用同一计时口径。

经验出处：2026-11-05，《提问的艺术》S02A 白模接入讨论。初期直接修改生成 HTML，重建会丢失；独立预览成功未充分验证用户主入口，导致多次反馈看不到视频。用户指出“为啥这个过程会花那么久，不符合逻辑”，随后明确要求将经验沉淀到白模 skill。本节记录接入与核验的流程纠偏；21:13–21:50 仅是包含讨论、等待和四拍修改的文件活动窗口，不能称为接入净耗时。本次规范更新不表示用户已认可 r27 动作、成片或新流程的实测效率，也不将内嵌 MP4、片长或导出耗时推广为默认。
