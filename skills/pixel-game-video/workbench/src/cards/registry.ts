// Adapted from video-shotcraft Workbench (Copyright 2026 Wei Yihao, Apache-2.0), 2026-10-21.
import type { CardDef } from "./types";
import { textBasicCard } from "./text-basic";
import { titleCardCard } from "./inkpress/title-card";
import { captionStripCard } from "./inkpress/caption-strip";
import { flashCutCard } from "./inkpress/flash-cut";
import { audioClipCard, imageClipCard, videoClipCard } from "./media-cards";
import { BG_CARDS } from "./background-cards";
import { PROJECT_CARDS } from "./projectCards";
import { buildCardRegistry } from "./buildRegistry";

/** 注册表（同 id 先到先得）：
 *  - 工作台原生卡：通用文字 / Ink Press 字卡 / 解说条 / 闪白转场（全部 schema 参数化）
 *  - 媒体卡：音频 / 视频 / 图片（成片工程 public/ 与仓库音效库都走它们）
 *  - 背景卡
 *  - 成片单元卡：已链接成片工程 workbench.ts 清单里的镜头 / 转场 / 字幕 / 叠加层
 *  此独立版本不依赖外部 demo/gallery，所有默认卡在本应用内实现。 */
const ALL: CardDef[] = [
  textBasicCard,
  titleCardCard,
  captionStripCard,
  flashCutCard,
  audioClipCard,
  videoClipCard,
  imageClipCard,
  ...BG_CARDS,
  ...PROJECT_CARDS,
];

const registry = buildCardRegistry(ALL);
export const CARD_LIST: CardDef[] = registry.cardList;
export const CARDS: Record<string, CardDef> = registry.cards;
