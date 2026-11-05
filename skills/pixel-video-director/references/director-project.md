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
| elements[] | id、label、kind、x/y/w/h，以及可选 keyframes |
| keyframes[] | at 为本段秒数，x/y/opacity 按时间递增；不提供的属性沿用前态 |
| subtitles[] | cueId、from、to；引用 stages.copy 的原文，不另写一份字幕文案 |
| layout / action | 构图重点、动作与阅读安排 |
| stateIn / stateOut / continuity | 起态、末态和接镜说明 |
| audio | 声音设计说明；当前白模工具不自动渲染音轨 |
| transition | 当前执行支持 cut、continue、fade；复杂转场需额外试样，不冒充支持 |

渲染当前支持背景图、矩形和火柴人占位、线性位置/透明度变化、字幕与基本接镜。相邻片段在同一时间线上连播。高级相机、手部表演、3D 或复杂形变不能只写入描述就视为已实现。

本工具的时间仅服务前期白模；建正式工程时映射到原 storyboard 统一事件，不能同时维护两个正式时间源。

## 依据与过期检查

草图和动态设计各自保存 `basis`，通过 `DirectorModel.segmentBasis(project, segment)` 计算。依据包含本段描述、明确要求、实际文案、模块、全片共识与相邻描述。生成后将实际核对过的依据写入 sketch.basis 或 plan.basis。

内容变化会显示待复核，过期 plan 不能导出；只重新计算 basis 不构成修复，agent 必须先核对对应设计。局部结构/时序的有效编辑即时进入本地白模；相关段仍需按影响范围联审。不同阶段的参考与采用决定分别保存。

## 播放、导出与记录

页面可播放当前片段、相邻片段及全片；通过浏览器 Canvas captureStream + MediaRecorder 导出 WebM。导出按实际时长进行，保持页面可见，可取消。另下载同次 manifest，包含项目版本、设计摘要、片段时间范围与 plan 摘要；导出使用开始时的设计快照，期间修改不会混入该文件。

浏览器需支持 Canvas、captureStream 和 WebM MediaRecorder；不支持时如实提示，不伪造下载或生成结果。无背景图时显示布局底色并提示待补，不能声称正式背景已完成。视频明确无音轨、时长预估、正式成片未审。最终 MP4 仍走 FOUNDATION 工作台。

页面编辑保存在本地草稿，未自动写回磁盘。整理请求带 projectId、revision、baseHash、字段路径、原值/新值、意见与保留的旧记录；agent 核对后回写唯一源、递增 revision 并重建同一入口。新背景可下载完整草稿 JSON 交回，聊天请求不塞入大段图片编码。
