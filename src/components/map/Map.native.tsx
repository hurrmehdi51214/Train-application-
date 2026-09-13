import React, { useMemo, useRef } from 'react';
import { View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';

import { useTheme } from '@/theme/ThemeProvider';
import { canRenderMaps } from '@/services/googleMaps';
import { boundsOf } from '@/utils/geo';
import { MapProps } from './types';
import { VectorMap } from './VectorMap';
import { darkMapStyle, lightMapStyle } from './mapStyle';
import { StationPin, TrainMarkerBubble, PricePin } from './Pins';

/**
 * Google Maps on iOS and Android.
 *
 * Falls back to the bundled vector map whenever no Maps SDK key is configured,
 * so the app is fully usable out of the box and degrades to something honest
 * rather than to a grey rectangle with a watermark.
 */
export function Map({
  markers = [],
  polyline = [],
  walkingPath = [],
  height = 220,
  style,
  include = [],
  interactive = true,
  showsUserLocation = false,
  onMarkerPress,
  rounded = true,
}: MapProps) {
  const { palette, radius, isDark } = useTheme();
  const mapRef = useRef<MapView>(null);

  const region = useMemo<Region>(() => {
    const points = [...polyline, ...walkingPath, ...markers.map((m) => m.coordinate), ...include];
    const bounds = boundsOf(points, 0.2);
    return {
      latitude: (bounds.minLat + bounds.maxLat) / 2,
      longitude: (bounds.minLon + bounds.maxLon) / 2,
      latitudeDelta: Math.max(0.02, bounds.maxLat - bounds.minLat),
      longitudeDelta: Math.max(0.02, bounds.maxLon - bounds.minLon),
    };
  }, [polyline, walkingPath, markers, include]);

  if (!canRenderMaps()) {
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
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={region}
        customMapStyle={isDark ? darkMapStyle : lightMapStyle}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {polyline.length > 1 ? (
          <>
            {/* Cased, so the route stays legible over any basemap colour. */}
            <Polyline
              coordinates={polyline.map((p) => ({ latitude: p.lat, longitude: p.lon }))}
              strokeColor={palette.surface}
              strokeWidth={7}
            />
            <Polyline
              coordinates={polyline.map((p) => ({ latitude: p.lat, longitude: p.lon }))}
              strokeColor={palette.mapRail}
              strokeWidth={4}
            />
          </>
        ) : null}

        {walkingPath.length > 1 ? (
          <Polyline
            coordinates={walkingPath.map((p) => ({ latitude: p.lat, longitude: p.lon }))}
            strokeColor={palette.textSecondary}
            strokeWidth={3}
            lineDashPattern={[1, 8]}
          />
        ) : null}

        {markers.map((marker) => (
          <Marker
            key={marker.id}
            identifier={marker.id}
            coordinate={{ latitude: marker.coordinate.lat, longitude: marker.coordinate.lon }}
            onPress={() => onMarkerPress?.(marker.id)}
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: marker.kind === 'price' ? 1 : 0.5 }}
          >
            {marker.kind === 'train' ? (
              <TrainMarkerBubble bearing={marker.bearing ?? 0} />
            ) : marker.kind === 'price' ? (
              <PricePin label={marker.label ?? ''} selected={marker.selected} />
            ) : (
              <StationPin kind={marker.kind} passed={marker.passed} />
            )}
          </Marker>
        ))}
      </MapView>
    </View>
  );
}
