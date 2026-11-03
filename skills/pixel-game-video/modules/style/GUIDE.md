# 风格：任务入口

定义场景美术的像素尺度、造型、色阶、材质、光影与投影。项目主画风与片段特选按 [透传合同](ART-DIRECTION-CONTRACT.md) 展开，人物、其他物种、背景、场景道具统一遵循片段有效画风。组件按自己的美术规范独立处理，字幕排版归 text。

## 职责边界

背景图与来源已归 library/backgrounds；环境映射、人物站位与前景纹理已归 scenes/layouts，具体背景绘制归 scenes/backgrounds。公共构建层合成现有运行配置。文字排版归 text，组件结构归 components。

## 按任务读取

| 当前任务 | 读取入口 |
| --- | --- |
| 后端、编辑方式、示例与验证边界 | [统一能力目录](../../references/capability-catalog.md)；运行 python scripts/video.py catalog style --capabilities |
| 新组件画风、素材生成与局部改版 | [组件共同画风](COMPONENT-ART.md)；按材质、厚度、接触和主次生成，原图库整体迁移待后续 |
| 背景与同镜美术设计 | [美术方向](ART-DIRECTION.md)；先按内容设计空间，样板不是场所菜单 |
| 八类画风、分支提示词与片段透传 | [八类画风](PIXEL-STYLES.md)、[画廊](references/index.html)、[透传合同](ART-DIRECTION-CONTRACT.md)；用 resolve-art-direction.cjs 展开，非运行时预设 |
| 风格选型、网格、字段和接入 | [预设与接入细节](details.md)、[风格目录](catalog.json) |
| 素材管理或场所布局 | [素材](../library/GUIDE.md)、[场景布局](../scenes/layouts/GUIDE.md) |

## 验收重点

检查同镜明暗、材质、像素尺度与轮廓，小屏可读、运动无明显像素跳动；目标平台字体须实际核验。

全片分轨、保存重开和最终导出统一按 [工作台](../../references/workbench.md) 验证，本页不表示已完成当前项目验收。新增能力查 [模块维护](../../references/module-development.md)，职责调整查 [归属与迁移清单](../../references/module-ownership.md)。
