# 工程、依赖与出片

## 初始化与改动范围

将 `SKILL_DIR` 指向这个 skill 的绝对目录。项目要在独立目录创建，初始化拒绝覆盖已有目录。

```sh
python3 "$SKILL_DIR/scripts/project.py" init "$PROJECT_DIR"
python3 "$SKILL_DIR/scripts/project.py" check "$PROJECT_DIR"
python3 "$SKILL_DIR/scripts/project.py" build "$PROJECT_DIR"
```

`build/film.html` 为自包含预览，音效已嵌入，可直接打开；构建会生成高清字幕与嘴型数据。`build/` 与 `work/` 是可重建文件，`outputs/` 为成片。

## 种子工程的契约

| 文件 | 修改内容 |
| --- | --- |
| `project.json` | 标题、品牌、时长、fps、输出尺寸、章节和镜头标题 |
| `captions.json` | 文案、时间、需要强调的文字 |
| `mouth-phrases.json` | 每段字幕对应的拼音短句，顺序和数量一致 |
| `sound-score.json` | 动作音效时点、类别、变化、响度与位置 |
| `source/film.js` | 镜头编排、代码墙与整体时序 |
| `source/game-board.js` | 任务、连通系统、异常与护盾的演绎 |
| `source/game-loot.js` | 方案选择、项目装配与完成反馈 |
| `source/game-art.js` | 原生像素道具和环境 |
| `source/motion.js` | 连续相机与最终分辨率变换 |
| `source/visual.js` | 人物合成与高清文字 |
| `source/prepare_assets.py` | 脸部口型和眨眼变体；身体一致性检查 |

标题和字幕配置化不等于场景自动适配。V7 的节点、动作时点和场景标题含义仍在源码中。新主题/时长要一起改上述数据和场景；不要只改 `duration` 把旧内容截掉。嘴型、音轨、字幕、章节的边界必须都覆盖新时长。

默认输出 1920×1080，原生世界 320×180。坐标合成按 6 倍设计；改变尺寸或原生网格前需同步适配像素缓存、文字布局、合成比例与相机，不能只改 manifest。脚本会拒绝未适配的尺寸配置。`fps` 可配置，但更高帧率不解决取整抖动。

选用新人物时，加入原生 PNG 和记录，更新 `lead`、哈希及相应脸部坐标。只用原始角色的身体行做一致性检查，不能用旧角色的身体去判断新设计是否正确。

## 依赖

- 初始化/契约检查：Python 3 标准库。
- 预览构建：Python 3 + Pillow。种子带有预合成音轨。
- 重新合成音效：Python 3 + NumPy。
- 浏览器帧导出：Node.js + Playwright + 可用 Chromium/Chrome。
- 当前已验证的视频编码、合成与解码：macOS Swift / AVFoundation。浏览器预览可跨平台；视频导出在其他系统需另配并核验编码器，脚本不会假装成功。

优先使用当前工作环境已有依赖。Codex 桌面可用 workspace dependency discovery 查询运行时；不要把某位用户的缓存路径写进 skill 或交付源码。

Playwright 默认从项目的 Node 模块中解析。已有模块或浏览器时可显式指定：

```sh
export PIXEL_PLAYWRIGHT_MODULE="/absolute/path/to/playwright"
export PIXEL_BROWSER_EXECUTABLE="/absolute/path/to/chrome"
```

没指定浏览器时使用 Playwright 安装的 Chromium；缺少依赖会报出原始错误，不自动联网安装。

## 样片与完整成片

```sh
python3 "$SKILL_DIR/scripts/render.py" "$PROJECT_DIR" --name handoff --start 15.2 --end 16.2 --silent
python3 "$SKILL_DIR/scripts/render.py" "$PROJECT_DIR" --name film
```

`--silent` 会构建真正的静音视觉预览并导出无音轨媒体，嘴型仍保留。它不读取或要求旧音轨、声音事件，无需先重做声音。只构建预览时也可使用 `project.py build PROJECT_DIR --silent`。片段按帧边界对齐，音效截取使用同样的起点；不会把 15 秒处的画面配上 0 秒处的声音。每个 `--name` 对应独立工作目录和成片，已有成片需明确加 `--overwrite` 或换版本名。

脚本顺序：契约检查 → 构建预览 → Chrome 按固定时间渲染 PNG → AVFoundation 编码 → 按同一源时间截取音轨 → 解码核验帧时间。浏览器预览以音频时钟驱动画面，导出以固定 `frame/fps` 渲染，不依赖录屏和机器的实时速度。

`outputs/<name>-verification/metadata.json` 保存实际分辨率、fps、帧数、时间间隔和音轨数量；`work/<name>-frames/render-metrics.json` 保存浏览器错误和原时间范围。实际检查这些结果，不能仅凭文件存在就说成功。媒体检查不新增单元测试或运行测试套件。

## 交付和成本说明

给完整 MP4，必要时附自包含 HTML、源码、独立 WAV 和决策说明。说明生成声音/画面的方式和实际检查结果。用户问成本时，分别说明模型生成/迭代、运行渲染资源和人工审稿；不要把代码渲染本身的低增量成本当作整个制作成本。具体付费模型单价需另行核实，不能用本示例时间推导固定报价。
