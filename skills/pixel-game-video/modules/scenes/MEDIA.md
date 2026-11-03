# 项目背景与片段素材合同

timeline.shots 可设置 background 或 replacement，字段为 `file,kind,fit,anchorX,anchorY,dim,trimStartSeconds,shortage`。file 只引用项目 media/ 内文件，kind=image/video。背景替换保留场景与人物；replacement 覆盖场景/人物，保留组件与字幕。未设置时沿用原风格背景。

视频按镜头局部时间确定性取帧，源声音不加入混音；保留原旁白/音效。默认不足时长报错，显式 shortage=hold 才保持尾帧。图片不使用视频裁切字段。素材字节参与 inputHash、交接和独立导出。源片段不能依赖个人绝对路径。

`style.pixel-editorial.v1` 的无图底色只是组件排版的备用底，不代表完整背景美术。新环境通过项目素材提供，不需要为每张新背景改 style 的 catalog/runtime。生成提示词与来源说明建议保留在项目 media 的同名元数据文件，输出、缓存和试稿遵循仓库忽略规则。
