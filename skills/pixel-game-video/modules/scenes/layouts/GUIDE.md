# 场景布局与资源组合

本目录保存现有风格 ID 配套的场景默认布局。它们是旧工程的可重建配置，不是新主题的场所白名单。

| 字段 | 拥有的内容 |
| --- | --- |
| libraryAssets | 所需背景/前景素材 ID，解析到 library/backgrounds/catalog.json |
| backgrounds | 本场景 environment 名称到素材 ID 的映射 |
| presenter | 当前执行器的 x、baseline、height 默认布局，均为画幅比例 |
| transitionTextures | 转场需要的素材 ID，例如实体书架前景 |

style/catalog.json 的 scenePreset 选本目录文件，sceneRuntime 选 scenes/backgrounds 内的执行器。engine/dependencies.py 的 selected_style 统一合成配置；Canvas 与原生 Remotion 共用配置/资源解析，但后端可用能力仍各自受限。

布局文件不能覆盖配色或加入未定义字段。现有执行器仍通过合成后的 style.backgrounds / style.presenter / style.transitionTextures 读取，以保留输出与旧工程字段兼容。新项目的自定义空间和素材按 [空间设计](../SPACE-DESIGN.md)、[项目素材合同](../MEDIA.md) 处理，不为每张新背景扩充预设。

素材来源、哈希和实际文件归 [背景库](../../library/backgrounds/README.md)；美术规范归 [style](../../style/ART-DIRECTION.md)。依赖锁绑定选中布局与背景资源；跨模块文件移动后必须重建，不沿用旧 build。
