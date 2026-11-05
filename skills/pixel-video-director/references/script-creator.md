# 同一入口：编剧文案与导演工作台

## 启动与更新

固定入口仍为当前工作目录的 `outputs/script-creator.html`，当前状态仍为 `outputs/script-creator.json`。新视频由编剧先讨论选题，独立编剧不依赖本工具；已有项目读取同一 JSON 继续，不重置为示例。每次形成实际内容修订后递增 revision，设置实际阶段，再构建和打开同一入口。

```text
node DIRECTOR/scripts/build-workspace.cjs
node DIRECTOR/scripts/build-workspace.cjs --state PROJECT/script-creator.json --output outputs/script-creator.html
```

DIRECTOR 按 [协作定位](collaboration.md) 解析，默认 state 不存在时才创建空项目。构建器只读取模板/模块并写所选输出，不改原项目 JSON，也不再向模板塞回当前项目或示例缓存。

## 导航与实际进度

“编剧文案”中查看或修改选题、叙事与完整稿；“导演策划”按 [四阶段](director-workflow.md) 展示模块、大白话与草图、设计与白模、制作与审片。默认一次看一个片段，复杂字段按需展开。打开阶段只改变浏览位置，不改变项目进度，也不自动确认、采纳或生成内容。

保留 schemaVersion=1 和 activeStage=0–5：0 为空项目，1–3 仍是编剧；4–5 是导演旧兼容信封。新增 `stages.director.phase=1–4` 表示导演实际进度。旧 activeStage=5 仅映射到待整理的动态设计视图，不证明白模或成片已完成。结构见 [数据合同](director-project.md)。

`stages.brief` 保留 topic、audience、takeaway，并记录 problem、value、confirmed、confirmationEvidence、confirmedRevision。缺项不从记忆点或阶段数推断。选题及路线仍须真实确认；完整规则由编剧唯一维护。

## 原稿、草稿与意见

当前项目是设计来源。浏览器以 projectId、revision 与源摘要隔离本地字段修改和意见；用户编辑后可以直接查看本地预览，但未自动写回磁盘或制作工程。改描述或文案后，依赖的草图/动态设计标待核对。新图片内嵌到本地草稿，下载完整草稿 JSON 后可交给 agent 合入。

“整理修改”生成带来源版本、原值/新值、字段位置与意见的请求；有宿主接口时由用户发送，没有接口就复制到聊天。聊天处理后再更新 JSON 和入口。发送、点击或下载不能标为已应用、已确认或审片通过。

同版本但源摘要不同的草稿不覆盖当前稿；保留冲突记录供下载和核对。旧页面及其他 revision 的草稿也保留可查；旧字段不静默填进新结构。可撤销当前字段修改，片段切换与刷新不丢已保存意见。

旧 `stages.visuals` 原文和 ID 以兼容视图展示，不从六列文字猜出动画或自动采纳旧布局。升级时由导演沿当前来源整理模块、关联文案和新设计，保留旧稿及未合入意见。旧审阅返回 JSON 可导入并作为待核对记录交回，不自动覆盖项目。

## 页面源码与演示

模板仍为 `assets/templates/workflow-overview.html`，新模块唯一维护于 `assets/director-workspace/`。旧 `assets/segment-review/` 保留历史审阅格式和独立工具兼容；不再是新工作台的主界面。页面构建为离线单文件，不依赖外部 CDN。

独立 [示例项目](../examples/director-workflow/project.json) 有明确演示标签，不能覆盖用户项目或作为用户认可。可用 --state 构建单独的示例入口；真正的项目继续使用原固定入口，不产生 v1/v2 历史预览。

尚未建工程时此 JSON 保存当前设计；建工程后执行文案与时间仍归原四份源，展示应同步它们。新白模仅服务前期试播，不新增正式执行时间线；正式工作台仍保留独立剪辑分支。
