export type FrameEvent = {id: string; frame: number; localFrame: number};
export type Motion = {
  id: string;
  recipe: string;
  startFrame: number;
  endFrame: number;
  params: Record<string, number>;
};
export type Shot = {
  id: string;
  scene: string;
  actor?: string | null;
  startFrame: number;
  endFrame: number;
  durationFrames: number;
  params: {
    phase: 'overload' | 'choose' | 'focus';
    heading: string;
    labels: [string, string, string];
    startEvent: string;
    completeEvent: string;
  };
  events: FrameEvent[];
  motions: Motion[];
};
export type Cue = {
  id: string;
  role: string;
  text: string;
  startFrame: number;
  endFrame: number;
  x?: number;
  y?: number;
  accent?: boolean;
};
export type Payload = {
  resolved: {
    project: {title: string; fps: number; width: number; height: number};
    durationFrames: number;
    shots: Shot[];
    cues: Cue[];
  };
  style: {
    colors: Record<string, string>;
    fontFamily?: string;
    textRoles?: Record<string, number>;
    safeArea?: {x: number; top: number; bottom: number};
    subtitle?: {background?: string; opacity?: number; height?: number};
  };
  assets: Record<string, string>;
  audio: string | null;
};
export type FilmProps = {payload: Payload | null};
export type FocusDeskProps = FilmProps & {shotIndex: number};
