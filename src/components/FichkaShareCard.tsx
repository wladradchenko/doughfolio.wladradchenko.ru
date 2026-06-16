import React from 'react';
import {
  Canvas,
  Group,
  RoundedRect,
  Circle,
  Skia,
  Image as SkiaImage,
  useImage,
  Paragraph,
  TextAlign,
  FontWeight,
  LinearGradient,
  RadialGradient,
  SweepGradient,
  Blur,
  vec,
} from '@shopify/react-native-skia';
import { RARITY_COLORS, RARITY_LABELS } from '../utils/rarity';
import type { CollectedFichka } from '../hooks/useCoinDex';

type Props = {
  canvasRef?: any;
  fichka: CollectedFichka;
};

export const FCARD_W = 340;
export const FCARD_H = 430;
const CX = FCARD_W / 2;

// Donut geometry
const DONUT_CY = 198;
const DONUT_R = 80; // outer
const HOLE_R = 46; // inner (where the coin logo sits)

// Fixed (deterministic) sprinkle layout on the glaze ring — angle°, distance, rotation°, color.
const SPRINKLES: { a: number; d: number; rot: number; c: string }[] = [
  { a: 18, d: 63, rot: 35, c: '#FFFFFF' },
  { a: 52, d: 60, rot: -25, c: '#FFE36E' },
  { a: 88, d: 65, rot: 55, c: '#7FE7C4' },
  { a: 122, d: 61, rot: 5, c: '#8FB7FF' },
  { a: 158, d: 64, rot: -45, c: '#FFFFFF' },
  { a: 196, d: 60, rot: 20, c: '#FFE36E' },
  { a: 228, d: 66, rot: -15, c: '#C4A0FF' },
  { a: 262, d: 61, rot: 40, c: '#7FE7C4' },
  { a: 298, d: 64, rot: -35, c: '#FFFFFF' },
  { a: 332, d: 60, rot: 15, c: '#8FB7FF' },
];

const lighten = (hex: string, amt = 0.4): string => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const m = (c: number) => Math.round(c + (255 - c) * amt);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
};

const darken = (hex: string, amt = 0.15): string => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const m = (c: number) => Math.round(c * (1 - amt));
  return `rgb(${m(r)},${m(g)},${m(b)})`;
};

// Appetising "donut glaze" base colors. Each coin gets a stable one derived from its name.
const DONUT_GLAZES = [
  '#FF8FB0', // strawberry pink
  '#8B5E3C', // chocolate
  '#EFD39A', // vanilla
  '#9CCB7A', // matcha
  '#8AA6E0', // blueberry
  '#F2A65A', // caramel
  '#B98AD1', // ube
  '#6FCF97', // mint
  '#F2C14E', // lemon
  '#FF6E76', // raspberry
];

const hashString = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

const glazeForName = (name: string): string => DONUT_GLAZES[hashString(name) % DONUT_GLAZES.length];

export const FichkaShareCard = ({ canvasRef, fichka }: Props) => {
  const logo = useImage(fichka.image || null);

  const color = RARITY_COLORS[fichka.rarity];
  const glaze = glazeForName(fichka.name || fichka.symbol);

  // Text via the Paragraph API with NO font manager → system fonts + automatic
  // CJK/emoji fallback on Android (the simple <Text>+useFont path can't fall back).
  // Returns a centered <Paragraph> element (or null). System fonts → CJK/emoji fallback.
  const line = (text: string, fontSize: number, colorHex: string, y: number, bold = false) => {
    try {
      const builder = Skia.ParagraphBuilder.Make({ textAlign: TextAlign.Center });
      // Don't pass `fontStyle: undefined` — the native side throws on it. Only set it when bold.
      const style: any = { color: Skia.Color(colorHex), fontSize };
      if (bold) style.fontStyle = { weight: FontWeight.Bold };
      builder.pushStyle(style);
      builder.addText(text ?? '');
      const p = builder.build();
      p.layout(FCARD_W);
      return <Paragraph paragraph={p} x={0} y={y} width={FCARD_W} />;
    } catch {
      return null;
    }
  };

  // Clip path for the coin logo inside the donut hole
  const holeClip = Skia.Path.Make();
  holeClip.addCircle(CX, DONUT_CY, HOLE_R - 2);

  return (
    <Canvas ref={canvasRef} style={{ width: FCARD_W, height: FCARD_H }}>
      {/* Rarity gradient frame */}
      <RoundedRect x={0} y={0} width={FCARD_W} height={FCARD_H} r={26}>
        <LinearGradient start={vec(0, 0)} end={vec(FCARD_W, FCARD_H)} colors={[color, lighten(color, 0.55)]} />
      </RoundedRect>
      {/* Card surface */}
      <RoundedRect x={12} y={12} width={FCARD_W - 24} height={FCARD_H - 24} r={20}>
        <LinearGradient start={vec(0, 12)} end={vec(0, FCARD_H)} colors={['#FFFFFF', '#FFF0F4']} />
      </RoundedRect>

      {/* Holographic foil sheen (only on holo cards) */}
      {fichka.holo && (
        <RoundedRect x={12} y={12} width={FCARD_W - 24} height={FCARD_H - 24} r={20} opacity={0.28}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(FCARD_W, FCARD_H)}
            colors={['#ff0080', '#7928ca', '#2afadf', '#ffd200', '#ff5fa2', '#7928ca']}
          />
        </RoundedRect>
      )}

      {line(fichka.symbol.toUpperCase(), 30, color, 36, true)}

      {/* Soft drop shadow under the donut */}
      <Circle cx={CX} cy={DONUT_CY + 10} r={DONUT_R} color="rgba(43,29,39,0.18)">
        <Blur blur={14} />
      </Circle>

      {/* Glaze base (sweep-shaded for a tube look), colored from the coin name */}
      <Circle cx={CX} cy={DONUT_CY} r={DONUT_R}>
        <SweepGradient
          c={vec(CX, DONUT_CY)}
          colors={[lighten(glaze, 0.35), glaze, lighten(glaze, 0.55), glaze, darken(glaze, 0.12), lighten(glaze, 0.35)]}
        />
      </Circle>
      {/* Bottom-right shading → volume (neutral so it works on any glaze) */}
      <Circle cx={CX} cy={DONUT_CY} r={DONUT_R}>
        <RadialGradient
          c={vec(CX + 30, DONUT_CY + 34)}
          r={DONUT_R + 24}
          colors={['rgba(50,25,35,0)', 'rgba(50,25,35,0.26)']}
        />
      </Circle>
      {/* Top-left specular gloss */}
      <Circle cx={CX} cy={DONUT_CY} r={DONUT_R}>
        <RadialGradient
          c={vec(CX - 30, DONUT_CY - 36)}
          r={DONUT_R}
          colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0)']}
        />
      </Circle>

      {/* Sprinkles on the glaze */}
      {SPRINKLES.map((s, i) => {
        const rad = (s.a * Math.PI) / 180;
        const x = CX + s.d * Math.cos(rad);
        const y = DONUT_CY + s.d * Math.sin(rad);
        return (
          <Group key={i} transform={[{ translateX: x }, { translateY: y }, { rotate: (s.rot * Math.PI) / 180 }]}>
            <RoundedRect x={-2} y={-7} width={4} height={14} r={2} color={s.c} />
          </Group>
        );
      })}

      {/* Inner shadow around the hole → depth */}
      <Circle cx={CX} cy={DONUT_CY} r={HOLE_R + 5} style="stroke" strokeWidth={9} color="rgba(43,29,39,0.22)">
        <Blur blur={5} />
      </Circle>

      {/* Hole punched to the surface color */}
      <Circle cx={CX} cy={DONUT_CY} r={HOLE_R} color="#FFF4F7" />

      {/* Coin logo inside the hole (or initial fallback) */}
      {logo ? (
        <Group clip={holeClip}>
          <SkiaImage image={logo} x={CX - HOLE_R} y={DONUT_CY - HOLE_R} width={HOLE_R * 2} height={HOLE_R * 2} fit="cover" />
        </Group>
      ) : (
        line(fichka.symbol.slice(0, 1).toUpperCase(), 36, color, DONUT_CY - 26, true)
      )}

      {/* Labels */}
      {line(fichka.name.slice(0, 26), 15, '#9B7077', 304)}
      {line(`${RARITY_LABELS[fichka.rarity]}${fichka.holo ? ' · HOLO' : ''}`, 16, color, 338, true)}
      {line(`Safety ${fichka.safetyScore}/100`, 15, '#2B1D27', 370)}
      {line('collected with Doughfolio', 15, '#B79AA0', 394)}
    </Canvas>
  );
};
