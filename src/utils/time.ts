import type { Iso8601 } from '@/types';

export const MINUTE = 60_000;

export function parse(iso: Iso8601 | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function clockTime(iso: Iso8601 | null | undefined, locale = 'en-GB'): string {
  const d = parse(iso);
  if (!d) return '--:--';
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function dayLabel(iso: Iso8601 | null | undefined, locale = 'en-GB'): string {
  const d = parse(iso);
  if (!d) return '';
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(d) - startOf(today)) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function minutesBetween(from: Iso8601 | Date, to: Iso8601 | Date): number {
  const a = from instanceof Date ? from : parse(from);
  const b = to instanceof Date ? to : parse(to);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / MINUTE);
}

export function durationLabel(minutes: number): string {
  const sign = minutes < 0 ? '-' : '';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m}m`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}m`;
}

/**
 * "in 4 min", "now", "6 min ago". Deliberately coarse: a countdown that ticks
 * every second on a platform display is stressful, not useful.
 */
export function relativeLabel(iso: Iso8601 | null | undefined, now = new Date()): string {
  const d = parse(iso);
  if (!d) return '';
  const mins = Math.round((d.getTime() - now.getTime()) / MINUTE);
  if (mins === 0) return 'now';
  if (mins > 0) return mins < 60 ? `in ${mins} min` : `in ${durationLabel(mins)}`;
  const past = Math.abs(mins);
  return past < 60 ? `${past} min ago` : `${durationLabel(past)} ago`;
}

/** Delay copy used everywhere, so "on time" is phrased identically app-wide. */
export function delayLabel(delayMinutes: number): string {
  // A minute either side is rounding, not a delay. Calling it out makes every
  // train look late and teaches people to ignore the field entirely.
  if (Math.abs(delayMinutes) <= 1) return 'On time';
  if (delayMinutes < 0) return `${Math.abs(delayMinutes)} min early`;
  return `${delayMinutes} min late`;
}
