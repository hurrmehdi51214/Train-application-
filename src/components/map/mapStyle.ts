/**
 * Google Maps styling.
 *
 * A default Google map is loud: every petrol station, every road shield, six
 * shades of yellow. On a screen whose job is "where is my train", all of that
 * is noise competing with the one line that matters. This style strips the map
 * back to land, water, place names and the rail network, which is the same move
 * Airbnb makes on its own maps and for the same reason.
 *
 * Applied on native through `customMapStyle`; on web through `styles` in the
 * map options.
 */

type StyleRule = {
  featureType?: string;
  elementType?: string;
  stylers: Array<Record<string, string | number>>;
};

export const lightMapStyle: StyleRule[] = [
  { elementType: 'geometry', stylers: [{ color: '#F3F4F1' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#717171' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFFFF' }, { weight: 3 }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },

  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#3D3D3D' }] },

  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#E4F3EA' }, { visibility: 'on' }] },

  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#FAFAFA' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.local', stylers: [{ visibility: 'off' }] },

  // The one feature we actively want to see.
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#C2E4CF' }] },
  { featureType: 'transit.station.rail', elementType: 'labels.text.fill', stylers: [{ color: '#0A5C2C' }] },
  { featureType: 'transit.station', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },

  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#CFE3EC' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#8FA9B5' }] },
];

export const darkMapStyle: StyleRule[] = [
  { elementType: 'geometry', stylers: [{ color: '#1B1B1B' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#A8A8A8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#111111' }, { weight: 3 }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },

  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#D6D6D6' }] },

  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#16281D' }, { visibility: 'on' }] },

  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2A2A2A' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.local', stylers: [{ visibility: 'off' }] },

  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#0A5C2C' }] },
  { featureType: 'transit.station.rail', elementType: 'labels.text.fill', stylers: [{ color: '#4FAC7A' }] },
  { featureType: 'transit.station', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },

  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17313D' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4E6F7D' }] },
];
