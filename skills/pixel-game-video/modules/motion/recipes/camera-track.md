# 有边界的跟拍

`motion.camera-track.v1`，target 为 scene；由 start 事件与 durationFrames 定义运动窗口。

params：`scaleFrom/scaleTo` 为 1–1.75；`xFrom/xTo/yFrom/yTo` 为 0–1 的画面关注点，默认中心。相机把该点朝屏幕中央构图，位移限制在源画幅内，避免黑边。起终点之间使用平滑加减速；结束后保持终点，下一段可从前段终点接续。

关注点是场景归一化坐标，不是镜头上追踪识别出的对象。人物位移由场景事件编排，作者按同一事件安排跟拍。与 camera-push 及其他 camera-track 不得重叠；字幕在相机之后独立绘制。跟拍应给动作方向留空间，取物时减速、落稳时保持，不为每句话持续晃镜。
