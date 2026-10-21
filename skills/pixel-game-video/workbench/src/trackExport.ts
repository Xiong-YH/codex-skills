import type {ProjectData} from './types';
import {projectEndFrame} from './types';

/** A solo export retains hidden references for linked transitions, but renders/plays only one lane.
 * Keeping absolute start frames and the original end makes individually exported tracks align. */
export const projectForTrackExport = (project: ProjectData, trackId: string): ProjectData => {
  const selected = project.tracks.find(track => track.id === trackId);
  if (!selected?.clips.length) throw new Error('该轨道没有可导出的片段');
  return {
    ...project,
    name: `${project.name} · ${selected.name}`,
    exportDurationInFrames: Math.max(1, projectEndFrame(project), ...selected.clips.map(clip => clip.start + clip.duration)),
    tracks: project.tracks.map(track => ({...track, hidden: track.id !== trackId})),
  };
};
