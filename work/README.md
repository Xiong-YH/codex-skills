# 工作视频

在仓库根目录运行 `node work/catalog/build.mjs`，用浏览器打开生成的 `work/index.html`。按标题、主题或工程名查找在制项目，直接进入视频、预览、可编辑工程和审片记录。引用样例从独立的 [参考区](../references/README.md) 查找。

`work/` 只收实际视频制作项目及随片使用的文件。独立头像、图片任务、提示词和试听试验放到仓库根目录的 `scratch/<任务>/`。整个 `scratch/` 由 Git 忽略。

## 登记工作项目

每个主题保留一个稳定的 `id`。在 [共享登记](catalog/shared.json) 或本机的 `catalog/local.json` 写标题、主题、主工程目录和实际链接。新版本加到同一条记录。归档过的旧版本通过 `related` 指向现有位置。

`film` 条目至少要登记一个本机视频文件、视频发布地址，或一份有视频制作结构的源文件。尚在文案或分镜阶段的影片可以登记创作器状态、视频简报、文案或分镜 JSON。HTML 预览和随片素材可以附在同一条记录。

| 字段 | 用法 |
| --- | --- |
| `id`、`title`、`topic` | 稳定标识、片名和这一片要讲的内容 |
| `kind` | `film` 工作项目 |
| `project` | 当前工程目录，相对于 `work/` |
| `updatedOn` | 最近一次有记录的制作日期，可省略，格式为 `YYYY-MM-DD` |
| `featuredTarget` | 主播放入口在 `links` 中的 `target`，可省略。默认依次查找发布链接、本机视频和预览 |
| `links` | 每项用 `kind`、`label`、`target`。类型支持 `video`、`preview`、`source`、`review`、`published`、`file`。可附版本日期 `date` 和片长秒数 `durationSeconds`。观看入口可附封面 `poster`，填写相对于 `work/` 的 JPG、PNG、WebP 或 AVIF 路径 |
| `related` | 旧工程、版本或资料的相对路径列表，可省略 |

本机链接按 `work/` 写相对路径，发布链接用完整的 HTTP 或 HTTPS 地址。共享项目可用相同 `id` 在 `local.json` 更新本机制作日期和主播放入口，并追加 `links` 和 `related`。改完登记后重新生成页面。用 `node work/catalog/build.mjs --check` 检查记录和路径。

`catalog/local.json` 与生成的 `index.html` 留在本机。可跨电脑复现的工作记录放入 `catalog/shared.json`，并按根目录的 `.gitignore` 放行工程和所需素材。

## 放置工程文件

每部新片放在 `work/<项目>/`，续作沿用主工程目录。目录按实际需要创建。

| 路径 | 内容 |
| --- | --- |
| `README.md`、当前入口 | 运行方式和项目约束 |
| `src/`、`media/` | 可编辑工程、镜头源、素材与来源 |
| `review/` | 审片记录、版本和认可范围 |
| `exports/` | 成片和同次导出的工程 JSON |
| `versions/` | 需要保留的回退版本 |
| `.tmp/`、`build/`、`frames/` | 可重建的缓存、中间构建和逐帧产物 |

本机 `迁移索引.md` 保留当前工作的 `outputs/` 入口对照。搬迁时核对旧入口、相对依赖和实际构建。大型素材按项目记录的存放位置交接，保留来源和哈希。
