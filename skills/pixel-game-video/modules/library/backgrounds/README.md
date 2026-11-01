# 背景素材来源

新背景制作先读 [画风透传合同](../../style/ART-DIRECTION-CONTRACT.md)，使用本片段有效画风的通用与背景分支要求、参考图和版本，不在背景分支另选画法。[八类参考](../../style/references/index.html) 的背景局部图是美术观察参考，不是已清除人物的可用背景。以下历史素材保留原始身份与来源，不因新画风规范自动重绘。

可爱与粗像素另有 [完整干净背景对照](../../style/references/index.html#background-comparison)，新图、提示词和来源归 style 的画风参考，待用户审美确认，不注册成新的运行时 style ID，也不替换本目录历史资产。

## 像素计算环境

- `pixel-workbench.png` 与 `pixel-server-room.png`：分别来自本次 16 张像素计算背景探索的 02、03，供 `style.pixel-computing.v1` 使用。
- 两张均于 2026-10-17 使用内置 imagegen 生成，原始不透明 PNG 直接复制；无外部图片输入、无城市背景、无人像或游戏 HUD。
- 完整生成指令与文件 SHA256 见 [pixel-computing-prompts.json](pixel-computing-prompts.json)，用于来源追溯。素材 ID 由本目录 catalog.json 登记，场景通过 layouts 与 backgrounds 执行器接入。
- 背景只负责环境，终端、缓存盒、数据块、字幕与运镜分别由对应模块绘制。

## 夜城

- 文件：`cyberpunk-city.png`，1672×941，不透明 PNG。
- 用途：`style.cyberpunk.v1` 的夜城屋顶背景；人物与文字由运行层独立合成。
- 来源：2026-10-17 使用内置 `imagegen` 工具生成，未使用 CLI/API fallback；无输入参考图片。
- 最终生成指令：[cyberpunk-city.prompt.txt](cyberpunk-city.prompt.txt)。
- 选用原图直接复制入库；未进行外部素材拼接或重新绘制。画幅适配与最近邻采样在 scenes/backgrounds/cyberpunk.js 中完成。

背景生成指令仅用于素材追溯，不是 skill 的执行入口；色板、素材引用、字幕皮肤分别由预设和对应模块维护。

## 研途背景与前景

档案馆、工坊、俯视路线桌和书架前景的生成记录见 [study-scenes-prompts.json](study-scenes-prompts.json)。与工作台、机房、夜城一起保留原始字节和原素材 ID；不同场景中的历史别名可以指向同一文件，不复制原图。

布局、人物站位和 environment 选择归 [场景预设](../../scenes/layouts/GUIDE.md)，美术语言归 [风格基调](../../style/ART-DIRECTION.md)。本次迁移未重画或重新压缩素材。
