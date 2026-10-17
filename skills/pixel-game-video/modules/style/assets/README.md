# 背景素材来源

## 像素计算环境

- `pixel-workbench.png` 与 `pixel-server-room.png`：分别来自本次 16 张像素计算背景探索的 02、03，供 `style.pixel-computing.v1` 使用。
- 两张均于 2026-10-17 使用内置 imagegen 生成，原始不透明 PNG 直接复制；无外部图片输入、无城市背景、无人像或游戏 HUD。
- 完整生成指令与文件 SHA256 见 [pixel-computing-prompts.json](pixel-computing-prompts.json)，用于来源追溯。执行入口仍是精简的预设与 `pixel-computing.js`。
- 背景只负责环境，终端、缓存盒、数据块、字幕与运镜分别由对应模块绘制。

## 夜城

- 文件：`cyberpunk-city.png`，1672×941，不透明 PNG。
- 用途：`style.cyberpunk.v1` 的夜城屋顶背景；人物与文字由运行层独立合成。
- 来源：2026-10-17 使用内置 `imagegen` 工具生成，未使用 CLI/API fallback；无输入参考图片。
- 最终生成指令：[cyberpunk-city.prompt.txt](cyberpunk-city.prompt.txt)。
- 选用原图直接复制入库；未进行外部素材拼接或重新绘制。画幅适配与最近邻采样在 `cyberpunk.js` 中完成。

背景生成指令仅用于素材追溯，不是 skill 的执行入口；色板、素材引用、字幕皮肤分别由预设和对应模块维护。
