# 素材生成输入与来源

## 桌椅承重结构修正

原试样缺少人物侧桌脚。当前九格候选用整幅编辑修正家具，保留角色、九个姿态和物件状态。复核按桌面、围板、支脚、地面的顺序逐格检查。

实际编辑提示词：

Correct the FURNITURE STRUCTURE in this exact 3x3 transparent pixel-art atlas, keeping all nine student poses, face/hair/clothes, notebooks, pens and phone states. The desk currently has only visible supports on the far-right end and no credible support at the student-side left end: this is a structural error, not acceptable occlusion. Redraw the SAME stable four-legged wooden desk in EVERY cell. In particular show a solid NEAR-LEFT DESK LEG connected to the front-left underside of the tabletop (next to the seated student) and extending down to the same floor plane as the right legs and stool. Shift the student-side leg slightly toward the visible front-left tabletop corner if necessary so its connected top and lower shaft/foot can be clearly traced; the student's body may occlude a short portion only, but do not erase the entire leg or have it terminate in a thigh. Include the far-left support where perspective permits, and correct apron rails and all perspective connections. The stool is separate furniture with its own legs, not a replacement support for the table. The table should be mechanically credible with a front apron, two visible front corner supports, and corresponding rear supports, same proportions and positions across nine frames. Preserve all foreground/background occlusion realistically. Do not create extra human limbs, duplicate phones, floating wood bars or unattached legs. Keep exact 3x3 equal-cell grid, same square canvas, pixel scale, transparent empty background, crisp clean edges, same warm light. Final cell has single phone held in hand and no phone on desk. Do not add text, borders, arrows or captions. This is a whole-scene furniture correction with the complete characters preserved; do not alter poses to hide the missing support.

逐格观察：新增近侧左支脚接于前围板下沿并落地，右前脚及后侧支撑保留，凳子独立；未发现新增人物肢体或桌上重复手机。细小边缘杂色、家具像素差异仍有保留，未扩大为用户美术认可。

图集用内置 image_gen 制作，身份以素材库的待机姿态为参照。图集尺寸、采样范围和来源见 [素材清单](assets.json)，初版撤回原因见 [迭代记录](../../../../../references/iteration-history.md)。
