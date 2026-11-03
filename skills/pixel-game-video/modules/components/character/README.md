# 完整人物接取道具试样

`object.character-offer-receive.v1`：当前为阿墨正面接信动作，状态为 `prototype-whole-pose-sequence`。静帧造型及独立接信动作已获用户认可，并作为预合成素材用于第一镜；尚未注册为工作台可编辑的原生组件。

## 五维约定

| 维度 | 当前约定 |
| --- | --- |
| 表达 | 桌上同一封信被人物握住、收回胸前，最终持有；不出现第二封信或录用结果结算。 |
| 形态 | 与确认静帧一致的墨发、靛蓝衬衫、白色内搭、完整上半身，固定正面视角。 |
| 动作 | 准备→伸手→双手接触→抬起→收回→持稳。宿主传入镜内秒数，3.2 秒试样后保持末态；不自播或循环。 |
| 素材 | 4×2 透明精灵表，8 张完整人物姿态；头部与身体不拆开，手、信封和手臂在同一姿态图内；少量注册偏移稳定头部位置。标签由绘制器附着信封绘制。 |
| 能力 | 状态纯函数与 Canvas 绘制器可复用；位置、等比尺寸及时间由宿主控制。只支持这份动作图的视角、人物与信封；更换人物或道具需补齐完整动作素材及对应注册参数。不是骨骼、光流补间或任意抓取。 |

## 调用

浏览器加载 `offer-receive.js`；Node 可 `require`。先加载图片，再构造实例：

```js
const actor = PixelOfferReceive.create({spriteSheet: decodedImage});
actor.draw(ctx, {time: 1.13, x: 224, y: 8, width: 512, height: 512});
const state = actor.stateAt(1.13);
```

图片路径为 `assets/amo-offer-receive.png`，见同目录素材来源 JSON。`draw` 不清空宿主画布，只在指定矩形内等比绘制，不拉伸人物。`label` 默认 `OFFER`，可为空或不超过 10 个字符。当前画法的标签字体固定，不承诺所有长标签都适配。

`stateAt` 拒绝非有限时间，负值取初态、超过试样长度取持稳态。离散姿态的触点在 0.68 秒；`owner` 此前为 `table`，此后为 `candidate`。每帧中的信封均属于同一视觉身份，不能与宿主另画的信封重复叠加。试样的 3.2 秒不等于正式镜头时长。

## A 的举纸、前伸与停止

`object.transcript-reach-hold.v1`，入口为 `transcript-reach.js`，素材为 `assets/a-transcript-reach.png`。这是第一人称双手、袖口与一张成绩单的完整姿态序列；左手先举纸，右手前伸，3.6 秒到达停止姿态并保持。`stateAt` 返回单一成绩单身份、抬升进度和阶段。`create({spriteSheet})` 后调用 `draw(ctx,{time,x,y,width,height,title,rank})`；默认标签为“成绩单”“绩点 · 专业前列”，随纸面注册位置绘制，不附会具体分数。

素材排版不是均匀网格，绘制器使用实测行槽位和纸角注册，并裁掉非对象区域的透明残渣。只验证了该素材、原构图和等比缩放，不支持任意精灵表。人物/纸内的文字属于道具纹理；讲解字幕仍独立成轨。测试入口为 `node tests/transcript-reach.cjs`。

宿主需按场景恢复 B 下方的桌面遮挡，不能把截断的躯干直接悬空放到桌面中间。接信起点、A 停手和运镜时机由各镜头单独编排，不作为组件默认节奏。A 新动作与组合镜头仍待用户审看。

[播放与慢放](../examples/offer-receive/index.html)。状态契约测试：在 skill 根目录执行 `node tests/offer-receive.cjs`。画面和播放验证另外记录，Node 测试不代替审美认可。
