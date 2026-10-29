# 碎屏揭示

`motion.shatter-reveal.v1`；target 为 scene，必须从新镜头 enter 开始。
参数：x/y 为破裂中心，seed 为固定种子。

层序：新镜头 → 旧镜头同一纹理的不规则多边形碎片 → 独立字幕。
按seed生成38个采样点的Voronoi分区，破裂点附近有较小裂片；前段出现裂纹，再按距破裂点的距离与小幅错峰破开。碎片有不同转速、径向位移与下坠，末段淡出。
分区共同覆盖画幅；纹理坐标保持连续，不把整图缩进每个碎片。图样随seed固定，绝对帧定位不积累随机状态。
持续帧数按项目帧率配置；约 0.5–0.8 秒可作起点。

验收：首帧纹理一致、中段已露出新场、末帧无残片、无裸底闪帧。
已替换旧版固定12块放射三角片。当前是二维玻璃感纹理碎裂，无真实厚度、背面或玻璃物理模拟；技术验证不等于用户审美已认可。

参考：[Adobe Shatter 的形状、触发与运动控制](https://helpx.adobe.com/after-effects/desktop/apply-effects-and-animation-presets/list-of-effects/simulation-effects.html)。迁移其分区、力场与错峰思路，保持像素画风。
