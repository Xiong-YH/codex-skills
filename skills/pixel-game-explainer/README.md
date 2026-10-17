# pixel-game-explainer

用于持续优化现代像素讲解视频 skill，位于 `codex-skills` 总仓库的 `skills/pixel-game-explainer/`。保留原始 32 秒 V7 基线、源码和素材，并收纳已有验证记录的 8 秒 Windows 样例《把大任务拆成小步》。

## 项目入口

在 Codex 中打开总仓库。维护本技能时先读取根目录约定、本目录 [AGENTS.md](AGENTS.md) 和 [优化计划](docs/optimization-plan.md)，制作规则以本目录 [SKILL.md](SKILL.md) 为准。

```text
SKILL.md                         技能入口
agents/                          原技能的界面元数据
references/                      视觉、嘴型、音效和制作参考
assets/starter/                  原始 32 秒种子工程
assets/reference/                原始 V7 视频和历史核验
scripts/                         原始初始化、构建和 macOS 出片工具
examples/small-steps-8s/          8 秒样例源码、数据和音轨
examples/small-steps-8s/reference/ 已交付成片、封面和实际媒体核验
experiments/windows-render/      Windows 原生 Canvas 渲染实验
docs/                            优化计划、导入来源和环境记录
```

本目录是该 skill 的维护源；总仓库技能索引见 [根目录 README](../../README.md)。全局 skills 安装目录未被本次对齐修改；原包使用说明中的“已安装”描述来自其来源机器。原始导入记录保留在 `docs/import-manifest.json`，其中的旧仓库布局描述仅对应导入时点；本次总仓库对齐与检查见 [对齐记录](docs/repository-alignment.json)。

## 检查和重建

需要 Python 3、Pillow 与 NumPy。以下命令在本技能目录执行；从总仓库根目录先运行 `Set-Location skills/pixel-game-explainer`。在 Windows PowerShell 中显式使用 UTF-8：

```powershell
$env:PYTHONUTF8 = '1'
python scripts/project.py check assets/starter
python scripts/project.py check examples/small-steps-8s
python scripts/project.py build examples/small-steps-8s
```

最后一条命令生成可重建的 `examples/small-steps-8s/build/film.html`。改字幕时同步改拼音短句，改动作或时长时同步改声音事件；声音发生改动后先运行 `python scripts/project.py sound <工程目录>`。

Windows 的 8 秒实验运行方式见 [实验说明](experiments/windows-render/README.md)。原 `scripts/render.py` 仍采用 macOS AVFoundation；一次 Windows 样例成功不代表原始 32 秒工程或任意新主题已通过跨平台验证。

## 已有对照与后续方向

8 秒样例已经核验为 1920×1080、60 fps、480 帧，包含 H.264 视频与 AAC 48 kHz 双声道。解码音效与源 WAV 的延迟为 0，相关性大于 0.9999。`reference/` 下的报告记录的是此前实际成片；其中位置字段转换为仓库相对位置，数值结果保留。

下一步先统一跨平台渲染入口和依赖配置，再验证 8 秒样例与 32 秒基线。风格、角色和默认片长的调整应来自具体制作需求，不把本次随机主题固化成技能默认行为。
