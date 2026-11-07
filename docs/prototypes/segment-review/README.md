# 片段审阅工作台

## 与脚本共创衔接

脚本工具阶段五提供“进入片段审阅工作台”入口。无成片时使用随导演 skill 分发的 [设计模式](../../../skills/pixel-video-director/assets/segment-review/design-review.html)：携带当前镜头六列原文和来源版本，按十维对照逐镜补充设计；保存建议后“带回阶段五”，由左侧修订原稿并复查。版本不同提示核对，重复返回不重复追加，建议不直接覆盖原稿或成为已解决状态。

本地打开脚本 HTML 即可使用设计模式，页面通过有界 URL 片段传递快照；较大的记录可下载脚本 JSON，在设计工作台导入，再下载修订 JSON 回传。运行本服务时，统一入口为 `/script`、设计模式 `/script-review/design-review.html`、已有工程成片模式 `/segment-review/index.html`。成片模式仍需要服务启动时绑定的真实项目；两种模式不自动共享或替换项目。设计模式的十维是六列原稿的可追溯投影，综合说明未自动拆成已确定的独立字段。

设计运行文件唯一维护于 `skills/pixel-video-director/assets/segment-review/`；成片模式复用其中的主题。六列原稿仍是创作源，设计建议经左侧处理后才合入。

## 已有工程与成片审阅

主视图按阶段五展示逐片段十列：片段/镜头、预估时长、文案与屏幕文字、动作状态、画面风格、画面布局、主体与组件设计、背景、声音与音效、转场与接镜。表格可横向滚动，当前片段固定标识；七模块的对象编辑保留在表下。对应规范为 [逐片段 Check](../../../skills/pixel-video-director/references/segment-check.md)。

`check_dimensions.py` 从现有创作源投影列值及来源，不新增创作源。缺失字段显示待补/未声明，不推断为“无”；多片段共享镜头时动作、标签和声音保留镜头上下文，显露范围需另核。工程帧区间不声称已对齐音轨，所有列默认未审。十列表可逐项提意见，导出包含维度及源字段引用、当前设计快照；建议与快照分开，配置建议不会自动改变当前设计。

启动：`python docs/prototypes/segment-review/server.py --port 5337 --project work/save-first-6s-20261101`。

读取 brief、script、storyboard、production-plan 及真实 MP4 的哈希。片段按镜头和明确的 copy/edit 语义事件拆分；不猜测任意动作的业务含义。原生对象引用实际稳定 ID；自定义视频的内部对象由项目 review-map.json 明确声明来源、位置和能力类别，没有映射时不声称可自动拆出人物或组件。

配置编辑生成建议，不直接写回源或重制视频。批量选择显示具体对象并确认范围。评论在开始输入或定位时冻结当前媒体时间，记录源版本和对象引用。

工程可另存 `review-script.json`，通过“完整脚本”查看尚未制作的分镜。格式为 `schemaVersion: 1`、`title` 和 `shots`；每镜含 `id`、`title`、`category`、`narration`、`visual`、`transition`。镜号与已制作源匹配时可跳到视频，其余标为待制作，不编造视频起止或延长实际片长。可选 `poster`、`proposalImage` 是工程 `review-assets/` 下的相对图片路径；优化图明确标为尚未应用的提案。完整脚本哈希参与审阅版本隔离，不替代导演工程的执行时间线。

新版 MP4 仅用作浏览器内存预览，最大 32 MiB，一次保留一个，不复制到仓库。逐项确认对应时间和画面后才可标为解决；新版没有源映射时保留人工校准状态，不假定实际帧率。候选文件不会在刷新后自动恢复；复核记录和文件哈希会保存。

评论、修改建议按源工程版本及原片哈希隔离保存在浏览器；导出 JSON 可交接。收藏另写 collections/favorites/catalog.json，容量与认可范围见该集合 README。

## 依赖与验证

服务端仅依赖 Python 标准库，浏览器使用原生 HTML/CSS/JavaScript，无需 npm 安装。`--project` 指向本机现有导演工程，需有四份创作 JSON 与 `video/outputs/` 下的 MP4；试片与缓存不随代码提交。`assets/sample.mp4` 是服务端路由，实际返回当前工程的视频，并非需要复制一份同名文件。

运行往返与版本冲突测试：`node docs/prototypes/segment-review/tests/script_bridge.test.cjs`。

运行存储、源映射与页面路由测试：`python -m unittest discover -s docs/prototypes/segment-review/tests`。浏览器交互已另行验证对象定位、批量范围、评论时间冻结、版本复核、收藏落盘及建议总览的编辑、删除和复制下载。
