# 基础依赖与交接

需 Python 3.10+ 与 [requirements.txt](../requirements.txt)。渲染依赖由 pixel-game-video 自己的 doctor 检查。

定位顺序：显式 `--foundation` → `PIXEL_VIDEO_SKILL` → 同级 `pixel-game-video/` → `$CODEX_HOME/skills/pixel-game-video`（未设置则 `~/.codex/skills/`）。显式目录无效时直接报错，不换到另一份版本。独立安装 director 时，同时安装基础 skill 或配置该路径。

```text
python scripts/director.py doctor --foundation FOUNDATION
python scripts/director.py init PROJECT --example
python scripts/director.py check PROJECT
python FOUNDATION/scripts/video.py catalog
python scripts/director.py handoff PROJECT --foundation FOUNDATION
python FOUNDATION/scripts/video.py build PROJECT/video
python FOUNDATION/scripts/video.py render PROJECT/video --name film
```

`PROJECT` 和 `FOUNDATION` 是使用者选择的目录占位符，不写入工程配置。具体出片参数、模块状态和运行条件读取基础 skill 的入口及 `video.py --help`。

handoff 将四份创作源合成为 `video/{project,timeline,text,audio}.json`，设置 `authoringMode=director`。先在同级临时目录调用基础 validate，通过后才写入目标。时间无静默补齐，未知素材、配方和未支持参数由基础层校验拒绝。

`video/source-map.json` 保存：

- generatedHashes：四份生成文件的原始字节 SHA256。
- sourceHashes：四份创作源的字节 SHA256，路径相对 video/。
- mappings：`generatedFile + jsonPointer → sourceFile + stableId + field`。

再次交接前检查生成文件哈希。被手改时，先对照映射把修改回写源文件，再恢复生成文件到上次交接版本；不能用 handoff 强制覆盖丢掉更改。`.director-state.json` 记录上次交接的源快照，供 impact 比较。项目迁移时一起保留源文件、映射与 Review。

基础层独立工程可使用 `authoringMode=direct` 直接编写 VideoSpec；director 不复制基础引擎、素材或运镜规则。
