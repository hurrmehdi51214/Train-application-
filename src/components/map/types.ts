import { ViewStyle } from 'react-native';

import { Coordinate } from '@/types';

export interface MapMarker {
  id: string;
  coordinate: Coordinate;
  kind: 'station' | 'origin' | 'destination' | 'train' | 'user' | 'price';
  /** Station name, or the fare on a price pin. */
  label?: string;
  /** Bearing in degrees, for the train marker only. */
  bearing?: number;
  /** Dims a station the train has already passed. */
  passed?: boolean;
  selected?: boolean;
}

export interface MapProps {
  markers?: MapMarker[];
  /** The rail alignment, in travel order. */
  polyline?: Coordinate[];
  /** An on-foot route, drawn dashed. */
  walkingPath?: Coordinate[];
  height?: number;
  style?: ViewStyle;
  /** Extra points that must stay inside the viewport. */
  include?: Coordinate[];
  /** Pan and zoom. Off for the small map on a listing page. */
  interactive?: boolean;
  /** Shows Google's own controls where the platform has them. */
  showsUserLocation?: boolean;
  onMarkerPress?(id: string): void;
  onPress?(): void;
  /** Rounds the corners. Airbnb rounds every map it embeds. */
  rounded?: boolean;
}
