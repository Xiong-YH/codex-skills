# Garden Skills 声音工具来源

[ConardLi/garden-skills 的 motion-showreel](https://github.com/ConardLi/garden-skills/tree/2b9a89340b70f632d31c0f1c69fce94a7912423e/skills/motion-showreel) 固定在提交 `2b9a89340b70f632d31c0f1c69fce94a7912423e`。原 [MIT 许可证](LICENSE)随包保留。

`scripts/` 保留原版合成、score、Tone、节拍分析、声音检查与成片检查脚本及其依赖。`assets/starter/` 保留原版 score 示例，`references/` 保留声音与审片原文，原文中的其他模块见上游工程。

依赖锁文件的下载地址使用公共 npm registry，版本和完整性哈希沿用上游。

本技能的 `render-sfx.mjs` 将 33 个原版音色接到 VideoSpec。参数、工作台分轨和事件映射见 [本地声音入口](../../GUIDE.md)。
