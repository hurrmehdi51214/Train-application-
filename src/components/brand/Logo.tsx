import React, { useId } from 'react';
import { View, ViewStyle } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Mask, Path, Polygon, Rect } from 'react-native-svg';

import { Text } from '@/components/primitives/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { green, neutral } from '@/theme/tokens';

/**
 * The Safar mark.
 *
 * A train seen head-on: an arched nose, a windscreen, two lamps, and the rails
 * running away beneath it. Inside the windscreen sit the crescent and star of
 * the flag - as though the country itself were looking out of the front of the
 * train. One idea, legible at 20px, and not a stock train glyph on a gradient.
 *
 * Every coordinate below is in the same 48-unit grid as
 * `scripts/generate-assets.mjs`, so the app icon and this component are the
 * same drawing and cannot drift apart.
 */

export interface LogoProps {
  size?: number;
  /** `plate` draws the mark on its rounded green tile, as on the app icon. */
  variant?: 'plate' | 'bare';
  /** Colour of the train body. Defaults to white on a plate, brand when bare. */
  tint?: string;
  style?: ViewStyle;
}

export function LogoMark({ size = 32, variant = 'plate', tint, style }: LogoProps) {
  const { palette } = useTheme();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');

  const onPlate = variant === 'plate';
  const body = tint ?? (onPlate ? neutral[0] : palette.brand);
  const glass = onPlate ? green[800] : palette.brandDeep;

  return (
    <View style={style} accessibilityRole="image" accessibilityLabel="Safar">
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Defs>
          {/* Crescent: a disc with a second disc taken out of it. A mask keeps
              the two in register at every size; a hand-drawn arc does not. */}
          <Mask id={`crescent${id}`}>
            <Circle cx={22.9} cy={19.3} r={3.55} fill="#fff" />
            <Circle cx={24.75} cy={19.3} r={3.5} fill="#000" />
          </Mask>
          <ClipPath id={`glass${id}`}>
            <Rect x={17.4} y={14.6} width={13.2} height={9.4} rx={3.4} />
          </ClipPath>
        </Defs>

        {onPlate ? <Rect x={0} y={0} width={48} height={48} rx={13} fill={green[600]} /> : null}

        {/* Nose: a dome over a rounded box. */}
        <G>
          <Circle cx={24} cy={18.4} r={10.4} fill={body} />
          <Rect x={13.6} y={18.4} width={20.8} height={19.6} rx={3.8} fill={body} />
        </G>

        {/* Windscreen. */}
        <Rect x={17.4} y={14.6} width={13.2} height={9.4} rx={3.4} fill={glass} />

        {/* The flag, inside the glass. */}
        <G clipPath={`url(#glass${id})`}>
          <Rect x={17.4} y={14.6} width={13.2} height={9.4} fill={body} mask={`url(#crescent${id})`} />
          <Polygon
            points="27.6,17.1 28.36,18.71 30.1,18.95 28.82,20.18 29.14,21.92 27.6,21.08 26.06,21.92 26.38,20.18 25.1,18.95 26.84,18.71"
            fill={body}
          />
        </G>

        {/* Lamps. */}
        <Circle cx={19.6} cy={29.8} r={2.1} fill={glass} />
        <Circle cx={28.4} cy={29.8} r={2.1} fill={glass} />

        {/* Rails, receding. The only motion in the mark. */}
        <Path
          d="M15.9 41.8 18.7 37.8M32.1 41.8 29.3 37.8"
          stroke={body}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

/** Mark plus wordmark, for headers and the splash. */
export function Logo({
  size = 30,
  variant = 'bare',
  showWordmark = true,
  tint,
  style,
}: LogoProps & { showWordmark?: boolean }) {
  const { space } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space.sm }, style]}>
      <LogoMark size={size} variant={variant} tint={tint} />
      {showWordmark ? (
        <Text
          variant="title"
          tone={tint ? undefined : 'brand'}
          style={tint ? { color: tint, letterSpacing: -0.8 } : { letterSpacing: -0.8 }}
        >
          Safar
        </Text>
      ) : null}
    </View>
  );
}
