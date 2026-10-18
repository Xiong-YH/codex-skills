# 模块维护

先选择拥有者，再修改。一个功能只在一个模块实现，其余模块引用 ID 和编译结果。

| 新增内容 | 修改位置 |
| --- | --- |
| 风格预设 | modules/style/catalog.json 与风格实现 |
| 人物/物体 | modules/library 素材、目录、来源元数据和解码器 |
| 文字排版 | modules/text；不改变脚本、镜头总时长 |
| 运镜/转场 | modules/motion；登记参数、目标类型及执行器 |
| 音色 | modules/audio；登记变体范围及生成器 |
| 场景机制 | modules/scenes；参数合同、事件引用和绘制器 |

GUIDE 只解释选型和验收。参数放 catalog/schema，算法放代码，项目内容放 JSON；不要把三者拼成一个 prompt。

增加 scene/motion ID 时同步其参数验证与运行实现；未知字段要报错。编译器负责公共时间、资源引用和能力校验。修改 models 后重新运行 schemas 导出。

新增执行器时同步 `engine/dependencies.py` 的场景/配方依赖；预览组装与运行哈希共用该清单。竞赛场景由 `competition-routes.js` 显式选择基础、paced 或全画幅实现，不覆盖其他模块的 draw。可复用纹理与业务动作分别维护，撤回实验移出 skill；导出文件规则统一放在 `engine/delivery.py`。

用一个最小项目验证新增能力，并检查中间帧与退出后状态。文字、音效或场景事件变化时，检查该镜字幕、拼音嘴型、运动和音效是否仍一致。验证产物放忽略的 work/outputs；只跟踪必要证据与源输入。

现阶段按完整项目重建，preview 可缩小渲染区间；没有帧缓存复用或片段自动拼接。不要根据文件夹存在就声明能力可用。
