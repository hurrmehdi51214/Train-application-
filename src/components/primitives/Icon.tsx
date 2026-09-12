import React from 'react';
import Svg, { Circle, Path, Rect, G } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * A drawn icon set rather than a font.
 *
 * Two reasons. First, an icon font ships thousands of glyphs to use twenty, and
 * this app has to start fast on a platform. Second, an off-the-shelf set is the
 * fastest way to make a product look like everyone else's: these are drawn on a
 * 24-unit grid with a 1.7 stroke and consistently squared-off terminals, which
 * is what makes them sit properly next to the serif headings.
 */

export type IconName =
  | 'arrow-right'
  | 'arrow-left'
  | 'arrow-up-right'
  | 'chevron-right'
  | 'chevron-down'
  | 'swap'
  | 'search'
  | 'ticket'
  | 'pin'
  | 'train'
  | 'clock'
  | 'calendar'
  | 'check'
  | 'alert'
  | 'info'
  | 'offline'
  | 'wifi'
  | 'plug'
  | 'usb'
  | 'cup'
  | 'trolley'
  | 'bike'
  | 'scooter'
  | 'wheelchair'
  | 'luggage'
  | 'quiet'
  | 'table'
  | 'climate'
  | 'wc'
  | 'bus'
  | 'tram'
  | 'metro'
  | 'ferry'
  | 'taxi'
  | 'walk'
  | 'share'
  | 'settings'
  | 'lock'
  | 'bell'
  | 'qr'
  | 'download'
  | 'platform'
  | 'seat'
  | 'people';

/** Shared stroke attributes every glyph below spreads onto its paths. */
interface StrokeProps {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: 'round';
  strokeLinejoin: 'round';
  fill: 'none';
}

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, color, strokeWidth = 1.7 }: IconProps) {
  const { palette } = useTheme();
  const stroke = color ?? palette.textPrimary;
  const common: StrokeProps = {
    stroke,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {renderPaths(name, common, stroke)}
    </Svg>
  );
}

function renderPaths(name: IconName, p: StrokeProps, stroke: string) {
  switch (name) {
    case 'arrow-right':
      return (
        <G>
          <Path {...p} d="M4 12h15" />
          <Path {...p} d="M13.5 6.5 19 12l-5.5 5.5" />
        </G>
      );
    case 'arrow-left':
      return (
        <G>
          <Path {...p} d="M20 12H5" />
          <Path {...p} d="M10.5 6.5 5 12l5.5 5.5" />
        </G>
      );
    case 'arrow-up-right':
      return (
        <G>
          <Path {...p} d="M7 17 17 7" />
          <Path {...p} d="M8.5 7H17v8.5" />
        </G>
      );
    case 'chevron-right':
      return <Path {...p} d="m9.5 5.5 6.5 6.5-6.5 6.5" />;
    case 'chevron-down':
      return <Path {...p} d="m5.5 9.5 6.5 6.5 6.5-6.5" />;
    case 'swap':
      return (
        <G>
          <Path {...p} d="M7 4v13" />
          <Path {...p} d="M3.5 13.5 7 17l3.5-3.5" />
          <Path {...p} d="M17 20V7" />
          <Path {...p} d="M13.5 10.5 17 7l3.5 3.5" />
        </G>
      );
    case 'search':
      return (
        <G>
          <Circle {...p} cx={11} cy={11} r={6.5} />
          <Path {...p} d="m16 16 4 4" />
        </G>
      );
    case 'ticket':
      return (
        <G>
          <Path
            {...p}
            d="M3.5 8.5A1.5 1.5 0 0 1 5 7h14a1.5 1.5 0 0 1 1.5 1.5V10a2 2 0 0 0 0 4v1.5A1.5 1.5 0 0 1 19 17H5a1.5 1.5 0 0 1-1.5-1.5V14a2 2 0 0 0 0-4z"
          />
          <Path {...p} strokeDasharray="1.6 2.4" d="M14 7.5v9" />
        </G>
      );
    case 'pin':
      return (
        <G>
          <Path {...p} d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" />
          <Circle {...p} cx={12} cy={10} r={2.5} />
        </G>
      );
    case 'train':
      return (
        <G>
          <Path {...p} d="M7 3.5h10a2.5 2.5 0 0 1 2.5 2.5v8a2.5 2.5 0 0 1-2.5 2.5H7A2.5 2.5 0 0 1 4.5 14V6A2.5 2.5 0 0 1 7 3.5Z" />
          <Path {...p} d="M4.5 9.5h15" />
          <Path {...p} d="m7.5 20.5 2-4M16.5 20.5l-2-4" />
          <Circle cx={8.5} cy={13} r={1.1} fill={stroke} />
          <Circle cx={15.5} cy={13} r={1.1} fill={stroke} />
        </G>
      );
    case 'clock':
      return (
        <G>
          <Circle {...p} cx={12} cy={12} r={8.5} />
          <Path {...p} d="M12 7.5V12l3 2" />
        </G>
      );
    case 'calendar':
      return (
        <G>
          <Rect {...p} x={3.5} y={5} width={17} height={15} rx={2.5} />
          <Path {...p} d="M3.5 10h17M8 3.5V6.5M16 3.5V6.5" />
        </G>
      );
    case 'check':
      return <Path {...p} d="m5 12.5 4.5 4.5L19 7" />;
    case 'alert':
      return (
        <G>
          <Path {...p} d="M12 4.5 21 19.5H3z" />
          <Path {...p} d="M12 10v4" />
          <Circle cx={12} cy={16.6} r={1} fill={stroke} />
        </G>
      );
    case 'info':
      return (
        <G>
          <Circle {...p} cx={12} cy={12} r={8.5} />
          <Path {...p} d="M12 11v5.5" />
          <Circle cx={12} cy={7.8} r={1} fill={stroke} />
        </G>
      );
    case 'offline':
      return (
        <G>
          <Path {...p} d="M4 4 20 20" />
          <Path {...p} d="M2.5 9.2a16 16 0 0 1 5.2-3.1M21.5 9.2a16 16 0 0 0-7.8-3.6" />
          <Path {...p} d="M6 12.6a11 11 0 0 1 2.6-1.7M18 12.6a11 11 0 0 0-2.6-1.7" />
          <Path {...p} d="M9.3 16a6 6 0 0 1 1.4-.8" />
          <Circle cx={12} cy={18.8} r={1.1} fill={stroke} />
        </G>
      );
    case 'wifi':
      return (
        <G>
          <Path {...p} d="M2.5 9a16 16 0 0 1 19 0" />
          <Path {...p} d="M6 12.6a11 11 0 0 1 12 0" />
          <Path {...p} d="M9.3 16a6 6 0 0 1 5.4 0" />
          <Circle cx={12} cy={18.8} r={1.1} fill={stroke} />
        </G>
      );
    case 'plug':
      return (
        <G>
          <Path {...p} d="M8 3.5v5M16 3.5v5" />
          <Path {...p} d="M5.5 8.5h13v2a6.5 6.5 0 0 1-13 0z" />
          <Path {...p} d="M12 17v3.5" />
        </G>
      );
    case 'usb':
      return (
        <G>
          <Rect {...p} x={8} y={3.5} width={8} height={12} rx={3} />
          <Path {...p} d="M10.5 7.5v2M13.5 7.5v2" />
          <Path {...p} d="M12 15.5v5" />
        </G>
      );
    case 'cup':
      return (
        <G>
          <Path {...p} d="M5.5 6.5h11v7a4 4 0 0 1-4 4h-3a4 4 0 0 1-4-4z" />
          <Path {...p} d="M16.5 8.5h1.8a2.2 2.2 0 0 1 0 4.4h-1.8" />
          <Path {...p} d="M4 20.5h14" />
        </G>
      );
    case 'trolley':
      return (
        <G>
          <Rect {...p} x={5} y={5} width={11} height={11} rx={1.5} />
          <Path {...p} d="M5 10h11" />
          <Circle {...p} cx={8} cy={19} r={1.6} />
          <Circle {...p} cx={14} cy={19} r={1.6} />
          <Path {...p} d="M16 6h3v12" />
        </G>
      );
    case 'bike':
      return (
        <G>
          <Circle {...p} cx={6} cy={16.5} r={3.8} />
          <Circle {...p} cx={18} cy={16.5} r={3.8} />
          <Path {...p} d="m6 16.5 4-8h5l3 8" />
          <Path {...p} d="M10 8.5h4.5" />
          <Path {...p} d="M9 5h2.5" />
        </G>
      );
    case 'scooter':
      return (
        <G>
          <Circle {...p} cx={6} cy={17.5} r={2.7} />
          <Circle {...p} cx={18.5} cy={17.5} r={2.7} />
          <Path {...p} d="M8.7 17.5h6.3l1.2-12h2.8" />
          <Path {...p} d="M15 17.5h1" />
        </G>
      );
    case 'wheelchair':
      return (
        <G>
          <Circle {...p} cx={11} cy={4.5} r={1.8} />
          <Path {...p} d="M10 8v5h5l2.5 6" />
          <Circle {...p} cx={11} cy={16} r={5} />
        </G>
      );
    case 'luggage':
      return (
        <G>
          <Rect {...p} x={5} y={7} width={14} height={12} rx={2.2} />
          <Path {...p} d="M9.5 7V4.5h5V7" />
          <Path {...p} d="M9.5 11v4M14.5 11v4" />
        </G>
      );
    case 'quiet':
      return (
        <G>
          <Path {...p} d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" />
          <Path {...p} d="m16 9 4.5 6M20.5 9 16 15" />
        </G>
      );
    case 'table':
      return (
        <G>
          <Path {...p} d="M3.5 9h17" />
          <Path {...p} d="M6 9v10M18 9v10" />
          <Path {...p} d="M3.5 9 6 5h12l2.5 4" />
        </G>
      );
    case 'climate':
      return (
        <G>
          <Path {...p} d="M12 3.5v17" />
          <Path {...p} d="m5.5 7.5 13 9M18.5 7.5l-13 9" />
          <Path {...p} d="M9.5 5.5 12 7.5l2.5-2M9.5 18.5 12 16.5l2.5 2" />
        </G>
      );
    case 'wc':
      return (
        <G>
          <Circle {...p} cx={8} cy={5} r={1.7} />
          <Path {...p} d="M6 20v-5H4.8l1.4-5.3A1.8 1.8 0 0 1 8 8.4a1.8 1.8 0 0 1 1.8 1.3L11.2 15H10v5z" />
          <Path {...p} d="M15.5 4.5v15" />
          <Circle {...p} cx={19} cy={5} r={1.7} />
          <Path {...p} d="M17 20v-4h-1l1.5-5.5h3L22 16h-1v4z" />
        </G>
      );
    case 'bus':
      return (
        <G>
          <Rect {...p} x={4} y={4} width={16} height={13} rx={2.5} />
          <Path {...p} d="M4 11h16" />
          <Circle cx={8} cy={14} r={1.1} fill={stroke} />
          <Circle cx={16} cy={14} r={1.1} fill={stroke} />
          <Path {...p} d="M7 17v2.5M17 17v2.5" />
        </G>
      );
    case 'tram':
      return (
        <G>
          <Rect {...p} x={5.5} y={4} width={13} height={13} rx={3} />
          <Path {...p} d="M5.5 10.5h13" />
          <Path {...p} d="M12 4V1.5M8 20.5h8" />
          <Circle cx={9} cy={13.8} r={1} fill={stroke} />
          <Circle cx={15} cy={13.8} r={1} fill={stroke} />
        </G>
      );
    case 'metro':
      return (
        <G>
          <Circle {...p} cx={12} cy={12} r={8.5} />
          <Path {...p} d="M7.5 15.5 9 8.5l3 5 3-5 1.5 7" />
        </G>
      );
    case 'ferry':
      return (
        <G>
          <Path {...p} d="M3 17.5c1.8 0 1.8 1.5 3.6 1.5s1.8-1.5 3.6-1.5 1.8 1.5 3.6 1.5 1.8-1.5 3.6-1.5 1.8 1.5 3.6 1.5" />
          <Path {...p} d="M5 15 6.5 9h11L19 15" />
          <Path {...p} d="M12 9V5.5H9" />
        </G>
      );
    case 'taxi':
      return (
        <G>
          <Path {...p} d="M3.5 16.5v-3l2-5h13l2 5v3" />
          <Path {...p} d="M3.5 13.5h17" />
          <Circle {...p} cx={7} cy={16.8} r={1.6} />
          <Circle {...p} cx={17} cy={16.8} r={1.6} />
          <Rect {...p} x={9.5} y={4.5} width={5} height={3} rx={0.8} />
        </G>
      );
    case 'walk':
      return (
        <G>
          <Circle {...p} cx={13} cy={4.3} r={1.8} />
          <Path {...p} d="M13 8v5l3 3.5.8 4" />
          <Path {...p} d="M13 13 9.5 15l-1.5 5" />
          <Path {...p} d="m13 9.5 3.5 1.5" />
        </G>
      );
    case 'share':
      return (
        <G>
          <Path {...p} d="M12 3.5v12" />
          <Path {...p} d="m8 7.5 4-4 4 4" />
          <Path {...p} d="M5.5 12.5v6a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-6" />
        </G>
      );
    case 'settings':
      return (
        <G>
          <Circle {...p} cx={12} cy={12} r={3} />
          <Path
            {...p}
            d="M12 2.5 13.4 5a7.5 7.5 0 0 1 2.3 1l2.6-.8 1.6 2.8-1.9 1.9a7.5 7.5 0 0 1 0 2.2l1.9 1.9-1.6 2.8-2.6-.8a7.5 7.5 0 0 1-2.3 1L12 21.5 10.6 19a7.5 7.5 0 0 1-2.3-1l-2.6.8-1.6-2.8 1.9-1.9a7.5 7.5 0 0 1 0-2.2L4.1 8l1.6-2.8 2.6.8a7.5 7.5 0 0 1 2.3-1z"
          />
        </G>
      );
    case 'lock':
      return (
        <G>
          <Rect {...p} x={4.5} y={10} width={15} height={10} rx={2.5} />
          <Path {...p} d="M8 10V7a4 4 0 0 1 8 0v3" />
          <Circle cx={12} cy={15} r={1.2} fill={stroke} />
        </G>
      );
    case 'bell':
      return (
        <G>
          <Path {...p} d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15z" />
          <Path {...p} d="M10 20.5a2.2 2.2 0 0 0 4 0" />
        </G>
      );
    case 'qr':
      return (
        <G>
          <Rect {...p} x={3.5} y={3.5} width={7} height={7} rx={1.4} />
          <Rect {...p} x={13.5} y={3.5} width={7} height={7} rx={1.4} />
          <Rect {...p} x={3.5} y={13.5} width={7} height={7} rx={1.4} />
          <Path {...p} d="M13.5 13.5h3v3h-3zM18 18h2.5v2.5H18M13.5 20.5h1.5" />
        </G>
      );
    case 'download':
      return (
        <G>
          <Path {...p} d="M12 3.5v11" />
          <Path {...p} d="m8 10.5 4 4 4-4" />
          <Path {...p} d="M4.5 17v1.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V17" />
        </G>
      );
    case 'platform':
      return (
        <G>
          <Path {...p} d="M3 19h18" />
          <Path {...p} d="M5 19v-4h5v4" />
          <Rect {...p} x={12} y={5} width={8} height={10} rx={2} />
          <Path {...p} d="M12 10h8" />
        </G>
      );
    case 'seat':
      return (
        <G>
          <Path {...p} d="M7 4.5h3a2 2 0 0 1 2 2V14H7z" />
          <Path {...p} d="M7 14h9a2 2 0 0 1 2 2v3.5" />
          <Path {...p} d="M5 8v11" />
        </G>
      );
    case 'people':
      return (
        <G>
          <Circle {...p} cx={9} cy={7.5} r={3} />
          <Path {...p} d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
          <Path {...p} d="M16 5.2a3 3 0 0 1 0 4.6" />
          <Path {...p} d="M17 14.6a5.5 5.5 0 0 1 3.5 4.9" />
        </G>
      );
    default:
      return <Circle {...p} cx={12} cy={12} r={8} />;
  }
}
