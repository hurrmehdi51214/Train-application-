import type { CrowdingLevel, TravelClass } from '@/types';

/**
 * Money.
 *
 * Everything is stored in paisa (1/100 PKR) so nothing that touches a fare is
 * ever a float. Pakistani fares are always whole rupees, so the default drops
 * the decimals entirely - "PKR 5,150" rather than "PKR 5,150.00".
 */
export function money(minor: number, options: { compact?: boolean } = {}): string {
  const rupees = Math.round(minor / 100);
  if (options.compact && rupees >= 1000) {
    const thousands = rupees / 1000;
    return `Rs ${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}k`;
  }
  return `Rs ${rupees.toLocaleString('en-PK')}`;
}

/** Just the digits, for a price pin on a map where "Rs" is wasted space. */
export function moneyShort(minor: number): string {
  const rupees = Math.round(minor / 100);
  return rupees >= 1000 ? `${(rupees / 1000).toFixed(rupees % 1000 === 0 ? 0 : 1)}k` : String(rupees);
}

export const crowdingCopy: Record<CrowdingLevel, { label: string; detail: string }> = {
  empty: { label: 'Wide open', detail: 'Barely booked, pick any berth' },
  light: { label: 'Quiet', detail: 'Plenty left across the coach' },
  moderate: { label: 'Filling up', detail: 'About half gone' },
  busy: { label: 'Busy', detail: 'Going fast, book soon' },
  full: { label: 'Almost gone', detail: 'Only a handful left' },
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

/** PNRs read aloud at counters, so group them: ABC1234567 -> ABC 123 4567 */
export function groupPnr(pnr: string): string {
  return pnr.replace(/^(.{3})(.{3})(.*)$/, '$1 $2 $3').trim();
}

export function pluralise(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Berth wording differs by class: a seat is a seat, a berth is a berth. */
export function berthNoun(travelClass: TravelClass): string {
  return travelClass === 'economy' || travelClass === 'ac-business' || travelClass === 'parlour'
    ? 'seat'
    : 'berth';
}
