# 模块化重构核验 · 2026-10-17

这次验证的是新的两层 skill 与模块化运行链路。原 32 秒示例和 8 秒实验原样归档，Git 记录为 100% 内容相同的重命名；历史成片没有被算作新引擎验证。

## 已完成的结构

- 活动入口仅有 `pixel-game-video` 和 `pixel-video-director`，入口分别为 27 行与 22 行。
- 基础层六个模块：style、library、text、motion、audio、scenes。各 GUIDE 不超过 24 行，运动配方另分短文件。
- 目前可执行：5 种场景、4 种运动效果、02 角色、3 种物体、19 类 G2 音效。原完整互动人物卡保留为待实现参考，不混入能力目录。
- 四份制作输入共用事件帧；director 交接保留上游稳定 ID 和字段映射，拒绝静默覆盖手改生成物。

## 自动与独立使用检查

| 检查 | 结果 |
| --- | --- |
| skill-creator quick_validate | 两个入口通过 |
| 基础合同与渲染测试 | 16 项通过 |
| director 工作流与 review 测试 | 11 项通过 |
| 按入口独立使用 | doctor → 初始化 → 改画面标签 → handoff → build 成功；发现并修复标签 impact 漏项 |
| 独立工程导出 | 复制运行源码/素材后，独立目录 build 成功；导出后的 1080p / 30 fps / 2 秒片段实际编码核验通过 |
| 渲染片段与静音 | 低分辨率隔离 fixture 的有声整片、有声截取、静音截取通过，WAV 源偏移按样本核对 |
| 文档与历史 | 新 skill 的相对链接无缺项；旧目录内容保持不变 |
| 归档后旧工程入口 | 32 秒 starter 与 8 秒实验的 project.py check 均通过；未把这项输入检查写成重新出片 |

关键测试覆盖事件移动带动字幕/声音/动作、无效配方与变体、越界和字幕重叠、整数计数顺序、逐帧时间戳抖动、上游变更导致旧 review 失效，以及“局部静帧修复通过不能推导为全片通过”。

## 实际成片

新创意《先给选择设边界》修复后输出：1920×1080、60 fps、12 秒、720 个解码帧和 720 个不同时间戳；H.264 视频与 48 kHz 双声道 AAC，全部技术项通过。

运行环境：Windows 11、Python 3.12.14、Node 24.19.0、Playwright 1.62.1、Edge 154.0.4258.62；使用本机已安装 FFmpeg 的 libo264rt 编码器。可执行文件通过环境变量指定，没有跟踪个人绝对路径或二进制。

实际 MP4 的 AAC 解码波形与源 WAV 对照：相关系数约 0.999941，峰值相关延迟 0 个采样。此项证明本次封装的时间对齐，不代表已经主观听音。

输入/运行版本哈希、MP4 SHA-256、帧时间戳范围、环境和音频数据见 [机器核验摘要](modular-refactor-verification.json)。完整输出位于本地忽略目录 `work/director-acceptance/video/outputs/film-v2.mp4`。

## 真实问题与回改

| 发现 | 回改位置 | 解码证据 |
| --- | --- | --- |
| 字幕要求别急选，画面却已选中 | script c1 的文字、短句、含义 | [修复前](verification/before-000101.png) / [修复后](verification/after-000101.png) |
| 组装场景出现两个核心 | storyboard s4 的额外物体与 production-plan 运动 | [修复前](verification/before-000641.png) / [修复后](verification/after-000641.png) |
| 部件标签与结果文字重叠 | scenes 的组装布局 | 同上 |

旧片和 review-v1 保留；修复后重新 handoff、完整 render 并建立 review-v2。局部问题用实际解码帧复核；全片连续播放、运动观感与主观听音保持 `not_reviewed`，没有用媒体指标自动填成通过。

## 复现

配置依赖与环境变量后，在仓库根目录运行（`python` 指向装有 requirements 的解释器）：

```text
python -m unittest discover -s skills/pixel-game-video/tests -v
python -m unittest discover -s skills/pixel-video-director/tests -v
python skills/pixel-video-director/scripts/director.py init work/my-review --example
python skills/pixel-video-director/scripts/director.py handoff work/my-review
python skills/pixel-game-video/scripts/video.py render work/my-review/video
python skills/pixel-video-director/scripts/director.py review-init work/my-review --manifest work/my-review/video/outputs/film-verification/render-manifest.json
```

此版不宣称 Windows 通用适配完成；Linux/macOS 未实测，字体外观也需目标环境复核。原题材专属场景尚未全量迁移到新合同；TTS、真实音素对齐、三维书模型、帧缓存和完整互动人物卡未列为已完成能力。
