import React from 'react';
import {
  Canvas,
  Path,
  Skia,
  Text as SkiaText,
  useFont,
  RoundedRect,
  Circle,
} from '@shopify/react-native-skia';
import { safeToFixed } from '../utils/formatNumber';

type Coin = {
  name: string;
  symbol: string;
  percentage: number;
  color: string;
  value: number;
};

type Props = {
  canvasRef: any;
  data: Coin[];
  totalValue: number;
};

// Fixed pixel canvas — rendered offscreen and snapshotted to a PNG for sharing.
export const CARD_W = 340;
export const CARD_H = 420;

const CENTER_X = CARD_W / 2;
const DONUT_CY = 150;
const DONUT_R = 72;
const DONUT_STROKE = 30;

const buildArc = (startDeg: number, sweepDeg: number) => {
  const path = Skia.Path.Make();
  path.addArc(
    { x: CENTER_X - DONUT_R, y: DONUT_CY - DONUT_R, width: DONUT_R * 2, height: DONUT_R * 2 },
    startDeg,
    sweepDeg,
  );
  return path;
};

export const ShareCard = ({ canvasRef, data, totalValue }: Props) => {
  const titleFont = useFont(require('../assets/fonts/Roboto-Bold.ttf'), 30);
  const totalFont = useFont(require('../assets/fonts/Roboto-Bold.ttf'), 26);
  const labelFont = useFont(require('../assets/fonts/Roboto-Light.ttf'), 14);
  const legendFont = useFont(require('../assets/fonts/Roboto-Bold.ttf'), 15);

  // Sort + take top slices; collapse the rest so arcs always sum to ~360.
  const sorted = [...data].sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0));
  const legend = sorted.slice(0, 5);

  let cursor = -90;
  const arcs = sorted.map(coin => {
    const sweep = ((coin.percentage ?? 0) / 100) * 360;
    const start = cursor;
    cursor += sweep;
    return { path: buildArc(start, sweep), color: coin.color || '#FF6E76' };
  });

  const totalText = `$${safeToFixed(totalValue, 0)}`;
  const titleText = 'Doughfolio';
  const footerText = 'found with Doughfolio';

  const centerText = (font: any, text: string, y: number) => {
    if (!font) return null;
    const w = font.measureText(text).width;
    return <SkiaText x={CENTER_X - w / 2} y={y} text={text} font={font} color="#FF6E76" />;
  };

  return (
    <Canvas ref={canvasRef} style={{ width: CARD_W, height: CARD_H }}>
      <RoundedRect x={0} y={0} width={CARD_W} height={CARD_H} r={24} color="#FFD8DF" />
      <RoundedRect x={12} y={12} width={CARD_W - 24} height={CARD_H - 24} r={18} color="#FFF3F6" />

      {centerText(titleFont, titleText, 56)}

      {/* Donut ring */}
      {arcs.map((arc, i) => (
        <Path
          key={i}
          path={arc.path}
          style="stroke"
          strokeWidth={DONUT_STROKE}
          color={arc.color}
          strokeCap="butt"
        />
      ))}

      {/* Center total */}
      {centerText(labelFont, 'Total', DONUT_CY - 8)}
      {centerText(totalFont, totalText, DONUT_CY + 20)}

      {/* Legend */}
      {legend.map((coin, i) => {
        const y = 264 + i * 28;
        return (
          <React.Fragment key={coin.symbol + i}>
            <Circle cx={40} cy={y - 5} r={7} color={coin.color || '#FF6E76'} />
            {legendFont ? (
              <SkiaText
                x={58}
                y={y}
                text={`${(coin.symbol || '').toUpperCase()}  ${safeToFixed(coin.percentage, 1)}%`}
                font={legendFont}
                color="#2B1D27"
              />
            ) : null}
          </React.Fragment>
        );
      })}

      {centerText(labelFont, footerText, CARD_H - 26)}
    </Canvas>
  );
};
