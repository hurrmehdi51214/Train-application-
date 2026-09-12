import React from 'react';
import { Circle, G, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * The train on the map.
 *
 * Drawn as an actual train nose-on rather than a generic pin, and rotated to
 * the direction of travel. This is the detail people notice: a pin tells you
 * where something is, a train pointing the right way tells you where it is
 * going, which is the question a passenger is actually asking.
 */
export function TrainMarker({ x, y, bearing }: { x: number; y: number; bearing: number }) {
  const { palette } = useTheme();

  return (
    <G x={x} y={y}>
      {/* halo, unrotated so it never looks lopsided */}
      <Circle cx={0} cy={0} r={19} fill={palette.brand} opacity={0.14} />
      <Circle cx={0} cy={0} r={13.5} fill={palette.surface} />

      <G rotation={bearing} origin="0, 0">
        {/* body: a rounded nose pointing "up", i.e. along the bearing */}
        <Path
          d="M0 -10.5c3.4 0 5.6 2.3 5.6 5.4v9.4c0 1.9-1.3 3.2-3.2 3.2h-4.8c-1.9 0-3.2-1.3-3.2-3.2v-9.4c0-3.1 2.2-5.4 5.6-5.4Z"
          fill={palette.brand}
        />
        {/* cab window */}
        <Rect x={-3.2} y={-6.2} width={6.4} height={3.4} rx={1} fill={palette.surface} opacity={0.92} />
        {/* body stripe, the brand's one flourish */}
        <Rect x={-5.6} y={-0.6} width={11.2} height={1.6} fill={palette.accent} opacity={0.9} />
        {/* headlights */}
        <Circle cx={-3} cy={-8.4} r={1} fill={palette.accent} />
        <Circle cx={3} cy={-8.4} r={1} fill={palette.accent} />
      </G>
    </G>
  );
}
