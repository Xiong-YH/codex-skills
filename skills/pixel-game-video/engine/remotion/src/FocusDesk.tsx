import React, {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, cancelRender, continueRender, delayRender, Img, useCurrentFrame} from 'remotion';
import type {FocusDeskProps, Payload, Shot} from './types';
import {SceneHeading, TextOverlay} from './TextOverlay';

const W = 1920;
const H = 1080;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const mix = (a: number, b: number, progress: number) => a + (b - a) * progress;
const smooth = (value: number) => {const p = clamp(value); return p * p * p * (10 + p * (-15 + 6 * p));};

export const eventProgress = (shot: Shot, frame: number): number => {
  const start = shot.events.find((event) => event.id === shot.params.startEvent);
  const complete = shot.events.find((event) => event.id === shot.params.completeEvent);
  if (!start || !complete || start.frame >= complete.frame) throw new Error(`Invalid focus-desk action events: ${shot.id}`);
  return clamp((frame - start.frame) / (complete.frame - start.frame));
};

export const cameraAt = (shot: Shot, frame: number) => {
  let camera = {scale: 1, x: 0.5, y: 0.5};
  for (const motion of [...shot.motions].sort((a, b) => a.startFrame - b.startFrame)) {
    if (motion.recipe !== 'motion.camera-track.v1' || frame < motion.startFrame) continue;
    const p = smooth((frame - motion.startFrame) / (motion.endFrame - motion.startFrame));
    const a = motion.params;
    camera = {scale: mix(a.scaleFrom ?? 1, a.scaleTo ?? 1.2, p), x: mix(a.xFrom ?? 0.5, a.xTo ?? 0.5, p), y: mix(a.yFrom ?? 0.5, a.yTo ?? 0.5, p)};
  }
  const x = Math.max(W * (1 - camera.scale), Math.min(0, W / 2 - camera.x * W * camera.scale));
  const y = Math.max(H * (1 - camera.scale), Math.min(0, H / 2 - camera.y * H * camera.scale));
  return {scale: camera.scale, x, y};
};

type PaperProps = {x: number; y: number; width: number; height: number; angle: number; label: string; color: string; selected?: number; writing?: number; scale?: number};
const PaperLabel: React.FC<{label: string; width: number}> = ({label, width}) => {
  const text = useRef<SVGTextElement>(null);
  const [handle] = useState(() => delayRender(`Checking paper label: ${label}`));
  useLayoutEffect(() => {
    let live = true;
    document.fonts.ready.then(() => {
      if (!live || !text.current) return;
      if (text.current.getComputedTextLength() > width - 40) {
        cancelRender(new Error(`Task label '${label}' exceeds the paper width; shorten labels.`));
        return;
      }
      continueRender(handle);
    }).catch((error: Error) => {if (live) cancelRender(error);});
    return () => {live = false; continueRender(handle);};
  }, [label, width, handle]);
  if (/[\r\n]/.test(label)) throw new Error('Task labels must stay on one line; shorten labels.');
  return <text ref={text} x="20" y="66" fill="#2e3a3b" fontSize="32" fontWeight="700">{label}</text>;
};
const Paper: React.FC<PaperProps> = ({x, y, width, height, angle, label, color, selected, writing = 0, scale = 1}) => <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
  <path d={`M8 10H${width + 10}V${height + 12}H8Z`} fill="#071018" opacity=".4"/>
  <path d={`M0 0H${width - 22}L${width} 22V${height}H0Z`} fill={color}/>
  <path d={`M${width - 22} 0V22H${width}`} fill="#b2a486"/>
  <path d={`M0 ${height - 7}H${width}V${height}H0Z`} fill="#b8a888"/>
  <rect x="20" y="18" width={mix(32, 54, selected ?? 0)} height="8" fill="#82928a"/>
  <rect x="20" y="18" width={mix(32, 54, selected ?? 0)} height="8" fill="#b78b3e" opacity={selected ?? 0}/>
  <PaperLabel label={label} width={width}/>
  {[0, 1, 2].map((index) => <rect key={index} x="20" y={86 + index * 18} width={(width - 60) * (index === 2 ? 0.65 : 1)} height="4" fill="#bcb49d"/>)}
  {writing > 0 ? <>
    <path d={`M${width * 0.59} 75h${width * 0.3 * writing}m-${width * 0.3 * writing} 24h${width * 0.24 * writing}m-${width * 0.24 * writing} 24h${width * 0.28 * writing}`} stroke="#5b7a76" strokeWidth="6" fill="none"/>
    <rect x={width * 0.59 + width * 0.28 * writing} y="128" width="6" height="23" fill="#a47139" transform={`rotate(30 ${width * 0.59 + width * 0.28 * writing} 128)`}/>
  </> : null}
</g>;

const RoomGeometry: React.FC<{shot: Shot; frame: number; font: string}> = ({shot, frame, font}) => {
  const {phase, labels} = shot.params;
  const p = smooth(eventProgress(shot, frame));
  const lit = phase === 'focus' ? p : 0;
  const selected = phase === 'focus' ? 1 : phase === 'choose' ? p : 0;
  const selectedX = phase === 'overload' ? mix(1430, 760, p) : phase === 'choose' ? mix(760, 905, p) : mix(905, 790, p);
  const selectedY = phase === 'overload' ? mix(594, 558, p) : phase === 'choose' ? mix(558, 551, p) : mix(551, 522, p);
  const selectedAngle = phase === 'overload' ? mix(0, -7, p) : phase === 'choose' ? mix(-7, 0, p) : 0;
  const parked = phase === 'choose' ? p : phase === 'focus' ? 1 : 0;
  const paperWidth = phase === 'focus' ? mix(270, 560, p) : 270;
  const paperHeight = phase === 'focus' ? mix(150, 196, p) : 150;
  return <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, fontFamily: font}} shapeRendering="crispEdges">
    <defs>
      <linearGradient id="room-wall" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#1b2c38"/><stop offset="1" stopColor="#10202d"/></linearGradient>
      <linearGradient id="room-floor" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#25333b"/><stop offset="1" stopColor="#14212b"/></linearGradient>
      <linearGradient id="lamp-pool"><stop stopColor="#e9c47b" stopOpacity=".03"/><stop offset=".5" stopColor="#e9c47b" stopOpacity=".24"/><stop offset="1" stopColor="#e9c47b" stopOpacity=".04"/></linearGradient>
    </defs>
    <rect width={W} height={H} fill="url(#room-wall)"/>
    <path d="M0 756H1920V1080H0Z" fill="url(#room-floor)"/>
    <path d="M0 750H1920V764H0Z" fill="#081722"/>
    <path d="M0 744H1920V750H0Z" fill="#405057"/>
    {[120, 310, 500, 690, 880, 1070, 1260, 1450, 1640, 1830].map((x) => <path key={x} d={`M${x} 764L${960 + (x - 960) * 2.15} 1080`} stroke="#37424a" strokeWidth="3"/>)}
    <path d="M0 856H1920M0 1018H1920" stroke="#3a444a" strokeWidth="4"/>
    <path d="M0 164H1920M520 164V746M1238 164V746" stroke="#34434b" strokeWidth="4" opacity=".45"/>
    <rect x="1338" y="232" width="418" height="318" fill="#081724"/>
    <rect x="1352" y="244" width="390" height="286" fill="#173347"/>
    <rect x="1356" y="248" width="382" height="6" fill="#4a6978"/>
    <path d="M1638 285h28v7h13v28h-7v9h-34v-9h-9v-28h9Z" fill="#ddd7b2"/>
    {Array.from({length: 8}, (_, index) => <g key={index}>
      <rect x={1360 + index * 47} y={385 + (index % 3) * 26} width="40" height={145 - (index % 3) * 26} fill={index % 2 ? '#102a3a' : '#102331'}/>
      {[0, 1, 2].map((row) => <rect key={row} x={1369 + index * 47} y={407 + row * 34 + (index % 3) * 26} width="7" height="11" fill={row === index % 3 ? '#d5bc78' : '#456372'} opacity=".7"/>)}
    </g>)}
    <path d="M1540 240h10v292h-10ZM1340 528h416v22h-416Z" fill="#647075"/>
    <path d="M1322 546h458v18h-458Z" fill="#3f5059"/>
    <path d="M1322 563h458v7h-458Z" fill="#0b1c28"/>
    <rect x="135" y="321" width="328" height="16" fill="#081520" opacity=".7"/>
    <rect x="120" y="304" width="348" height="17" fill="#756750"/>
    <rect x="120" y="300" width="348" height="5" fill="#b29b71"/>
    {[{x: 146, w: 29, h: 95, c: '#8b7050'}, {x: 183, w: 38, h: 112, c: '#446d73'}, {x: 228, w: 25, h: 92, c: '#88635a'}, {x: 262, w: 44, h: 121, c: '#5c7881'}, {x: 314, w: 35, h: 100, c: '#aa905a'}].map((book) => <g key={book.x}>
      <rect x={book.x} y={300 - book.h} width={book.w} height={book.h} fill={book.c}/>
      <rect x={book.x + 5} y={312 - book.h} width="4" height={book.h - 24} fill="#d6c397" opacity=".35"/>
      <rect x={book.x + 4} y="282" width={book.w - 8} height="4" fill="#d6c397"/>
    </g>)}
    <path d="M391 274h41v26h-41ZM385 267h53v9h-53Z" fill="#7c7560"/>
    <path d="M412 267v-49m0 21-17-13m17 26 18-14" stroke="#66867c" strokeWidth="7"/>
    <path d="M450 775h1234v26H450Z" fill="#08151f" opacity=".45"/>
    <path d="M587 622H1526L1680 751H450Z" fill="#9e845c"/>
    <path d="M587 622H1526L1538 633H574Z" fill="#d0ae78"/>
    <path d="M450 751h1230v37H450Z" fill="#66523f"/>
    <path d="M450 751h1230v8H450Z" fill="#b79b6d"/>
    <path d="M486 788h55v184h-55ZM1562 788h56v184h-56Z" fill="#3e3b35"/>
    <path d="M486 788h11v184h-11ZM1562 788h11v184h-11Z" fill="#77705c"/>
    <path d="M539 895h1023v20H539Z" fill="#3d3b35"/>
    <path d="M544 912h1018v8H544Z" fill="#0a1923" opacity=".5"/>
    <path d="M600 700h990M630 645h850" stroke="#6f624d" strokeWidth="3" opacity=".5"/>
    <path d="M1135 680h154v16h-154Z" fill="#172b32" opacity=".5"/>
    <path d="M1166 653h93v20h-93Z" fill="#466569"/>
    <path d="M1175 654h76v5h-76Z" fill="#a4b5a0"/>
    <path d="M1212 653v-150h12v150Z" fill="#3c575e"/>
    <path d="M1212 502l57-59 9 9-54 57Z" fill="#6d8985"/>
    <path d="M1248 428h74l28 55h-134Z" fill="#698b80"/>
    <path d="M1216 483h134v10h-134Z" fill="#b3b48c"/>
    <path d="M1223 493H1341L1455 738H978Z" fill="#edce89" opacity={0.025 + lit * 0.12}/>
    <path d="M1085 690H1388L1460 735H1007Z" fill="url(#lamp-pool)" opacity={0.45 + lit * 0.55}/>
    <path d="M1406 686h184v15h-184Z" fill="#26363a" opacity=".5"/>
    <path d="M1389 652h174l39 35h-195Z" fill="#79684d"/>
    <path d="M1407 664h159l24 19h-170Z" fill="#332f2c"/>
    <path d="M1407 683h195v25h-195Z" fill="#9a825b"/>
    <path d="M1407 683h195v5h-195Z" fill="#c1a174"/>
    {[2, 1].map((index) => {
      const scatter = index === 1 ? {x: 1030, y: 577, a: 7} : {x: 1220, y: 548, a: -9};
      const x = phase === 'overload' ? mix(1435, scatter.x, p) : mix(scatter.x, 1420 + index * 5, parked);
      const y = phase === 'overload' ? mix(600 - index * 8, scatter.y, p) : mix(scatter.y, 615 - index * 8, parked);
      const angle = phase === 'overload' ? mix(0, scatter.a, p) : mix(scatter.a, -1 + index, parked);
      const scale = phase === 'overload' ? mix(0.62, 1, p) : mix(1, 0.62, parked);
      return <Paper key={index} x={x} y={y} angle={angle} scale={scale} width={270} height={150} label={labels[index]} color={index === 1 ? '#c9d1c0' : '#cad2cf'}/>;
    })}
    <Paper x={selectedX} y={selectedY} width={paperWidth} height={paperHeight} angle={selectedAngle} label={labels[0]} color="#efe0b9" selected={selected} writing={lit}/>
    {phase === 'focus' ? <path d={`M${mix(1040, 1070, p)} 541v${mix(130, 162, p)}`} stroke="#c3b595" strokeWidth="3" opacity={p}/> : null}
    <path d="M605 735h183v14H605Z" fill="#101c23" opacity=".5"/>
    <path d="M598 694h178l18 38H613Z" fill="#233f4b"/>
    <path d="M603 700h169l14 25H618Z" fill="#d8c79e"/>
    <path d="M618 708h160M621 716h162" stroke="#9f9277" strokeWidth="2"/>
    <path d="M598 685h174l5 15H603Z" fill="#5a817c"/>
    <path d="M598 685h174v5H598Z" fill="#9bb29b"/>
    <path d="M610 690h10v10h-10Z" fill="#d8b778"/>
    <path d="M834 717h75v12H834Z" fill="#1a292b" opacity=".45"/>
    <path d="M839 648h50v66h-50ZM889 660h22v36h-22Z" fill="#8da89e"/>
    <path d="M889 667h13v21h-13Z" fill="#253a3e"/>
    <path d="M844 653h39v10h-39Z" fill="#4d594c"/>
    <path d="M843 665h7v40h-7Z" fill="#bfd0b8"/>
    <path d="M0 1040H1920V1080H0Z" fill="#08131e" opacity=".3"/>
  </svg>;
};

export const DeskWorld: React.FC<{payload: Payload; shot: Shot; frame: number}> = ({payload, shot, frame}) => {
  const camera = cameraAt(shot, frame);
  const source = shot.actor ? payload.assets[`${shot.actor}:reference`] ?? payload.assets[shot.actor] : null;
  if (shot.actor && !source) throw new Error(`Missing approved actor reference: ${shot.actor}`);
  return <AbsoluteFill style={{overflow: 'hidden'}}>
    <AbsoluteFill style={{transform: `translate(${camera.x / W * 100}%, ${camera.y / H * 100}%) scale(${camera.scale})`, transformOrigin: '0 0'}}>
      <RoomGeometry shot={shot} frame={frame} font={payload.style.fontFamily ?? 'sans-serif'}/>
      {source ? <>
        <svg viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', width: '100%', height: '100%'}} shapeRendering="crispEdges"><path d="M192 835h230v12H192Zm25-10h182v10H217Z" fill="#030e18" opacity=".55"/></svg>
        <Img src={source} style={{position: 'absolute', left: '9.5%', top: '32.2%', width: '15.8%', height: '45.5%', objectFit: 'contain', objectPosition: 'center bottom', imageRendering: 'pixelated'}}/>
      </> : null}
    </AbsoluteFill>
  </AbsoluteFill>;
};

/** Source changes only while an opaque physical spread covers the complete frame. */
const BookSweep: React.FC<{progress: number; x: number; y: number}> = ({progress, x, y}) => {
  if (progress <= 0 || progress >= 1) return null;
  const opening = progress < 0.5;
  const p = smooth(opening ? progress / 0.46 : (progress - 0.56) / 0.44);
  const cx = opening ? mix(x * W, W / 2, p) : W / 2 - W * 2.2 * p;
  const cy = opening ? mix(y * H, H / 2, p) : H / 2 - H * 0.15 * p;
  const width = opening ? mix(180, W * 1.7, p) : W * 1.7;
  const height = opening ? mix(80, H * 2, p) : H * 2;
  const rotation = opening ? -5 * Math.sin(p * Math.PI) : -8 * p;
  return <svg viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', width: '100%', height: '100%', inset: 0}} shapeRendering="crispEdges">
    <g transform={`translate(${cx} ${cy}) rotate(${rotation})`}>
      {[3, 2, 1].map((index) => <rect key={index} x={-width / 2 - index * 6} y={-height / 2 + index * 9} width={width + index * 12} height={height} fill={['', '#baaa87', '#7f795d', '#254650'][index]}/>)}
      <rect x={-width / 2} y={-height / 2} width={width} height={height} fill="#eddfb9"/>
      <rect x={-width * 0.015} y={-height / 2} width={width * 0.03} height={height} fill="#c6b891"/>
      <rect x={width * 0.02} y={-height / 2} width={width * 0.007} height={height} fill="#fff0cb"/>
      {[0, 1, 2, 3, 4, 5].map((index) => <React.Fragment key={index}>
        <rect x={-width * 0.43} y={-height * 0.3 + index * height * 0.105} width={width * (index % 3 === 0 ? 0.28 : 0.34)} height={height * 0.013} fill="#657a70" opacity=".6"/>
        <rect x={width * 0.1} y={-height * 0.3 + index * height * 0.105} width={width * (index % 2 === 0 ? 0.3 : 0.24)} height={height * 0.013} fill="#657a70" opacity=".6"/>
      </React.Fragment>)}
    </g>
  </svg>;
};

export const FocusDesk: React.FC<FocusDeskProps> = ({payload, shotIndex}) => {
  const localFrame = useCurrentFrame();
  if (!payload) return null;
  const shot = payload.resolved.shots[shotIndex];
  const frame = shot.startFrame + localFrame;
  const transition = shot.motions.find((motion) => motion.recipe === 'motion.book-sweep.v1' && frame >= motion.startFrame && frame < motion.endFrame);
  const previous = payload.resolved.shots[shotIndex - 1];
  const progress = transition ? clamp((frame - transition.startFrame) / (transition.endFrame - transition.startFrame)) : 1;
  const outgoing = Boolean(transition && previous && progress < 0.5);
  const previousCamera = previous ? cameraAt(previous, previous.endFrame - 1) : {scale: 1, x: 0, y: 0};
  return <AbsoluteFill style={{background: '#111820', overflow: 'hidden', fontFamily: payload.style.fontFamily}}>
    <DeskWorld payload={payload} shot={outgoing ? previous : shot} frame={outgoing ? previous.endFrame - 1 : frame}/>
    <SceneHeading payload={payload} shot={outgoing ? previous : shot} frame={outgoing ? previous.endFrame - 1 : frame}/>
    {transition ? <BookSweep progress={progress} x={(transition.params.x ?? 0.36) * previousCamera.scale + previousCamera.x / W} y={(transition.params.y ?? 0.67) * previousCamera.scale + previousCamera.y / H}/> : null}
    <TextOverlay payload={payload} frame={frame}/>
  </AbsoluteFill>;
};
