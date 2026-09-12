import { AmenityId, StationFacility } from '@/types';

/**
 * Amenity copy lives in one place so a coach description reads the same on the
 * seat picker, the live journey screen and the ticket.
 */
export const amenityMeta: Record<AmenityId, { label: string; detail: string; glyph: string }> = {
  wifi: { label: 'Wi-Fi', detail: 'Free onboard Wi-Fi, no login required', glyph: 'wifi' },
  power: { label: 'Power', detail: 'UK 3-pin socket at every seat', glyph: 'plug' },
  'usb-c': { label: 'USB-C', detail: '30W USB-C at every seat', glyph: 'usb' },
  table: { label: 'Tables', detail: 'Full-size tables in bays of four', glyph: 'table' },
  quiet: { label: 'Quiet coach', detail: 'No phone calls or loud audio', glyph: 'quiet' },
  catering: { label: 'Catering', detail: 'At-seat service on this coach', glyph: 'cup' },
  trolley: { label: 'Trolley', detail: 'Refreshment trolley passes through', glyph: 'trolley' },
  'bike-space': { label: 'Bike space', detail: 'Reservable cycle spaces', glyph: 'bike' },
  'wheelchair-space': { label: 'Wheelchair space', detail: 'Dedicated wheelchair bay', glyph: 'wheelchair' },
  'accessible-toilet': { label: 'Accessible WC', detail: 'Wheelchair-accessible toilet', glyph: 'wc' },
  'luggage-rack': { label: 'Luggage', detail: 'End-of-coach luggage stacks', glyph: 'luggage' },
  'air-conditioning': { label: 'Climate', detail: 'Air conditioned', glyph: 'climate' },
};

export const facilityMeta: Record<StationFacility, { label: string }> = {
  'step-free': { label: 'Step-free access' },
  toilets: { label: 'Toilets' },
  'baby-change': { label: 'Baby change' },
  'left-luggage': { label: 'Left luggage' },
  'taxi-rank': { label: 'Taxi rank' },
  'bike-racks': { label: 'Cycle parking' },
  'car-park': { label: 'Car park' },
  'ticket-office': { label: 'Ticket office' },
  'waiting-room': { label: 'Waiting room' },
};
