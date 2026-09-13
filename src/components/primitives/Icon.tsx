import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * The icon set.
 *
 * Drawn rather than imported. An icon font ships thousands of glyphs to use
 * sixty, and an off-the-shelf set is the fastest way for a product to look like
 * every other product.
 *
 * House style, borrowed from Airbnb's own: a 24-unit grid, a 1.8 stroke, round
 * caps and joins, and shapes that are geometric without being cold. A handful
 * of glyphs have `filled` variants, used only where a control has a genuine
 * on/off state - the wishlist heart, the active tab, a star in a rating.
 */

export type IconName =
  // navigation and chrome
  | 'search'
  | 'heart'
  | 'compass'
  | 'message'
  | 'user'
  | 'ticket'
  | 'train'
  | 'star'
  | 'close'
  | 'check'
  | 'plus'
  | 'minus'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'chevron-up'
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-up-right'
  | 'filter'
  | 'sort'
  | 'share'
  | 'map'
  | 'list'
  | 'globe'
  | 'settings'
  | 'info'
  | 'alert'
  | 'lock'
  | 'qr'
  | 'download'
  | 'calendar'
  | 'clock'
  | 'pin'
  | 'moon'
  | 'sun'
  | 'flame'
  | 'verified'
  | 'sliders'
  | 'swap'
  | 'bell'
  | 'help'
  // amenities and facilities
  | 'snow'
  | 'bed'
  | 'meal'
  | 'tea'
  | 'restaurant'
  | 'plug'
  | 'usb'
  | 'lamp'
  | 'wifi'
  | 'prayer'
  | 'washroom'
  | 'luggage'
  | 'accessible'
  | 'shield'
  | 'seat'
  | 'curtain'
  | 'screen'
  | 'car'
  | 'card'
  // last mile
  | 'bus'
  | 'metro'
  | 'rickshaw'
  | 'taxi'
  | 'walk';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  /** Solid version, for on-states only. */
  filled?: boolean;
  strokeWidth?: number;
}

export function Icon({ name, size = 24, color, filled = false, strokeWidth = 1.8 }: IconProps) {
  const { palette } = useTheme();
  const stroke = color ?? palette.textPrimary;

  const s = {
    stroke,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {glyph(name, s, stroke, filled)}
    </Svg>
  );
}

type Stroke = {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: 'round';
  strokeLinejoin: 'round';
  fill: 'none';
};

function glyph(name: IconName, s: Stroke, c: string, filled: boolean) {
  switch (name) {
    /* ------------------------------------------------ navigation and chrome */
    case 'search':
      return (
        <G>
          <Circle {...s} cx={10.8} cy={10.8} r={6.8} />
          <Path {...s} d="m15.8 15.8 4.4 4.4" />
        </G>
      );
    case 'heart':
      return filled ? (
        <Path
          fill={c}
          d="M12 20.6c-.3 0-.6-.1-.8-.3C7 16.7 3 13.2 3 9.3 3 6.4 5.2 4.2 8 4.2c1.6 0 3.1.8 4 2 .9-1.2 2.4-2 4-2 2.8 0 5 2.2 5 5.1 0 3.9-4 7.4-8.2 11-.2.2-.5.3-.8.3Z"
        />
      ) : (
        <Path
          {...s}
          d="M12 19.7C8 16.3 4 13 4 9.3 4 7 5.8 5.2 8 5.2c1.6 0 3.1 1 3.7 2.4h.6C12.9 6.2 14.4 5.2 16 5.2c2.2 0 4 1.8 4 4.1 0 3.7-4 7-8 10.4Z"
        />
      );
    case 'compass':
      return filled ? (
        <G>
          <Circle cx={12} cy={12} r={9} fill={c} />
          <Path d="m15.6 8.4-2.1 5-5 2.2 2.1-5Z" fill="#fff" />
        </G>
      ) : (
        <G>
          <Circle {...s} cx={12} cy={12} r={8.6} />
          <Path {...s} d="m15.6 8.4-2.1 5-5 2.2 2.1-5Z" />
        </G>
      );
    case 'message':
      return filled ? (
        <Path fill={c} d="M12 3.5c5 0 9 3.4 9 7.7s-4 7.7-9 7.7c-.9 0-1.7-.1-2.5-.3l-4.3 1.8a.5.5 0 0 1-.7-.6l.9-3.3C3.8 15.2 3 13.3 3 11.2 3 6.9 7 3.5 12 3.5Z" />
      ) : (
        <Path {...s} d="M12 4.2c4.5 0 8.2 3.1 8.2 7s-3.7 7-8.2 7c-.9 0-1.8-.1-2.6-.4l-3.8 1.6.9-3a6.6 6.6 0 0 1-2.7-5.2c0-3.9 3.7-7 8.2-7Z" />
      );
    case 'user':
      return filled ? (
        <G>
          <Circle cx={12} cy={8} r={4} fill={c} />
          <Path fill={c} d="M12 13.4c-4 0-7.2 2.5-7.2 5.6 0 .6.4 1 1 1h12.4c.6 0 1-.4 1-1 0-3.1-3.2-5.6-7.2-5.6Z" />
        </G>
      ) : (
        <G>
          <Circle {...s} cx={12} cy={8} r={3.8} />
          <Path {...s} d="M4.8 20c0-3.4 3.2-5.8 7.2-5.8s7.2 2.4 7.2 5.8" />
        </G>
      );
    case 'ticket':
      return filled ? (
        <Path
          fill={c}
          d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v2a2.5 2.5 0 0 0 0 5v2a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-2a2.5 2.5 0 0 0 0-5Z"
        />
      ) : (
        <G>
          <Path
            {...s}
            d="M4 7.6A1.6 1.6 0 0 1 5.6 6h12.8A1.6 1.6 0 0 1 20 7.6v1.9a2.5 2.5 0 0 0 0 5v1.9a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 16.4v-1.9a2.5 2.5 0 0 0 0-5Z"
          />
          <Path {...s} strokeDasharray="1.5 2.5" d="M14.5 6.6v10.8" />
        </G>
      );
    case 'train':
      return filled ? (
        <G>
          <Path fill={c} d="M12 3c3.8 0 6.4 2.5 6.4 6.2v7.4c0 1.4-1 2.4-2.4 2.4H8c-1.4 0-2.4-1-2.4-2.4V9.2C5.6 5.5 8.2 3 12 3Z" />
          <Rect x={8.4} y={7} width={7.2} height={4.6} rx={1.6} fill="#fff" />
          <Path {...s} stroke={c} d="M8.2 22.4 10 19.6M15.8 22.4 14 19.6" />
        </G>
      ) : (
        <G>
          <Path {...s} d="M12 3.6c3.5 0 5.8 2.3 5.8 5.7v7.2c0 1.3-.9 2.2-2.2 2.2H8.4c-1.3 0-2.2-.9-2.2-2.2V9.3c0-3.4 2.3-5.7 5.8-5.7Z" />
          <Rect {...s} x={8.6} y={7.2} width={6.8} height={4.4} rx={1.6} />
          <Circle cx={9.6} cy={15} r={1.1} fill={c} />
          <Circle cx={14.4} cy={15} r={1.1} fill={c} />
          <Path {...s} d="M8.4 22 10 19.2M15.6 22 14 19.2" />
        </G>
      );
    case 'star':
      return filled ? (
        <Path fill={c} d="m12 3.4 2.65 5.5 6 .85-4.35 4.2 1.03 5.96L12 17.1l-5.33 2.81 1.03-5.96L3.35 9.75l6-.85Z" />
      ) : (
        <Path {...s} d="m12 4.2 2.5 5.2 5.7.8-4.1 4 .97 5.65L12 17.15l-5.07 2.7.97-5.65-4.1-4 5.7-.8Z" />
      );
    case 'close':
      return <Path {...s} d="m6 6 12 12M18 6 6 18" />;
    case 'check':
      return <Path {...s} d="m4.5 12.5 5 5L19.5 7" />;
    case 'plus':
      return <Path {...s} d="M12 5v14M5 12h14" />;
    case 'minus':
      return <Path {...s} d="M5 12h14" />;
    case 'chevron-left':
      return <Path {...s} d="m15 5-7 7 7 7" />;
    case 'chevron-right':
      return <Path {...s} d="m9 5 7 7-7 7" />;
    case 'chevron-down':
      return <Path {...s} d="m5 9 7 7 7-7" />;
    case 'chevron-up':
      return <Path {...s} d="m5 15 7-7 7 7" />;
    case 'arrow-left':
      return (
        <G>
          <Path {...s} d="M20 12H4" />
          <Path {...s} d="m10 6-6 6 6 6" />
        </G>
      );
    case 'arrow-right':
      return (
        <G>
          <Path {...s} d="M4 12h16" />
          <Path {...s} d="m14 6 6 6-6 6" />
        </G>
      );
    case 'arrow-up-right':
      return (
        <G>
          <Path {...s} d="M7 17 17 7" />
          <Path {...s} d="M8.5 7H17v8.5" />
        </G>
      );
    case 'filter':
      return (
        <G>
          <Path {...s} d="M3 7h18M6 12h12M10 17h4" />
        </G>
      );
    case 'sliders':
      return (
        <G>
          <Path {...s} d="M4 7h5M13 7h7M4 12h11M19 12h1M4 17h3M11 17h9" />
          <Circle {...s} cx={11} cy={7} r={2} />
          <Circle {...s} cx={17} cy={12} r={2} />
          <Circle {...s} cx={9} cy={17} r={2} />
        </G>
      );
    case 'sort':
      return (
        <G>
          <Path {...s} d="M7 4v16M4 17l3 3 3-3" />
          <Path {...s} d="M17 20V4M14 7l3-3 3 3" />
        </G>
      );
    case 'swap':
      return (
        <G>
          <Path {...s} d="M7 4v14M3.5 14.5 7 18l3.5-3.5" />
          <Path {...s} d="M17 20V6M13.5 9.5 17 6l3.5 3.5" />
        </G>
      );
    case 'share':
      return (
        <G>
          <Path {...s} d="M12 3v13" />
          <Path {...s} d="m8 7 4-4 4 4" />
          <Path {...s} d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
        </G>
      );
    case 'map':
      return (
        <G>
          <Path {...s} d="m9 4.5-5 2v13l5-2 6 2 5-2v-13l-5 2-6-2Z" />
          <Path {...s} d="M9 4.5v13M15 6.5v13" />
        </G>
      );
    case 'list':
      return (
        <G>
          <Path {...s} d="M9 6h11M9 12h11M9 18h11" />
          <Circle cx={4.6} cy={6} r={1.3} fill={c} />
          <Circle cx={4.6} cy={12} r={1.3} fill={c} />
          <Circle cx={4.6} cy={18} r={1.3} fill={c} />
        </G>
      );
    case 'globe':
      return (
        <G>
          <Circle {...s} cx={12} cy={12} r={8.6} />
          <Path {...s} d="M3.4 12h17.2" />
          <Path {...s} d="M12 3.4a13 13 0 0 1 0 17.2 13 13 0 0 1 0-17.2Z" />
        </G>
      );
    case 'settings':
      return (
        <G>
          <Circle {...s} cx={12} cy={12} r={3} />
          <Path
            {...s}
            d="M12 2.8 13.3 5a7.4 7.4 0 0 1 2.2 1l2.5-.8 1.6 2.7-1.9 1.8a7.4 7.4 0 0 1 0 2.2l1.9 1.8-1.6 2.7-2.5-.8a7.4 7.4 0 0 1-2.2 1L12 21.2 10.7 19a7.4 7.4 0 0 1-2.2-1l-2.5.8L4.4 16l1.9-1.8a7.4 7.4 0 0 1 0-2.2L4.4 10.2 6 7.5l2.5.8a7.4 7.4 0 0 1 2.2-1Z"
          />
        </G>
      );
    case 'info':
      return (
        <G>
          <Circle {...s} cx={12} cy={12} r={8.6} />
          <Path {...s} d="M12 11v5.5" />
          <Circle cx={12} cy={7.8} r={1.1} fill={c} />
        </G>
      );
    case 'alert':
      return (
        <G>
          <Path {...s} d="M12 4.2 21 19.8H3z" />
          <Path {...s} d="M12 10v4" />
          <Circle cx={12} cy={16.8} r={1.05} fill={c} />
        </G>
      );
    case 'help':
      return (
        <G>
          <Circle {...s} cx={12} cy={12} r={8.6} />
          <Path {...s} d="M9.6 9.4a2.5 2.5 0 0 1 4.9.6c0 1.7-2.5 2-2.5 3.5" />
          <Circle cx={12} cy={16.6} r={1.05} fill={c} />
        </G>
      );
    case 'lock':
      return (
        <G>
          <Rect {...s} x={4.6} y={10} width={14.8} height={10} rx={2.6} />
          <Path {...s} d="M8 10V7a4 4 0 0 1 8 0v3" />
        </G>
      );
    case 'qr':
      return (
        <G>
          <Rect {...s} x={3.5} y={3.5} width={7} height={7} rx={1.6} />
          <Rect {...s} x={13.5} y={3.5} width={7} height={7} rx={1.6} />
          <Rect {...s} x={3.5} y={13.5} width={7} height={7} rx={1.6} />
          <Path {...s} d="M13.5 13.5h3.2v3.2h-3.2zM17.8 17.8h2.7v2.7h-2.7M13.5 20.5h1.6" />
        </G>
      );
    case 'download':
      return (
        <G>
          <Path {...s} d="M12 3.5v11" />
          <Path {...s} d="m8 10.5 4 4 4-4" />
          <Path {...s} d="M4.5 17v1.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V17" />
        </G>
      );
    case 'calendar':
      return (
        <G>
          <Rect {...s} x={3.5} y={5} width={17} height={15.5} rx={3} />
          <Path {...s} d="M3.5 10h17M8 3.4v3.2M16 3.4v3.2" />
        </G>
      );
    case 'clock':
      return (
        <G>
          <Circle {...s} cx={12} cy={12} r={8.6} />
          <Path {...s} d="M12 7.2V12l3.2 2" />
        </G>
      );
    case 'pin':
      return filled ? (
        <G>
          <Path fill={c} d="M12 21.5s7.4-6.6 7.4-11.6a7.4 7.4 0 0 0-14.8 0c0 5 7.4 11.6 7.4 11.6Z" />
          <Circle cx={12} cy={9.7} r={2.6} fill="#fff" />
        </G>
      ) : (
        <G>
          <Path {...s} d="M12 20.8s6.8-6.2 6.8-11a6.8 6.8 0 1 0-13.6 0c0 4.8 6.8 11 6.8 11Z" />
          <Circle {...s} cx={12} cy={9.8} r={2.5} />
        </G>
      );
    case 'moon':
      return <Path {...s} d="M20 14.2A8.5 8.5 0 0 1 9.8 4 8.6 8.6 0 1 0 20 14.2Z" />;
    case 'sun':
      return (
        <G>
          <Circle {...s} cx={12} cy={12} r={4.2} />
          <Path {...s} d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
        </G>
      );
    case 'flame':
      return (
        <Path
          {...s}
          d="M12 21c3.6 0 6-2.4 6-5.6 0-3.9-3.6-5.5-3-9.9-2.2.6-3.4 2.6-3.4 4.4 0 1.3-.7 1.8-1.3 1.2-.6-.6-.7-1.6-.7-2.3C7.7 10.2 6 12.3 6 15.4 6 18.6 8.4 21 12 21Z"
        />
      );
    case 'verified':
      return (
        <G>
          <Path
            {...s}
            d="m12 3 2.3 1.7 2.8-.3 1 2.7 2.4 1.6-.9 2.7.9 2.7-2.4 1.6-1 2.7-2.8-.3L12 21l-2.3-1.9-2.8.3-1-2.7-2.4-1.6.9-2.7-.9-2.7 2.4-1.6 1-2.7 2.8.3Z"
          />
          <Path {...s} d="m8.8 12 2.2 2.2 4.2-4.4" />
        </G>
      );
    case 'bell':
      return (
        <G>
          <Path {...s} d="M6 16.4V11a6 6 0 1 1 12 0v5.4l1.5 2h-15z" />
          <Path {...s} d="M10 20.4a2.2 2.2 0 0 0 4 0" />
        </G>
      );

    /* ---------------------------------------------- amenities and facilities */
    case 'snow':
      return (
        <G>
          <Path {...s} d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />
          <Path {...s} d="M9.6 4.8 12 6.6l2.4-1.8M9.6 19.2 12 17.4l2.4 1.8" />
        </G>
      );
    case 'bed':
      return (
        <G>
          <Path {...s} d="M3 18v-8a2 2 0 0 1 2-2h1v5" />
          <Path {...s} d="M6 13h12a3 3 0 0 1 3 3v2" />
          <Path {...s} d="M3 18h18M3 20.5v-2M21 20.5v-2" />
          <Circle {...s} cx={9} cy={10.2} r={1.8} />
        </G>
      );
    case 'meal':
      return (
        <G>
          <Path {...s} d="M4 4v6a2.5 2.5 0 0 0 5 0V4M6.5 4v16" />
          <Path {...s} d="M17 20V4c-2 .8-3 2.6-3 5.2 0 1.7.8 2.8 3 3.2" />
        </G>
      );
    case 'tea':
      return (
        <G>
          <Path {...s} d="M5.5 8h11v6a4 4 0 0 1-4 4h-3a4 4 0 0 1-4-4z" />
          <Path {...s} d="M16.5 9.6h1.7a2.1 2.1 0 0 1 0 4.2h-1.7" />
          <Path {...s} d="M4 21h14M9 3.4c-.8 1 .8 1.6 0 2.6M13 3.4c-.8 1 .8 1.6 0 2.6" />
        </G>
      );
    case 'restaurant':
      return (
        <G>
          <Path {...s} d="M7 3v8M7 11v10M4.5 3v5a2.5 2.5 0 0 0 5 0V3" />
          <Path {...s} d="M17 21V3a4 4 0 0 0-2.5 3.8c0 2 1 3.3 2.5 3.6" />
        </G>
      );
    case 'plug':
      return (
        <G>
          <Path {...s} d="M8.5 3.5v5M15.5 3.5v5" />
          <Path {...s} d="M5.8 8.5h12.4v2.2a6.2 6.2 0 0 1-12.4 0z" />
          <Path {...s} d="M12 16.9v3.6" />
        </G>
      );
    case 'usb':
      return (
        <G>
          <Rect {...s} x={8} y={3.5} width={8} height={12} rx={3} />
          <Path {...s} d="M10.5 7.4v2M13.5 7.4v2M12 15.5v5" />
        </G>
      );
    case 'lamp':
      return (
        <G>
          <Path {...s} d="M8 4h8l2.5 6H5.5z" />
          <Path {...s} d="M12 10v5" />
          <Path {...s} d="M9 20.5a3 3 0 0 1 6 0z" />
        </G>
      );
    case 'wifi':
      return (
        <G>
          <Path {...s} d="M2.6 9a16 16 0 0 1 18.8 0" />
          <Path {...s} d="M6 12.6a11 11 0 0 1 12 0" />
          <Path {...s} d="M9.3 16a6 6 0 0 1 5.4 0" />
          <Circle cx={12} cy={18.8} r={1.1} fill={c} />
        </G>
      );
    case 'prayer':
      return (
        <G>
          <Path {...s} d="M6 20.5v-8a6 6 0 0 1 12 0v8z" />
          <Path {...s} d="M4.5 20.5h15" />
          <Path {...s} d="M12 3.2v1.6M10.6 6a2.6 2.6 0 0 1 2.8 0" />
        </G>
      );
    case 'washroom':
      return (
        <G>
          <Path {...s} d="M5 11h14v3a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5z" />
          <Path {...s} d="M7.5 11V6.2a2.2 2.2 0 0 1 4.4 0V8" />
          <Path {...s} d="M7 21l1-2M17 21l-1-2" />
        </G>
      );
    case 'luggage':
      return (
        <G>
          <Rect {...s} x={5} y={7} width={14} height={12} rx={2.4} />
          <Path {...s} d="M9.5 7V4.6h5V7M9.5 11v4M14.5 11v4M7.5 19v1.6M16.5 19v1.6" />
        </G>
      );
    case 'accessible':
      return (
        <G>
          <Circle {...s} cx={11.5} cy={4.6} r={1.9} />
          <Path {...s} d="M10.4 8.2v5.2h5.1l2.6 6.2" />
          <Circle {...s} cx={11} cy={16} r={5} />
        </G>
      );
    case 'shield':
      return (
        <G>
          <Path {...s} d="M12 3.2 19.4 6v6c0 4-3.1 7.3-7.4 8.8C7.7 19.3 4.6 16 4.6 12V6Z" />
          <Path {...s} d="m9.2 12 2 2 3.6-3.8" />
        </G>
      );
    case 'seat':
      return (
        <G>
          <Path {...s} d="M7.5 4.5h2.8a2.2 2.2 0 0 1 2.2 2.2V14H7.5z" />
          <Path {...s} d="M7.5 14h8a2.2 2.2 0 0 1 2.2 2.2v3.8" />
          <Path {...s} d="M5.2 8v11.5" />
        </G>
      );
    case 'curtain':
      return (
        <G>
          <Path {...s} d="M3.5 4h17" />
          <Path {...s} d="M6.5 4v16c2.6 0 4-2.9 4-8s-1.4-8-4-8Z" />
          <Path {...s} d="M17.5 4v16c-2.6 0-4-2.9-4-8s1.4-8 4-8Z" />
        </G>
      );
    case 'screen':
      return (
        <G>
          <Rect {...s} x={3.5} y={4.5} width={17} height={11.5} rx={2.2} />
          <Path {...s} d="M9 20h6M12 16v4" />
        </G>
      );
    case 'car':
      return (
        <G>
          <Path {...s} d="M4 16v-3.2l2-5A2 2 0 0 1 7.9 6.5h8.2a2 2 0 0 1 1.9 1.3l2 5V16" />
          <Path {...s} d="M4 12.8h16" />
          <Circle {...s} cx={7.5} cy={16.4} r={1.7} />
          <Circle {...s} cx={16.5} cy={16.4} r={1.7} />
        </G>
      );
    case 'card':
      return (
        <G>
          <Rect {...s} x={3} y={5.5} width={18} height={13} rx={2.6} />
          <Path {...s} d="M3 10h18M6.5 14.6h3" />
        </G>
      );

    /* ------------------------------------------------------------ last mile */
    case 'bus':
      return (
        <G>
          <Rect {...s} x={4.5} y={4} width={15} height={13} rx={2.6} />
          <Path {...s} d="M4.5 11.5h15" />
          <Circle cx={8} cy={14.2} r={1.1} fill={c} />
          <Circle cx={16} cy={14.2} r={1.1} fill={c} />
          <Path {...s} d="M7.5 17v2.6M16.5 17v2.6" />
        </G>
      );
    case 'metro':
      return (
        <G>
          <Rect {...s} x={5.5} y={3.6} width={13} height={13.4} rx={3.4} />
          <Path {...s} d="M5.5 11h13" />
          <Circle cx={9} cy={14} r={1.05} fill={c} />
          <Circle cx={15} cy={14} r={1.05} fill={c} />
          <Path {...s} d="M8 20.6l2-3.4M16 20.6l-2-3.4" />
        </G>
      );
    case 'rickshaw':
      return (
        <G>
          <Path {...s} d="M5 16.5v-4a6 6 0 0 1 6-6h2.5l4 5.5v4.5" />
          <Path {...s} d="M5 12.6h12.5" />
          <Circle {...s} cx={7.5} cy={17.4} r={1.9} />
          <Circle {...s} cx={16.5} cy={17.4} r={1.9} />
          <Path {...s} d="M11 6.5v6" />
        </G>
      );
    case 'taxi':
      return (
        <G>
          <Path {...s} d="M4 16.4v-3.2l2-5A2 2 0 0 1 7.9 7h8.2a2 2 0 0 1 1.9 1.2l2 5v3.2" />
          <Path {...s} d="M4 13.2h16" />
          <Circle {...s} cx={7.5} cy={16.8} r={1.7} />
          <Circle {...s} cx={16.5} cy={16.8} r={1.7} />
          <Rect {...s} x={9.6} y={3.6} width={4.8} height={3.2} rx={0.9} />
        </G>
      );
    case 'walk':
      return (
        <G>
          <Circle {...s} cx={13} cy={4.4} r={1.9} />
          <Path {...s} d="M13 8.2v5.2l3 3.6.8 4" />
          <Path {...s} d="M13 13.4 9.4 15.2 8 20.2" />
          <Path {...s} d="m13 9.6 3.6 1.6" />
        </G>
      );

    default:
      return <Circle {...s} cx={12} cy={12} r={8} />;
  }
}
