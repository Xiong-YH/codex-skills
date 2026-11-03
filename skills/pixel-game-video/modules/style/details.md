# 风格预设与运行接入

style/catalog.json 登记风格 ID、file 与可选 runtime。风格预设保存配色、字体角色、文字皮肤和视觉参数。场所背景、环境映射、固定人物站位和前景纹理由场景预设拥有，背景原图及来源由 library/backgrounds 拥有。

## 现有风格

| 风格 | 美术职责 | 配套场景 |
| --- | --- | --- |
| modern-pixel | 日光浅青、青绿远景、暖沙平台和奶油面板 | 通用程序背景与平台仍是此风格的后备绘制，不作为新项目场所菜单 |
| cyberpunk | 暗靛、青绿/洋红、霓虹金属面板与文字皮肤 | scenes/layouts/cyberpunk.json 与 scenes/backgrounds/cyberpunk.js |
| pixel-computing | 深色像素、金属层、暖色接缝和独立字幕皮肤 | scenes/layouts/pixel-computing.json 与配套背景执行器 |
| pixel-study | 延续像素基调，研途空间的共同配色与字体 | scenes/layouts/pixel-study.json；480×270 背景采样 |
| pixel-competition | 竞赛空间的共同配色与字体 | scenes/layouts/pixel-competition.json；复用 study 背景执行器 |
| pixel-editorial | 组件配色与中性排版备用底 | scenes/layouts/pixel-editorial.json；实际环境按项目素材设计 |

模板各自声明 style ID，已有工程按自己的 ID 继续。题材、场所、片长和人物职责不由风格预设决定。

## 预设字段与组合

- colors、fontFamily、safeArea、textRoles 提供视觉参数；实际文字测量、换行和安全区检查归 text。
- subtitle 提供背景、透明度、边线、强调色及底板高度；textShadow 的 blur/offsetY 是画高比例。文字不烘焙进背景。
- catalog 的 scenePreset 和 sceneRuntime 引用 scenes 内相对路径；公共配置解析器先读取风格，再合成场景配置，现有执行器仍读取同一 style payload。详见 [场景布局](../scenes/layouts/GUIDE.md)。
- 旧自定义预设的 assets 仍按 style 内相对路径解析；正式背景改用 libraryAssets ID。两种来源不允许重名，也不允许逃出所属模块。
- runtime 维护风格帮助与面板皮肤；具体环境选择和背景绘制已进入 scenes/backgrounds。通用日光后备与中性底色继续留在 style。

新增或更改配置后重建工程；预设、场景布局、实际使用的背景字节和执行器参与运行依赖哈希。素材原图和提示词见 [背景库](../library/backgrounds/README.md)，接入新环境见 [项目素材合同](../scenes/MEDIA.md)。

使用 environment 映射的风格会在编译时核对场景实际需要的背景，包括场景内部切换的房间；映射不存在或指向未载入素材时提前报错。项目 background 可替代普通背景选择，replacement 可替代整个场景；场景内部自行绘制的房间仍须满足其依赖，不因添加 background 而绕过检查。

## 平台边界

字体由目标机器提供，预览与导出使用同一浏览器。现有画幅、像素网格和后端支持以 [制作合同](../../references/contract.md) 为准；跨环境重新检查文字和关键帧，不根据本次文件迁移扩大支持范围。
