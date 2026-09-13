import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { config } from '@/services/config';
import { canRenderMaps } from '@/services/googleMaps';
import { boundsOf } from '@/utils/geo';
import { MapProps } from './types';
import { VectorMap } from './VectorMap';
import { darkMapStyle, lightMapStyle } from './mapStyle';

/**
 * Google Maps in the browser.
 *
 * `react-native-maps` has no web implementation, so the web build talks to the
 * Maps JavaScript API directly. The loader below is deliberately small: one
 * script tag, one shared promise so a screen with three maps on it loads the
 * SDK once, and a hard fall back to the vector map if the key is absent or the
 * script fails.
 */

let loader: Promise<boolean> | null = null;

function loadMapsSdk(apiKey: string): Promise<boolean> {
  if (loader) return loader;

  loader = new Promise<boolean>((resolve) => {
    if (typeof document === 'undefined') return resolve(false);
    const globalAny = window as unknown as { google?: { maps?: unknown } };
    if (globalAny.google?.maps) return resolve(true);

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=geometry&loading=async`;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return loader;
}

export function Map({
  markers = [],
  polyline = [],
  walkingPath = [],
  height = 220,
  style,
  include = [],
  interactive = true,
  onMarkerPress,
  rounded = true,
}: MapProps) {
  const { palette, radius, isDark } = useTheme();
  const container = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(!canRenderMaps());

  const bounds = useMemo(() => {
    const points = [...polyline, ...walkingPath, ...markers.map((m) => m.coordinate), ...include];
    return boundsOf(points, 0.2);
  }, [polyline, walkingPath, markers, include]);

  useEffect(() => {
    if (!canRenderMaps()) return;
    let cancelled = false;
    void loadMapsSdk(config.googleMapsApiKey).then((ok) => {
      if (cancelled) return;
      if (!ok) setFailed(true);
      else setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !container.current) return;

    const maps = (window as unknown as { google: any }).google.maps;
    const map = new maps.Map(container.current, {
      center: { lat: (bounds.minLat + bounds.maxLat) / 2, lng: (bounds.minLon + bounds.maxLon) / 2 },
      zoom: 6,
      styles: isDark ? darkMapStyle : lightMapStyle,
      disableDefaultUI: true,
      gestureHandling: interactive ? 'greedy' : 'none',
      keyboardShortcuts: false,
      clickableIcons: false,
    });

    map.fitBounds(
      new maps.LatLngBounds(
        { lat: bounds.minLat, lng: bounds.minLon },
        { lat: bounds.maxLat, lng: bounds.maxLon },
      ),
      24,
    );

    const overlays: any[] = [];

    if (polyline.length > 1) {
      const path = polyline.map((p) => ({ lat: p.lat, lng: p.lon }));
      overlays.push(
        new maps.Polyline({ path, map, strokeColor: palette.surface, strokeWeight: 7, strokeOpacity: 1, zIndex: 1 }),
        new maps.Polyline({ path, map, strokeColor: palette.mapRail, strokeWeight: 4, strokeOpacity: 1, zIndex: 2 }),
      );
    }

    if (walkingPath.length > 1) {
      overlays.push(
        new maps.Polyline({
          path: walkingPath.map((p) => ({ lat: p.lat, lng: p.lon })),
          map,
          strokeOpacity: 0,
          zIndex: 3,
          icons: [
            {
              icon: { path: maps.SymbolPath.CIRCLE, scale: 2.2, fillColor: palette.textSecondary, fillOpacity: 1, strokeOpacity: 0 },
              offset: '0',
              repeat: '12px',
            },
          ],
        }),
      );
    }

    for (const marker of markers) {
      const position = { lat: marker.coordinate.lat, lng: marker.coordinate.lon };

      if (marker.kind === 'price') {
        // Airbnb's price pill, as an SVG data URI so it themes with the app.
        const fill = marker.selected ? palette.textPrimary : palette.surface;
        const text = marker.selected ? palette.surface : palette.textPrimary;
        const width = 22 + (marker.label?.length ?? 3) * 7.4;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="34">
            <rect x="0.5" y="0.5" rx="15" width="${width - 1}" height="27" fill="${fill}" stroke="${palette.border}"/>
            <text x="${width / 2}" y="18" font-family="Manrope, sans-serif" font-size="12" font-weight="700"
                  fill="${text}" text-anchor="middle">${marker.label ?? ''}</text>
          </svg>`;
        overlays.push(
          new maps.Marker({
            position,
            map,
            icon: { url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`, anchor: new maps.Point(width / 2, 32) },
            zIndex: marker.selected ? 20 : 10,
          }),
        );
      } else {
        const major = marker.kind === 'origin' || marker.kind === 'destination';
        overlays.push(
          new maps.Marker({
            position,
            map,
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: major ? 8 : 5,
              fillColor: marker.passed ? palette.mapRail : palette.surface,
              fillOpacity: 1,
              strokeColor: marker.kind === 'train' ? palette.brandStrong : palette.mapRail,
              strokeWeight: major ? 3.5 : 2.5,
            },
            title: marker.label,
            zIndex: marker.kind === 'train' ? 30 : 5,
          }),
        );
      }

      overlays[overlays.length - 1].addListener?.('click', () => onMarkerPress?.(marker.id));
    }

    return () => {
      for (const overlay of overlays) overlay.setMap?.(null);
    };
  }, [ready, bounds, polyline, walkingPath, markers, isDark, interactive, onMarkerPress, palette]);

  if (failed) {
    return (
      <VectorMap
        markers={markers}
        polyline={polyline}
        walkingPath={walkingPath}
        height={height}
        style={style}
        include={include}
        rounded={rounded}
      />
    );
  }

  return (
    <View
      style={[
        { height, borderRadius: rounded ? radius.md : 0, overflow: 'hidden', backgroundColor: palette.mapLand },
        style,
      ]}
    >
      {/* react-native-web renders View as a div, so a ref gives a real element. */}
      <View
        // @ts-expect-error react-native-web forwards the ref to the underlying div
        ref={container}
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
}
