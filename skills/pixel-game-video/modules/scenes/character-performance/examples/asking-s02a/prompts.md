# 素材生成输入与来源

## 第三次：桌椅承重结构纠错

用户指出人物侧桌脚缺失。原seated-actions.png记为结构失败历史图；当前采用seated-actions-v2.png。内置image_gen以原九格为编辑目标，要求完整重绘家具结构，保留角色、九姿态和物件状态；不是代码画脚覆盖。

实际编辑提示词：

Correct the FURNITURE STRUCTURE in this exact 3x3 transparent pixel-art atlas, keeping all nine student poses, face/hair/clothes, notebooks, pens and phone states. The desk currently has only visible supports on the far-right end and no credible support at the student-side left end: this is a structural error, not acceptable occlusion. Redraw the SAME stable four-legged wooden desk in EVERY cell. In particular show a solid NEAR-LEFT DESK LEG connected to the front-left underside of the tabletop (next to the seated student) and extending down to the same floor plane as the right legs and stool. Shift the student-side leg slightly toward the visible front-left tabletop corner if necessary so its connected top and lower shaft/foot can be clearly traced; the student's body may occlude a short portion only, but do not erase the entire leg or have it terminate in a thigh. Include the far-left support where perspective permits, and correct apron rails and all perspective connections. The stool is separate furniture with its own legs, not a replacement support for the table. The table should be mechanically credible with a front apron, two visible front corner supports, and corresponding rear supports, same proportions and positions across nine frames. Preserve all foreground/background occlusion realistically. Do not create extra human limbs, duplicate phones, floating wood bars or unattached legs. Keep exact 3x3 equal-cell grid, same square canvas, pixel scale, transparent empty background, crisp clean edges, same warm light. Final cell has single phone held in hand and no phone on desk. Do not add text, borders, arrows or captions. This is a whole-scene furniture correction with the complete characters preserved; do not alter poses to hide the missing support.

逐格观察：新增近侧左支脚接于前围板下沿并落地，右前脚及后侧支撑保留，凳子独立；未发现新增人物肢体或桌上重复手机。细小边缘杂色、家具像素差异仍有保留，未扩大为用户美术认可。

使用内置 image_gen，未使用CLI/API回退。身份参考为本技能 library/characters/actions/00-lead/neutral.png。新图只作为本例完整姿态候选，不覆盖旧原图、角色白名单或正式蓝灰服装素材。

## 第一次：动作图集（输入要点）

生成一张透明3×3完整坐姿动作图集。要求九个等尺寸格，同一棕发小棕、绿外套、米白T恤、深蓝裤鞋、Q版整体比例；同一右向侧／三分之四机位、木桌、凳子、打开的笔记和一台黑手机。采用chunky规范：大像素簇、硬边阶梯轮廓、少量离散色阶、统一人物与家具颗粒、左上暖光、无马赛克滤镜或柔焦光晕。人物、桌子、椅子、纸笔与手机一起成立，不拆头或肢体。

逐格动作：①持笔悬停；②笔尖碰纸留小痕迹；③抬腕停笔；④划掉尝试；⑤放笔并看手机；⑥伸手但未接触；⑦退回半程犹豫；⑧决定抓住桌上手机；⑨拿到胸前查看，桌上不留同一手机。每格要求两臂两手，肩肘腕链条连续，手中物与接触一起绘制。无对白、标签、文字、边框或额外人物。要求网格1536×1536，工具实际输出1254×1254；采样按实际418像素单格，不假定提示词分辨率已兑现。

第一版存在大量灰红色半透明光晕，未用于当前播放。

## 第二次：透明清稿（实际英文提示词）

Edit this exact animation atlas ONLY to clean transparency. Preserve the exact 3x3 grid, cell alignment, nine poses, all character colors and shapes, desks, stools, notebooks, pen and phone positions. Remove ALL smoky gray, red, yellow and white halo artifacts outside the actual drawn figures and furniture. Every pixel of empty background and every space between cells must be fully transparent with clean hard pixel-art edges, zero glow, zero shadow fog, zero colored fringe. Keep genuine navy outlines and the solid colored character/furniture interiors opaque. No reshaping or new acting poses. In each of the nine vignettes keep one character with two arms/two hands; in final cell the single phone stays in the hand and is absent from desktop. Keep all pixels of the actual figure and furniture consistent with original as closely as possible. This is alpha-edge cleanup, not a new illustration. Output one same-square 3x3 atlas, true RGBA transparency.

实际输出是 assets/seated-actions.png。已检查九格姿态、单手机归属与完整人物连接；部分边缘仍有细小彩色杂边，家具与头发也有轻微变化。未宣称精确像素配准、连续补帧或用户美术认可。哈希、实际尺寸、源矩形与已知限制见 assets.json。
