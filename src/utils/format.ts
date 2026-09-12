import type { CrowdingLevel, TransitMode } from '@/types';

export function money(minor: number, currency = 'GBP', locale = 'en-GB'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}

export const crowdingCopy: Record<CrowdingLevel, { label: string; detail: string }> = {
  empty: { label: 'Empty', detail: 'Plenty of space, pick any seat' },
  light: { label: 'Quiet', detail: 'Seats free throughout' },
  moderate: { label: 'Filling', detail: 'Most seats taken, some pairs free' },
  busy: { label: 'Busy', detail: 'Standing in places' },
  full: { label: 'Very busy', detail: 'Standing room only' },
};

export const modeCopy: Record<TransitMode, string> = {
  bus: 'Bus',
  tram: 'Tram',
  metro: 'Metro',
  ferry: 'Ferry',
  bike: 'Cycle hire',
  scooter: 'E-scooter',
  taxi: 'Taxi',
  walk: 'Walk',
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

/** Groups a ticket reference into readable quads: AB12CD34 -> AB12 CD34 */
export function groupReference(reference: string, size = 4): string {
  return reference.replace(new RegExp(`(.{${size}})`, 'g'), '$1 ').trim();
}

export function pluralise(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}
