import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, cancelRender, Composition, continueRender, delayRender, Folder, Sequence, staticFile, useVideoConfig, type CalculateMetadataFunction} from 'remotion';
import {FocusDesk} from './FocusDesk';
import type {FilmProps, FocusDeskProps, Payload} from './types';

const readPayload = async (signal: AbortSignal): Promise<Payload> => {
  const response = await fetch(staticFile('payload.json'), {signal});
  if (!response.ok) throw new Error(`Cannot load compiled payload: ${response.status}`);
  return response.json();
};

const filmMetadata: CalculateMetadataFunction<FilmProps> = async ({props, abortSignal}) => {
  const payload = props.payload ?? await readPayload(abortSignal);
  const {project, durationFrames} = payload.resolved;
  return {width: project.width, height: project.height, fps: project.fps, durationInFrames: durationFrames, props: {payload}};
};

const sceneMetadata: CalculateMetadataFunction<FocusDeskProps> = async ({props, abortSignal}) => {
  const payload = props.payload ?? await readPayload(abortSignal);
  const {project, shots} = payload.resolved;
  const shot = shots[props.shotIndex];
  if (!shot) throw new Error(`Missing shot ${props.shotIndex}`);
  return {width: project.width, height: project.height, fps: project.fps, durationInFrames: shot.endFrame - shot.startFrame, props: {...props, payload}};
};

export const PixelFilm: React.FC<FilmProps> = ({payload}) => {
  const {fps} = useVideoConfig();
  if (!payload) return null;
  return <AbsoluteFill style={{background: '#111820'}}>
    {/* This list intentionally follows the external, compiled VideoSpec timeline. */}
    {payload.resolved.shots.map((shot, index) => <Sequence key={shot.id} name={shot.id} from={shot.startFrame} durationInFrames={shot.endFrame - shot.startFrame} premountFor={fps}>
      <FocusDesk payload={payload} shotIndex={index}/>
    </Sequence>)}
    {payload.audio ? <Audio src={staticFile(payload.audio)}/> : null}
  </AbsoluteFill>;
};

export const RemotionRoot: React.FC = () => {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [handle] = useState(() => delayRender('Loading the compiled VideoSpec'));
  useEffect(() => {
    const controller = new AbortController();
    readPayload(controller.signal).then((value) => {
      setPayload(value);
      continueRender(handle);
    }).catch((error: Error) => {
      if (!controller.signal.aborted) cancelRender(error);
    });
    return () => controller.abort();
  }, [handle]);
  if (!payload) return null;
  const {project, durationFrames, shots} = payload.resolved;
  return <>
    <Composition id="PixelFilm" component={PixelFilm} width={project.width} height={project.height} fps={project.fps} durationInFrames={durationFrames} defaultProps={{payload}} calculateMetadata={filmMetadata}/>
    <Folder name="Scenes">
      <Composition id="FocusDesk" component={FocusDesk} width={project.width} height={project.height} fps={project.fps} durationInFrames={shots[0].durationFrames} defaultProps={{payload, shotIndex: 0}} calculateMetadata={sceneMetadata}/>
    </Folder>
  </>;
};
