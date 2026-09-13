import React from 'react';
import { Circle, G, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * The train on the map.
 *
 * Drawn as a train nose-on and rotated to its direction of travel, rather than
 * a generic pin. A pin says where something is; a train pointing the right way
 * says where it is going, which is the question a passenger is actually asking.
 * The silhouette is the app mark's, so the thing on the map and the thing on
 * the home screen are recognisably the same train.
 */
export function TrainPin({ x, y, bearing }: { x: number; y: number; bearing: number }) {
  const { palette } = useTheme();

  return (
    <G x={x} y={y}>
      {/* Halo, unrotated so it never looks lopsided. */}
      <Circle cx={0} cy={0} r={18} fill={palette.brand} opacity={0.16} />
      <Circle cx={0} cy={0} r={13} fill={palette.surface} />

      <G rotation={bearing} origin="0, 0">
        {/* Body: the arched nose from the Safar mark, pointing along the bearing. */}
        <Path
          d="M0 -9.6c3.1 0 5.2 2.1 5.2 5v8.4c0 1.6-1.1 2.7-2.7 2.7h-5c-1.6 0-2.7-1.1-2.7-2.7v-8.4c0-2.9 2.1-5 5.2-5Z"
          fill={palette.brand}
        />
        <Rect x={-3.1} y={-6.2} width={6.2} height={3.6} rx={1.4} fill={palette.surface} opacity={0.95} />
        <Circle cx={-2.4} cy={1.4} r={1.1} fill={palette.surface} opacity={0.9} />
        <Circle cx={2.4} cy={1.4} r={1.1} fill={palette.surface} opacity={0.9} />
      </G>
    </G>
  );
}
