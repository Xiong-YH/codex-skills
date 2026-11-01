# 片段审阅工作台

启动：`python docs/prototypes/segment-review/server.py --port 5337 --project work/save-first-6s-20261101`。

读取 brief、script、storyboard、production-plan 及真实 MP4 的哈希。片段按镜头和明确的 copy/edit 语义事件拆分；不猜测任意动作的业务含义。原生对象引用实际稳定 ID；自定义视频的内部对象由项目 review-map.json 明确声明来源、位置和能力类别，没有映射时不声称可自动拆出人物或组件。

配置编辑生成建议，不直接写回源或重制视频。批量选择显示具体对象并确认范围。评论在开始输入或定位时冻结当前媒体时间，记录源版本和对象引用。

新版 MP4 仅用作浏览器内存预览，最大 32 MiB，一次保留一个，不复制到仓库。逐项确认对应时间和画面后才可标为解决；新版没有源映射时保留人工校准状态，不假定实际帧率。候选文件不会在刷新后自动恢复；复核记录和文件哈希会保存。

评论、修改建议按源工程版本及原片哈希隔离保存在浏览器；导出 JSON 可交接。收藏另写 collections/favorites/catalog.json，容量与认可范围见该集合 README。

## 依赖与验证

服务端仅依赖 Python 标准库，浏览器使用原生 HTML/CSS/JavaScript，无需 npm 安装。`--project` 指向本机现有导演工程，需有四份创作 JSON 与 `video/outputs/` 下的 MP4；试片与缓存不随代码提交。`assets/sample.mp4` 是服务端路由，实际返回当前工程的视频，并非需要复制一份同名文件。

运行存储与源映射测试：`python -m unittest discover -s docs/prototypes/segment-review/tests`。浏览器交互已另行验证对象定位、批量范围、评论时间冻结、版本复核、收藏落盘及建议总览的编辑、删除和复制下载。
