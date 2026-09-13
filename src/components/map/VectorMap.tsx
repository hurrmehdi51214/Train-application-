import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { Coordinate } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';
import { boundsOf, projector } from '@/utils/geo';
import { MapProps } from './types';
import { TrainPin } from './TrainPin';

/**
 * The offline map.
 *
 * This is what draws when there is no Google Maps key configured, and - more
 * importantly - when there is no signal. It renders the route from vector
 * geometry the app already has on disk: a few kilobytes for the whole network,
 * one frame to draw, and identical behaviour with the radio off.
 *
 * It is not a replacement for Google Maps and does not try to be. There are no
 * streets on it. Its job is to answer "where is my train on this route" in a
 * tunnel, which is the one map question that cannot wait for a network.
 */
export function VectorMap({
  markers = [],
  polyline = [],
  walkingPath = [],
  height = 220,
  style,
  include = [],
  rounded = true,
}: MapProps) {
  const { palette, radius } = useTheme();
  const [width, setWidth] = useState(0);

  const project = useMemo(() => {
    const points = [
      ...polyline,
      ...walkingPath,
      ...markers.map((m) => m.coordinate),
      ...include,
    ];
    return projector(boundsOf(points, 0.14), Math.max(1, width), height);
  }, [polyline, walkingPath, markers, include, width, height]);

  const routePath = useMemo(() => toPath(polyline, project), [polyline, project]);
  const walkPath = useMemo(() => toPath(walkingPath, project), [walkingPath, project]);

  const train = markers.find((m) => m.kind === 'train');
  const trainPoint = train ? project(train.coordinate) : null;

  // Smooth the train between feed updates so it glides rather than teleports.
  const glideX = useRef(new Animated.Value(trainPoint?.x ?? 0)).current;
  const glideY = useRef(new Animated.Value(trainPoint?.y ?? 0)).current;
  const [glided, setGlided] = useState(trainPoint);

  useEffect(() => {
    if (!trainPoint) return;
    const sx = glideX.addListener(({ value }) => setGlided((p) => ({ x: value, y: p?.y ?? trainPoint.y })));
    const sy = glideY.addListener(({ value }) => setGlided((p) => ({ x: p?.x ?? trainPoint.x, y: value })));
    Animated.parallel([
      Animated.timing(glideX, { toValue: trainPoint.x, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      Animated.timing(glideY, { toValue: trainPoint.y, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    ]).start();
    return () => {
      glideX.removeListener(sx);
      glideY.removeListener(sy);
    };
  }, [trainPoint?.x, trainPoint?.y, glideX, glideY]);

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel="Route map"
      style={[
        {
          height,
          backgroundColor: palette.mapLand,
          borderRadius: rounded ? radius.md : 0,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Rect x={0} y={0} width={width} height={height} fill={palette.mapLand} />
          <Graticule width={width} height={height} color={palette.border} />

          {/* The rail, cased so it stays readable over the grid. */}
          {routePath ? (
            <>
              <Path d={routePath} stroke={palette.mapLand} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <Path d={routePath} stroke={palette.mapRail} strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </>
          ) : null}

          {walkPath ? (
            <Path d={walkPath} stroke={palette.textSecondary} strokeWidth={3} strokeDasharray="1 7" strokeLinecap="round" fill="none" />
          ) : null}

          {markers
            .filter((m) => m.kind !== 'train')
            .map((marker) => {
              const point = project(marker.coordinate);
              const major = marker.kind === 'origin' || marker.kind === 'destination';
              const r = major ? 6 : 3.5;
              if (marker.kind === 'user') {
                return (
                  <G key={marker.id}>
                    <Circle cx={point.x} cy={point.y} r={12} fill={palette.info} opacity={0.18} />
                    <Circle cx={point.x} cy={point.y} r={5.5} fill={palette.info} stroke={palette.surface} strokeWidth={2.4} />
                  </G>
                );
              }
              return (
                <G key={marker.id}>
                  <Circle cx={point.x} cy={point.y} r={r + 3} fill={palette.mapLand} />
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r={r}
                    fill={marker.passed ? palette.mapRail : palette.surface}
                    stroke={palette.mapRail}
                    strokeWidth={major ? 2.6 : 2}
                  />
                  {major && marker.label ? (
                    <SvgText
                      x={point.x + r + 6}
                      y={point.y + 4}
                      fill={palette.textSecondary}
                      fontSize={11}
                      fontWeight="600"
                    >
                      {marker.label}
                    </SvgText>
                  ) : null}
                </G>
              );
            })}

          {glided && train ? <TrainPin x={glided.x} y={glided.y} bearing={train.bearing ?? 0} /> : null}
        </Svg>
      ) : null}
    </View>
  );
}

function Graticule({ width, height, color }: { width: number; height: number; color: string }) {
  const step = 48;
  const lines: React.ReactNode[] = [];
  for (let x = step; x < width; x += step) {
    lines.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke={color} strokeWidth={0.5} opacity={0.6} />);
  }
  for (let y = step; y < height; y += step) {
    lines.push(<Line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke={color} strokeWidth={0.5} opacity={0.6} />);
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
