# R41 组件库

从 [R41 组件美术规范](../style/COMPONENT-ART.md) 选轮廓、纸沿、色彩与触点。[可播放图册](examples/style-atlas/README.md) 按纸面、消息、数字、关系、操作和阅读提供实际镜头。样例里的颜色和动作随组件保存，各片填写自己的内容和事件。

| 当前需要 | 入口 |
| --- | --- |
| 看部件和组合怎样动 | [图册](examples/style-atlas/README.md) |
| 写入工程或调整工作台 | [组件参数](INFORMATION-COMPONENTS.md) |
| 确定边框、字宽、位置和层数 | [基础字段](BASIC-COMPONENTS.md) |
| 从脚本发散形态与动作 | [内容驱动设计](DESIGN.md) |
| 实现新机制或加新组件 | [接入方式](CUSTOM-RUNTIME.md) |

`python scripts/video.py catalog components --capabilities` 查询已注册项。Canvas 工作台在镜头的「信息组件 JSON」内编辑当前组件。片名牌、部件、人物、镜头和配乐各用自己的事件，正式剪辑沿 [工作台路径](../../references/workbench.md) 处理。
