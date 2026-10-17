# 研究与实践的空间叙事

`scenes.study-routes.v1` 与 `style.pixel-study.v1` 配合，作为考研题材的可运行实例，不替换全局默认风格或片长。

| phase / environment | 内容 |
| --- | --- |
| question / workspace | 书与电脑并列，提出路线问题 |
| research / research | 书页、论文节点、学位帽，表达研究及学历条件 |
| practice / workshop | 代码逐行生成、项目交付档案 |
| decision / atlas | 两个真实镜头成为图卡，连接到目标与岗位要求 |

params：`phase,environment,heading,kicker,labels[3],startEvent,completeEvent,sourceShots`。文字由 script 的 labelId 传入。事件控制机制展开；本场景拥有道具位置，objects 为空。人物站立口播，decision 可设 actor:null。

`sourceShots` 在 decision 中必须为两个不同的前序镜头 ID，其他 phase 为空。编译器阻止当前/未来引用，避免递归。运行时从完整镜头末帧获取图卡，不含字幕，不复制手绘的“假缩略图”。默认右图卡左上角 `.54,.30`、宽 `.29`，与 scene-to-card 的落位参数一致。

背景图、素材提示词在 style/assets；背景与实体道具以 480×270 网格生成到输出画幅，文字保留输出分辨率。runtime 中仅含图形逻辑，不放旁白与长篇生成提示词。
