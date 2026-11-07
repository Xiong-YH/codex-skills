# 导演只从一个入口选型

打开[导演选型目录](library.html)，或查询 `python modules/motion/library.py --intent attention`。
先确定解释目的，再选一个效果，最后读取它的调用说明、实现边界与动态预览。
默认仅返回当前后端的常用可调用项，不要求导演通读算法、旧配方和研究记录。

目的：focus突出重点、attention转换关注、space交代空间、handoff交接内容、emphasis强调事件、reading稳定阅读。
固定机位是正式选项，不要求每镜增加运动。能力选择不代替逐镜设计或本片验收。

## 一份选型源，两种入口

`selection.json` 唯一维护设计ID、目的、状态、推荐层级、调用绑定及资源引用。
`library.py` 联查实际 `catalog.json` 和 `engine/backend_caps.py`，解析参数及可用后端，
HTML和命令行使用同一结果。不会在选型表另抄参数范围或把缺少的执行器视为现成能力。

`design.motion.*` 是设计选型ID，不能写入recipe。可调用项的binding给出真实recipe及必要变体；
具体事件、时长、关注点和素材仍由本片设计决定。曲线默认值继续只归pulse-spec.js。

```text
python modules/motion/library.py --intent handoff
python modules/motion/library.py --intent space --include-designs
python modules/motion/library.py --intent focus --backend remotion
python modules/motion/library.py --id design.motion.slam
python modules/motion/library.py --build
python modules/motion/library.py --check
```

没有匹配项时返回空结果；未知目的或不可用ID报错，不擅自换成别的后端或近似动效。
后端筛选只证明motion级白名单，场景、人物、风格和素材组合仍由编译器核验。

## 状态和维护边界

- ready：已有可调用绑定；HTML若无同源单项预览会明示，不能用其他效果冒充。
- approved-design：用户认可的六种HTML设计源，默认不混入可调用结果；打开“待接入设计”才展示，不能复制为正式配方。
- retired：撤回记录，仅保留追溯，不进入选择结果。
- compatibility：旧或特定用途配方，默认收起，需要时显式展开，保留旧工程兼容。

新增／修改效果：先维护实际catalog、校验及执行器，再更新一个selection条目，生成HTML并检查。
检查覆盖全部现有可用recipe、预设变体、资源路径、状态和生成页时效；新目录不改变旧工程ID或渲染算法。
发布独立skill须带上生成HTML、JSON、查询器和引用的本地示例，不能只复制页面。

本结构借鉴GSAP的命名效果注册与配置复用思想，未复制其注册实现：
https://gsap.com/docs/v3/GSAP/gsap.registerEffect()/ 。上游GSAP示例和Frametell派生执行器仍各自保留原许可。
