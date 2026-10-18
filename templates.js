export const TEMPLATES = {
'Judul pegas': `import {AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate} from 'remotion';

export const config = {width: 1280, height: 720, fps: 30, durationInFrames: 120};

export default function Judul() {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 12}});
  const keluar = interpolate(frame, [90, 120], [1, 0], {extrapolateLeft: 'clamp'});
  return (
    <AbsoluteFill style={{background: '#2f45d1', alignItems: 'center', justifyContent: 'center'}}>
      <h1 style={{color: 'white', fontSize: 120, fontFamily: 'sans-serif',
        transform: 'scale(' + s + ')', opacity: keluar}}>Halo Remotion</h1>
    </AbsoluteFill>
  );
}
`,
'Grafik batang': `import {AbsoluteFill, useCurrentFrame, interpolate, Easing} from 'remotion';

export const config = {width: 1280, height: 720, fps: 30, durationInFrames: 150};
const data = [40, 75, 55, 90, 65];

export default function Grafik() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#f4f1ff', flexDirection: 'row', alignItems: 'flex-end',
      justifyContent: 'center', gap: 32, padding: 80}}>
      {data.map((v, i) => {
        const h = interpolate(frame, [i * 8, i * 8 + 40], [0, v * 5],
          {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
        return <div key={i} style={{width: 120, height: h, background: 'hsl(' + (230 + i * 20) + ' 70% 50%)', borderRadius: 8}} />;
      })}
    </AbsoluteFill>
  );
}
`,
'Transisi & bentuk': `import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {slide} from '@remotion/transitions/slide';
import {fade} from '@remotion/transitions/fade';
import {Star, Circle} from '@remotion/shapes';

export const config = {width: 1280, height: 720, fps: 30, durationInFrames: 150};

const Scene = ({bg, children}) => (
  <AbsoluteFill style={{background: bg, alignItems: 'center', justifyContent: 'center'}}>{children}</AbsoluteFill>
);
const Bintang = () => { const f = useCurrentFrame();
  return <div style={{transform: 'rotate(' + f * 3 + 'deg)'}}><Star points={5} innerRadius={80} outerRadius={180} fill="#ffd23f" /></div>; };

export default function Demo() {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={70}><Scene bg="#182033"><Bintang /></Scene></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide()} timing={linearTiming({durationInFrames: 20})} />
      <TransitionSeries.Sequence durationInFrames={70}><Scene bg="#2f45d1"><Circle radius={140} fill="white" /></Scene></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 20})} />
      <TransitionSeries.Sequence durationInFrames={40}><Scene bg="#e8ebf0"><Bintang /></Scene></TransitionSeries.Sequence>
    </TransitionSeries>
  );
}
`};
