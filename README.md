# Codex Skills

个人 Codex Skills 总仓库。每个技能放在 skills/<技能名称>/ 下，独立维护 SKILL.md、参考资料与必要资源。

## 技能索引

| Skill | 用途 |
| --- | --- |
| [pixel-motion-transitions](skills/pixel-motion-transitions/SKILL.md) | 像素视频运镜与转场：碎屏揭示、计数积累、金光突破、书封旋转和互动卡收尾 |

## 目录

```text
skills/
└── pixel-motion-transitions/
    ├── SKILL.md
    ├── agents/openai.yaml
    └── references/
        ├── recipes.md
        └── reference-case.md
```

## 使用

将所需技能的整个文件夹复制到本机 Codex skills 目录中，保留内部目录结构。例如将 skills/pixel-motion-transitions/ 复制到 ~/.codex/skills/pixel-motion-transitions/。

调用示例：

> 使用 $pixel-motion-transitions 为我的像素视频设计并实现碎屏转场和书封旋转入场。

## 添加新技能

在 skills/ 下新增独立文件夹，包含带 name 和 description 的 SKILL.md；参考文件使用相对路径链接，并在此首页补充索引。
