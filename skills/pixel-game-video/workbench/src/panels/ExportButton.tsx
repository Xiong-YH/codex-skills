import React, {useEffect, useRef, useState} from 'react';
import {flushSave, useStore} from '../store';
import {CARDS} from '../cards/registry';
import {parseProjectJson} from '../projectValidation.js';
import {projectForTrackExport} from '../trackExport';
import {useT} from '../i18n';

/** 导出成片：提交当前工程给 dev server 的 Remotion 渲染任务，轮询进度 */
export const ExportButton: React.FC<{kind?: "mp4" | "jianying"; trackId?: string}> = ({kind = "mp4", trackId}) => {
  const t = useT();
  const [job, setJob] = useState<{ id: string; status: "running" | "done" | "error"; progress: number; lastLine?: string; downloadUrl?: string; projectUrl?: string } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const poll = (id: string) => {
    window.clearInterval(timer.current);
    timer.current = window.setInterval(async () => {
      try {
        const r = await fetch(`/api/export/${id}`);
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? `查询导出失败 (${r.status})`);
        setJob({ id, ...j });
        if (j.status !== "running") window.clearInterval(timer.current);
      } catch (error) {
        window.clearInterval(timer.current);
        setJob({ id, status: "error", progress: 0, lastLine: error instanceof Error ? error.message : String(error) });
      }
    }, 1000);
  };
  const start = async () => {
    flushSave();
    try {
      const current = useStore.getState().project;
      const project = trackId ? projectForTrackExport(current, trackId) : current;
      parseProjectJson(JSON.stringify(project), CARDS);
      const r = await fetch("/api/export", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ project, kind }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? t("export.startFailed"));
      setJob({ id: j.id, status: "running", progress: 0 });
    } catch (error) {
      setJob({ id: "", status: "error", progress: 0, lastLine: error instanceof Error ? error.message : String(error) });
    }
  };
  // Restart polling after a development refresh that preserves the active job.
  useEffect(() => {
    if (job?.id && job.status === "running") poll(job.id);
    return () => window.clearInterval(timer.current);
  }, [job?.id]);
  return <span className={trackId ? "track-export" : "export-controls"}>
    {job?.status === "done" && <a className="btn" href={job.downloadUrl ?? `/api/export/${job.id}/download`}>{kind === "jianying" ? "下载剪映 ZIP" : trackId ? "MP4" : "下载 MP4"}</a>}
    {job?.projectUrl && <a className="btn" href={job.projectUrl}>{trackId ? "JSON" : "导出版本 JSON"}</a>}
    {job?.status === "error" && <span role="alert" className="export-error" title={job.lastLine}>{job.lastLine}</span>}
    <button className={`${trackId ? "mini" : "btn"} ${job?.status === "error" ? "danger" : "primary"}`} disabled={job?.status === "running"} onClick={start} title={job?.lastLine ?? (trackId ? "独立导出该轨道 MP4，保留全片时长与绝对起点；其它轨道不输出" : kind === "jianying" ? "按当前时间线生成镜头分段、原生字幕与独立音效的剪映草稿 ZIP" : t("export.title"))}>
      {trackId ? (job?.status === "running" ? `${Math.round(job.progress * 100)}%` : "⇩") : job?.status === "running" ? t("export.running", {pct: Math.round(job.progress * 100)}) : job?.status === "done" ? (kind === "jianying" ? "再次导出剪映草稿" : t("export.again")) : kind === "jianying" ? "导出剪映草稿" : t("export.film")}
    </button>
  </span>;
};

