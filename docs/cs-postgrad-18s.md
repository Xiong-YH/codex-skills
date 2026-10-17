# 18 秒《计算机，要不要考研？》

## 当前确认的表现方向

人物主要固定站在画面一侧口播，另一侧用像素图文辅助说明；只需嘴型与眨眼，不安排跑动、取物、抱持等剧情活动。此前人物动作版属于方向偏差，保留为历史实验，不作为当前默认样例。保留已确认的 02 暖棕蓬发形象，以及暗色像素工作台背景。

本片严格 18 秒，1920×1080、60fps、1080 帧。四段合成旁白实测总长约 14.23 秒，其余时间用于内容区转场、停顿与片尾保持，未剪断语音或整片变速。

| 时间 | 旁白 | 右侧辅助画面 |
| --- | --- | --- |
| 0–3.3s | 计算机，要不要考研？ | 读研与就业并列，先提出选择问题 |
| 3.3–8.4s | 想做研究，或目标岗位要求硕士，可以考。 | 学位帽、研究兴趣与明确学历门槛 |
| 8.4–13.2s | 想尽快就业，先做项目、找实习。 | 项目电脑、项目与实习关键词 |
| 13.2–18s | 别跟风，先看目标，再看岗位要求。 | 目标方向、岗位要求、时间与成本逐项出现 |

文案是条件判断框架，参考研招网刊载的[考研与就业访谈](https://yz.chsi.com.cn/kyzx/kydt/201905/20190509/1790362920.html)及[计算机硕士培养方案](https://www.cs.tsinghua.edu.cn/__local/6/2B/74/43E402B80F178897CFE6FCED2AD_09F6E122_6157F.pdf)。前者是 2019 年文章，仅用于职业目标与研究兴趣的判断思路，不引用其当年市场数字，也不推断所有岗位的学历要求。来源范围独立保存于样例 content-notes.json。

## 模块维护

- `library/education.js`：学位帽、公文包、项目电脑和目标的 64×64 像素图标，不包含文案或镜头时序。
- `scenes/presenter-board.js`：pair / hero / checklist 三种右侧布局，按事件出现图文。物体位置仍在 storyboard，素材选择在 production-plan，所有标题与标签在 script。
- `library/runtime.js` 与 style.presenter：固定人物尺寸、横坐标和脚底锚点。使用原来的十个脸部变体，不调用活动表演器；像素计算风格将脚底对齐工作台。
- `motion`：只使用内容区 panel-slide / pixel-iris，以及物体进入；不使用全画幅相机或人物运动。字幕独立绘制。
- `audio`：四份独立 PCM WAV、语句开始事件和轻量提示音。配音为 Microsoft Kangkang、rate=1；嘴型仍是拼音短句节奏模拟，不是真实音素强制对齐。

角色职责的约定已写回 director 的创作合同与视觉叙事参考，SKILL.md 只保留路由和当前实例入口。

## 复跑

示例：[cs-postgrad-18s](../skills/pixel-video-director/examples/cs-postgrad-18s/brief.json)。按 [运行说明](../skills/pixel-game-video/references/runtime.md)配置依赖、浏览器、FFmpeg 和字体，再在仓库根执行：

```text
python -c "import shutil; shutil.copytree('skills/pixel-video-director/examples/cs-postgrad-18s','work/cs-postgrad-18s')"
python skills/pixel-video-director/scripts/director.py handoff work/cs-postgrad-18s
python skills/pixel-game-video/scripts/video.py render work/cs-postgrad-18s/video
python skills/pixel-game-video/scripts/video.py inspect work/cs-postgrad-18s/video
python skills/pixel-game-video/scripts/video.py export-project work/cs-postgrad-18s/video work/cs-postgrad-18s-standalone
python work/cs-postgrad-18s-standalone/pixel-game-video/scripts/video.py build work/cs-postgrad-18s-standalone/project
```

已有目录时选新目录，避免覆盖旧片。独立工程携带源码、素材与旁白，运行时和字体仍需配置；只验证当前 Windows 环境，不扩大平台支持范围。

实际成片与输入哈希、媒体核验、人物固定区域比较、独立重建及审查范围见 [核验记录](cs-postgrad-18s-verification.json)。

## 本次核验

成片实测 18.0 秒、1080 帧，21 项媒体与源文件绑定检查通过。基础层 34 项、导演层 14 项测试通过，两个 skill 的结构校验通过。已查看实际 MP4 解码的 90 张关键帧联系表，以及四句字幕的原尺寸代表帧：[01](verification/cs-postgrad-contact.jpg)、[02](verification/cs-postgrad-contact-02.jpg)、[03](verification/cs-postgrad-contact-03.jpg)。字幕完整，稳定画面的关键词可读；右侧转场按视窗裁切，人物保持原位。

14 张源画面抽样中，人物头发、躯干与脚所在区域逐像素一致，变化只在嘴型和眼睑区域。编码后 RGB 像素不据此宣称逐像素相同，实际 MP4 的站位另通过解码静帧检查。独立工程重建并渲染第 350 帧成功，与完整渲染的对应源 PNG 比较，2,073,600 个像素中差异为 0。

review 的 text/technical 为 passed；连续实时播放与主观听音未完成，其余类别保留 not_reviewed。技术指标和解码静帧不替代完整视听审片。
