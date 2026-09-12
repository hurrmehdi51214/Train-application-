import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, View, ViewStyle } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { Coordinate } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';
import { boundsOf, projector } from '@/utils/geo';
import { TrainMarker } from './TrainMarker';

/**
 * The map.
 *
 * This renders the network from vector geometry the app already has on disk,
 * rather than raster tiles from a tile server. That is a deliberate trade: we
 * give up streets and building footprints, and in exchange the map is a few
 * kilobytes, draws in one frame, is legible at a glance on a moving train, and
 * - the part that actually matters - works identically with the radio off.
 *
 * See docs/OFFLINE.md for why the tile-server route was rejected.
 */

export interface MapStation {
  id: string;
  name: string;
  coordinate: Coordinate;
  /** Emphasised stations get a label and a larger node. */
  emphasis?: 'primary' | 'secondary';
  passed?: boolean;
}

export interface MapCanvasProps {
  /** Rail alignment in travel order. */
  route?: Coordinate[];
  stations?: MapStation[];
  /** Live train position; the marker animates between updates. */
  train?: { coordinate: Coordinate; bearing: number } | null;
  user?: Coordinate | null;
  /** On-foot route, drawn dashed. */
  walking?: Coordinate[];
  height?: number;
  style?: ViewStyle;
  /** Extra coordinates to keep inside the viewport (e.g. the destination). */
  include?: Coordinate[];
  showGrid?: boolean;
  labelStations?: boolean;
}

export function MapCanvas({
  route = [],
  stations = [],
  train,
  user,
  walking = [],
  height = 260,
  style,
  include = [],
  showGrid = true,
  labelStations = true,
}: MapCanvasProps) {
  const { palette, radius } = useTheme();
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const project = useMemo(() => {
    const points = [
      ...route,
      ...walking,
      ...stations.map((s) => s.coordinate),
      ...include,
      ...(user ? [user] : []),
      ...(train ? [train.coordinate] : []),
    ];
    const bounds = boundsOf(points, 0.16);
    return projector(bounds, Math.max(1, width), height);
  }, [route, walking, stations, include, user, train, width, height]);

  const routePath = useMemo(() => toPath(route, project), [route, project]);
  const walkingPath = useMemo(() => toPath(walking, project), [walking, project]);

  const trainPoint = train ? project(train.coordinate) : null;
  const userPoint = user ? project(user) : null;

  // Smooth the marker between feed updates so it glides instead of teleporting.
  const animatedX = useRef(new Animated.Value(trainPoint?.x ?? 0)).current;
  const animatedY = useRef(new Animated.Value(trainPoint?.y ?? 0)).current;
  const [markerPosition, setMarkerPosition] = useState(trainPoint);

  useEffect(() => {
    if (!trainPoint) return;
    const id = animatedX.addListener(({ value }) =>
      setMarkerPosition((prev) => ({ x: value, y: prev?.y ?? trainPoint.y })),
    );
    const idY = animatedY.addListener(({ value }) =>
      setMarkerPosition((prev) => ({ x: prev?.x ?? trainPoint.x, y: value })),
    );
    Animated.parallel([
      Animated.timing(animatedX, {
        toValue: trainPoint.x,
        duration: 1200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(animatedY, {
        toValue: trainPoint.y,
        duration: 1200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();
    return () => {
      animatedX.removeListener(id);
      animatedY.removeListener(idY);
    };
  }, [trainPoint?.x, trainPoint?.y, animatedX, animatedY]);

  return (
    <View
      onLayout={onLayout}
      accessible
      accessibilityLabel="Journey map"
      style={[{ height, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: palette.mapLand }, style]}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Rect x={0} y={0} width={width} height={height} fill={palette.mapLand} />

          {showGrid ? <Graticule width={width} height={height} color={palette.hairline} /> : null}

          {/* The rail, drawn twice: a soft casing under a solid core, which is
              what keeps it readable where it crosses the grid. */}
          {routePath ? (
            <>
              <Path d={routePath} stroke={palette.mapLand} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <Path
                d={routePath}
                stroke={palette.mapRail}
                strokeWidth={3.4}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.95}
              />
            </>
          ) : null}

          {walkingPath ? (
            <Path
              d={walkingPath}
              stroke={palette.accent}
              strokeWidth={3}
              strokeDasharray="1 7"
              strokeLinecap="round"
              fill="none"
            />
          ) : null}

          {stations.map((station) => {
            const point = project(station.coordinate);
            const primary = station.emphasis === 'primary';
            const size = primary ? 6.5 : 4;
            return (
              <G key={station.id}>
                <Circle
                  cx={point.x}
                  cy={point.y}
                  r={size + 3}
                  fill={palette.mapLand}
                />
                <Circle
                  cx={point.x}
                  cy={point.y}
                  r={size}
                  fill={station.passed ? palette.mapRail : palette.surface}
                  stroke={palette.mapRail}
                  strokeWidth={primary ? 2.6 : 2}
                />
                {labelStations && primary ? (
                  <SvgText
                    x={point.x + size + 7}
                    y={point.y + 4}
                    fill={palette.textSecondary}
                    fontSize={11}
                    fontWeight="600"
                  >
                    {station.name}
                  </SvgText>
                ) : null}
              </G>
            );
          })}

          {userPoint ? (
            <G>
              <Circle cx={userPoint.x} cy={userPoint.y} r={13} fill={palette.info} opacity={0.16} />
              <Circle cx={userPoint.x} cy={userPoint.y} r={6} fill={palette.info} stroke={palette.surface} strokeWidth={2.4} />
            </G>
          ) : null}

          {markerPosition && train ? (
            <TrainMarker x={markerPosition.x} y={markerPosition.y} bearing={train.bearing} />
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}

function Graticule({ width, height, color }: { width: number; height: number; color: string }) {
  const step = 44;
  const lines: React.ReactNode[] = [];
  for (let x = step; x < width; x += step) {
    lines.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke={color} strokeWidth={0.5} opacity={0.5} />);
  }
  for (let y = step; y < height; y += step) {
    lines.push(<Line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke={color} strokeWidth={0.5} opacity={0.5} />);
  }
  return <G>{lines}</G>;
}

function toPath(points: Coordinate[], project: (c: Coordinate) => { x: number; y: number }): string | null {
  if (points.length < 2) return null;
  return points
    .map((point, index) => {
      const { x, y } = project(point);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}
