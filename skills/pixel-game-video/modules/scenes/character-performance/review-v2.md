# 人物表演库第二轮审核

状态：关系模式为待用户审核草案，本轮没有新增视频或人物栅格素材。保留原试样及第一轮源记录。

## 用户反馈与修改

- 详情内嵌播放器，替代跳转到对应案例。默认暂停，可播放指定区间、暂停、回到区间起点；切换模式停止旧播放。覆盖范围明确保留，不把同一旧片说成八个完整新示范。
- 原12条动作链偏故事化，归档到archive/sequences-v1.json。改为8项关系草案，每项有关系、变量、分支、不变量，不要求固定结局。
- 按三个层级分组并说明可叠加：行为关系、变化与节奏、段落衔接。避免把节奏修饰与行为关系混成同层八选一。
- 36项增加参考图及图类型：9项候选素材，4项近似旧姿态，23项代码构图示意。示意图有目标、接触或方向关系，不冒充精确角色素材；未制作的成品仍为design-only。

## 独立子Agent自检

按用户明确要求，启动只读子Agent performance_review，独立阅读原目录和新草案。其结论为方向合适，主要风险是分类层级混杂，以及页面可能让人误以为每项已有完整动画。

已采纳的建议：三组可组合而非八选一；播放器位于当前详情内、默认暂停、切换停止；旧案例明确选段与局部证明范围；无例子保留未制作；旧neutral/talk只能作为近似图；动作素材状态与图类型分开显示。子Agent的审查不代替用户认可，也不证明连续人物动画质量。

## 本轮核验入口

从技能根目录运行：

```text
node modules/scenes/character-performance/build-references.cjs --check
node modules/scenes/character-performance/build-index.cjs --check
node tests/character-performance.cjs
node tests/character-library-browser.cjs <截图与验证输出目录>
```

浏览器测试通过PIXEL_NODE_MODULES、PIXEL_BROWSER_EXECUTABLE指定依赖，测试本机8644预览服务。核对嵌入选段播放/暂停/复位/终点、切换到无示例项、36图实际加载、图类型筛选、小屏布局以及运行错误。实际结果以同次输出的review-ui-check.json为准。
