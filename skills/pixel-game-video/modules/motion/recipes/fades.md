# 普通淡化与淡出到黑

这两项是基础交接，不依赖主体匹配，也没有固定首尾停顿。

| recipe | 动作 | 适用情境 |
| --- | --- | --- |
| `motion.cross-dissolve.v1` | 完整旧景交叉淡化成新景 | 时间经过、柔和段落接续；前后文字应错开，避免叠字 |
| `motion.fade-through-black.v1` | 旧景淡出到全黑，再淡入新景 | 章节结束、明显时间跳跃、收束后重新开始 |

两项均为 world 转场、target=scene、无额外参数。开始与结束精确复制源帧；中点经过全黑的效果有意暂时不展示场景，不称为无缝运动。仅要片头淡入或片尾淡出时，用工作台镜头透明度和相邻黑色片段编排；当前这两个 recipe 仍要求前后镜头。

原 `motion.match-dissolve.v1` 保留其“主体几何匹配、首尾各20%停留”的专用合同，不能把普通淡化都叫主体匹配。

参考：[Adobe Premiere 转场分类](https://helpx.adobe.com/premiere/desktop/add-video-effects/effects-and-transitions-library/list-of-video-transitions.html)。
