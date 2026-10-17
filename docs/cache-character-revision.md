# 缓存试片：人物与动作重排

后续方向已修正：用户确认人物主要固定在侧边口播，不需要本实验中的角色活动。当前实例见 [18 秒考研口播](cs-postgrad-18s.md)，本文保留为历史实验记录。

## 复现与修正

用户指出前版过于呆板，且失去了已确认人物。基线为提交 `21e0778` 的 28.4 秒缓存片，MP4 SHA256 `2bcbf2032a872dd745a24efa940894a12dd6a9b1e6d1f24ee735895134110e1a`，实际解码帧见 [前版记录](cache-narrative-trial.md)。前版六镜全为 actor:null，大部分解释依靠固定位置的程序、缓存、原始数据设备和虚线路径；两次强推进没有改变后半段的构图与动作单调。

“人物不一定在每个画面里”被过度解释为整片无人。本次保留暗色像素工作台与机房、原来的六句旁白和时长，恢复 `actor.lead02.v1`，把程序流程改成角色的取数行动。前版工程与场景保留供比较。

| 镜头 | 前版 | 修订版 |
| --- | --- | --- |
| 提问 | 两端设备与移动请求点 | 02 在工作台先反应，再动身 |
| 第一次取数 | 数据块沿虚线往返 | 人物跑到机房数据仓，伸手取 A，抱着返回；镜头跟拍 |
| 保存副本 | 设备放大和数据块移动 | 人物与缓存近景，手里原 A 保留，另一份沿弧线落位 |
| 命中 | 数据块沿短虚线运动 | 人物只做短距离伸手取 A，缓存仍留 A |
| 未命中 | 在同一幅流程图里走远路径 | 查缓存发现没有 B，人物跑出；前景机柜遮挡切到机房，抱 B 返回 |
| 收束 | 短路径循环 | 人物、手中 A、缓存同框，反应后落稳，镜头停留 |

## 模块边界

- `library/actor-performance.js` 在运行层组合原图头、身体与手脚切片，维护走跑、伸手、抱持、歪头与反应。原始 32×36 PNG 未修改，脸部采用原图休息嘴型，眨眼仍用已确认变体。这是 02 专用适配，不宣称通用骨骼或侧面动画素材。
- `scenes/cache-adventure.js` 独立编排角色与物体接触，沿用数据旅程的事件及身份状态合同；场景必须指定 actor。没有把本片逻辑塞进通用人物绘制器。
- `motion.camera-track.v1` 维护关注点和景别变化，画幅内限制位移；与其他相机运动重叠时报错。`motion/staging.js` 维护前景遮挡辅助，miss 的场所切换藏在机柜覆盖中点。
- `text` 支持风格配置字幕底板高度；像素计算版收薄至画高 .105，字幕继续独立于相机绘制。其余风格保留默认高度。
- 旁白和语义音效继续用原有文件及事件，额外脚步用低音量事件音效；没有因恢复人物而强行模拟口播嘴型。

## 复跑

示例：[cache-adventure](../skills/pixel-video-director/examples/cache-adventure/brief.json)。按 [运行说明](../skills/pixel-game-video/references/runtime.md)配置依赖、浏览器、FFmpeg 与字体后，在仓库根执行：

```text
python -c "import shutil; shutil.copytree('skills/pixel-video-director/examples/cache-adventure','work/cache-adventure')"
python skills/pixel-video-director/scripts/director.py handoff work/cache-adventure
python skills/pixel-game-video/scripts/video.py render work/cache-adventure/video
python skills/pixel-game-video/scripts/video.py inspect work/cache-adventure/video
python skills/pixel-game-video/scripts/video.py export-project work/cache-adventure/video work/cache-adventure-standalone
python work/cache-adventure-standalone/pixel-game-video/scripts/video.py build work/cache-adventure-standalone/project
```

已有目录时选新的工作目录。新一轮的实际成片、哈希与核验范围另见 [核验记录](cache-character-verification.json)。角色表演、场景风格和本片时长仅为此样例的选择，不推广为每支视频都必须全程出现人物。

## 实际核验

本次 Windows 环境下完成 28.4 秒、1920×1080、60fps 的整片导出，1704 帧。媒体与源文件绑定共 21 项检查通过。基础层 33 项、导演层 14 项测试通过；两个 skill 的结构校验通过，另检查相机运行时的端点、末态保持和随机访问帧一致性。

已查看 17 张构图检查帧、实际 MP4 解码的 136 张关键静帧联系表及六句字幕的原尺寸代表帧。联系表：[01](verification/cache-character-contact.jpg)、[02](verification/cache-character-contact-02.jpg)、[03](verification/cache-character-contact-03.jpg)、[04](verification/cache-character-contact-04.jpg)。原始角色文件 SHA256 与已确认版本一致；动作中 A 的原件、副本与 B 请求保持区分，字幕在机柜遮挡期间仍独立显示。

独立快照在另一新目录重建并渲染第 760 帧成功，图片、人物和声音素材完整。该帧与完整渲染的对应源 PNG 比较，2,073,600 个像素中差异为 0；六段 WAV 副本逐字节一致。这是本次相同运行环境的结果，不宣称跨字体或跨平台逐像素一致。

检查范围仍是解码静帧与媒体指标，未完成连续实时观看和主观听音。review 的 text/technical 为 passed，其余保留 not_reviewed。原角色只有正面图，本次手脚关节组合尚未提供完整侧身、背面或逐姿态绘制的动画素材；方向与比例是否符合预期，仍需结合实际播放评价。
