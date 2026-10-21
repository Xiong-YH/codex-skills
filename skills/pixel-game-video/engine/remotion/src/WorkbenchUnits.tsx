import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {BookSweep, cameraAt, DeskWorld} from './FocusDesk';
import {CueText} from './TextOverlay';
import {WORKBENCH_PAYLOAD} from './workbench-payload';
import {shotSourceFrame, transitionProgress} from './workbench-time';
import type {Payload, Shot} from './types';

const W = 1920;
const H = 1080;
const payload = (): Payload => {
  if (!WORKBENCH_PAYLOAD) throw new Error('Workbench units require a generated build/remotion project.');
  return WORKBENCH_PAYLOAD;
};

type HeadingProps = {heading?: string; titleFontSize?: number; titleColor?: string; titleX?: number; titleY?: number; hideHeading?: boolean};
type DeskProps = HeadingProps & {shotIndex?: number; label1?: string; label2?: string; label3?: string};
const shotWithLabels = (shot: Shot, props: DeskProps): Shot => ({...shot, params: {...shot.params,
  labels: [props.label1 ?? shot.params.labels[0], props.label2 ?? shot.params.labels[1], props.label3 ?? shot.params.labels[2]],
}});

const Heading: React.FC<HeadingProps & {shot: Shot}> = ({shot, heading, titleFontSize, titleColor, titleX, titleY, hideHeading}) => {
  if (hideHeading) return null;
  const data = payload();
  return <CueText payload={data} fontSize={titleFontSize} color={titleColor ?? data.style.colors.gold ?? '#eac47c'} cue={{
    id: `${shot.id}.heading`, role: 'title', text: heading ?? shot.params.heading,
    startFrame: 0, endFrame: 1, x: titleX, y: titleY,
  }}/>;
};

/** TimeRemap supplies the source-local frame. Preserve it exactly through trims,
 * splits and speed changes; extending a clip holds its final source frame. */
export const DeskShotUnit: React.FC<DeskProps> = (props) => {
  const local = useCurrentFrame();
  const data = payload();
  const original = data.resolved.shots[props.shotIndex ?? 0];
  const shot = shotWithLabels(original, props);
  const sourceFrame = shotSourceFrame(local, shot.durationFrames, shot.startFrame);
  return <AbsoluteFill style={{background: '#111820', overflow: 'hidden', fontFamily: data.style.fontFamily}}>
    <DeskWorld payload={data} shot={shot} frame={sourceFrame}/>
    <Heading {...props} shot={shot}/>
  </AbsoluteFill>;
};

type CaptionProps = {cueIndex?: number; text?: string; fontSize?: number; color?: string; x?: number; y?: number};
/** Visibility is owned only by the surrounding clip Sequence. It intentionally
 * never filters by the source cue's startFrame/endFrame after import. */
export const CaptionUnit: React.FC<CaptionProps> = ({cueIndex = 0, text, fontSize, color, x, y}) => {
  const data = payload();
  const source = data.resolved.cues[cueIndex];
  return <AbsoluteFill style={{fontFamily: data.style.fontFamily ?? 'sans-serif', pointerEvents: 'none'}}>
    <CueText payload={data} cue={{...source, text: text ?? source.text, x: x ?? source.x, y: y ?? source.y}} fontSize={fontSize} color={color}/>
  </AbsoluteFill>;
};

type ClipTransform = {x?: number; y?: number; scale?: number; opacity?: number};
type SweepProps = DeskProps & {motionIndex?: number; x?: number; y?: number; outgoingShotId?: string;
  outgoingProps?: DeskProps; incomingProps?: DeskProps; outgoingSourceFrame?: number; incomingSourceFrame?: number;
  outgoingTransform?: ClipTransform; incomingTransform?: ClipTransform};
/** The outgoing world belongs to the transition: it freezes until the opaque
 * book reaches its midpoint. The incoming shot is revealed only after that
 * cover, even when this transition clip is moved or resized independently. */
export const BookSweepUnit: React.FC<SweepProps> = ({shotIndex = 1, motionIndex = 0, x, y, outgoingShotId, outgoingProps,
  incomingProps: _incomingProps, outgoingSourceFrame, incomingSourceFrame: _incomingSourceFrame,
  outgoingTransform, incomingTransform: _incomingTransform, ...heading}) => {
  const local = useCurrentFrame();
  const data = payload();
  const shot = data.resolved.shots[shotIndex];
  const prior = outgoingShotId ? data.resolved.shots.find((item) => item.id === outgoingShotId) : data.resolved.shots[shotIndex - 1];
  if (!prior) throw new Error('Missing outgoing book-sweep shot.');
  const previousProps = outgoingProps ?? heading;
  const previous = shotWithLabels(prior, previousProps);
  const motion = shot.motions[motionIndex];
  const progress = transitionProgress(local, motion.endFrame - motion.startFrame);
  const previousFrame = outgoingSourceFrame === undefined ? previous.endFrame - 1 : shotSourceFrame(outgoingSourceFrame, previous.durationFrames, previous.startFrame);
  const camera = cameraAt(previous, previousFrame);
  return <AbsoluteFill style={{fontFamily: data.style.fontFamily, pointerEvents: 'none'}}>
    {progress < 0.5 ? <AbsoluteFill style={{background: '#111820', overflow: 'hidden',
      transform: `translate(${outgoingTransform?.x ?? 0}px, ${outgoingTransform?.y ?? 0}px) scale(${outgoingTransform?.scale ?? 1})`, opacity: outgoingTransform?.opacity ?? 1}}>
      <DeskWorld payload={data} shot={previous} frame={previousFrame}/>
      <Heading {...previousProps} shot={previous}/>
    </AbsoluteFill> : null}
    <BookSweep progress={progress} x={(x ?? motion.params.x ?? 0.36) * camera.scale + camera.x / W} y={(y ?? motion.params.y ?? 0.67) * camera.scale + camera.y / H}/>
  </AbsoluteFill>;
};
