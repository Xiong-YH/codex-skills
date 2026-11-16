// Adapted from video-shotcraft Workbench (Copyright 2026 Wei Yihao, Apache-2.0), 2026-10-21.
import React from "react";
import { AbsoluteFill, Audio, Html5Video, Img, OffthreadVideo, staticFile, useCurrentFrame, useRemotionEnvironment, useVideoConfig } from "remotion";
import { sourceFrameAt } from "../videoFrames.js";
import type { CardDef } from "./types";

// —— 媒体卡：视频 / 图片 / 音频文件直接上轨（成片工程 public/ 与仓库音效库都走它们）——
// 视频/音频卡 kind:"video"/"audio"：裁入=trimBefore、变速=playbackRate（不能包 Freeze，会掐死原生播放）

export type PreparedVideoFrames = {directory: string; ticks: number[]; timeBase: number; rotation: number};

const VideoClip: React.FC<{
  file?: string;
  preparedFrames?: PreparedVideoFrames;
  fit?: string;
  muted?: boolean;
  volume?: number;
  inOffset?: number;
  speed?: number;
}> = ({ file = "", preparedFrames, fit = "contain", muted = false, volume = 1, inOffset = 0, speed = 1 }) => {
  const { isRendering } = useRemotionEnvironment();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  if (!file) return null;
  const src = staticFile(file);
  const timing = { trimBefore: Math.round(inOffset), playbackRate: speed };
  const size = { width: "100%", height: "100%", objectFit: fit as React.CSSProperties["objectFit"] };
  if (!isRendering || !preparedFrames) {
    // Preserve playback and the standalone Studio/CLI debugging path.
    const Media = isRendering ? OffthreadVideo : Html5Video;
    return <AbsoluteFill style={{ background: "#000" }}>
      <Media src={src} {...timing} muted={muted} volume={volume} style={size} />
    </AbsoluteFill>;
  }
  const { directory, ticks, timeBase, rotation } = preparedFrames;
  const tick = sourceFrameAt(ticks, timeBase, (timing.trimBefore + frame * speed) / fps);
  const quarterTurn = Math.abs(rotation % 180) === 90;
  const orientation: React.CSSProperties = rotation ? {
    position: "absolute", left: "50%", top: "50%",
    width: quarterTurn ? height : width, height: quarterTurn ? width : height,
    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
  } : {};
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Img src={staticFile(`${directory}/${tick}.jpg`)} style={{ ...size, ...orientation }} />
      {!muted && volume > 0 && <Audio src={src} {...timing} volume={volume} />}
    </AbsoluteFill>
  );
};

export const videoClipCard: CardDef = {
  id: "video-clip",
  name: "视频素材",
  category: "素材",
  kind: "video",
  timing: "realtime",
  durationInFrames: 150,
  accent: "#30d158",
  component: VideoClip as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "file", label: "文件（public/ 下）", default: "" },
    {
      type: "select", key: "fit", label: "适配", default: "contain",
      options: [
        { value: "contain", label: "完整显示" },
        { value: "cover", label: "铺满裁切" },
      ],
    },
    { type: "boolean", key: "muted", label: "静音", default: false },
    { type: "slider", key: "volume", label: "音量", default: 1, min: 0, max: 1, step: 0.01 },
  ],
};

const ImageClip: React.FC<{ file?: string; fit?: string; transparentBg?: boolean }> = ({ file = "", fit = "contain", transparentBg = false }) => {
  if (!file) return null;
  return (
    <AbsoluteFill style={{ background: transparentBg ? "transparent" : "#000" }}>
      <Img
        src={staticFile(file)}
        style={{ width: "100%", height: "100%", objectFit: fit as React.CSSProperties["objectFit"] }}
      />
    </AbsoluteFill>
  );
};

export const imageClipCard: CardDef = {
  id: "image-clip",
  name: "图片素材",
  category: "素材",
  timing: "realtime",
  durationInFrames: 90,
  accent: "#64d2ff",
  component: ImageClip as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "file", label: "文件（public/ 下）", default: "" },
    { type: "boolean", key: "transparentBg", label: "保留透明背景", default: false },
    {
      type: "select", key: "fit", label: "适配", default: "contain",
      options: [
        { value: "contain", label: "完整显示" },
        { value: "cover", label: "铺满裁切" },
      ],
    },
  ],
};

/** 音频卡（BGM / 音效通用）：裁入=trimBefore、变速=playbackRate，裁剪变速不哑音 */
const AudioClip: React.FC<{ file?: string; volume?: number; inOffset?: number; speed?: number }> =
  ({ file = "", volume = 1, inOffset = 0, speed = 1 }) => {
    if (!file) return null;
    return (
      <Audio
        src={staticFile(file)}
        volume={volume}
        trimBefore={Math.round(inOffset)}
        playbackRate={speed}
      />
    );
  };

export const audioClipCard: CardDef = {
  id: "audio-clip",
  name: "音频",
  category: "音频",
  kind: "audio",
  timing: "realtime",
  durationInFrames: 90,
  accent: "#ff9f0a",
  component: AudioClip as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "file", label: "文件（public/ 下）", default: "" },
    { type: "slider", key: "volume", label: "音量", default: 1, min: 0, max: 1, step: 0.01 },
  ],
};
