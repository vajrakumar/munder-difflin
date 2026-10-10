/** Date helpers for the Paper screens. Intl only, no date library. */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "now", "4m", "3h", "Tue", "12 Oct" — the list-row stamp. */
export function shortStamp(iso: string, now = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const diff = now - t;
  if (diff < MIN) return 'now';
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m`;
  if (t >= startOfDay(new Date(now))) return `${Math.floor(diff / HOUR)}h`;
  if (diff < 6 * DAY) return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(t);
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(t);
}

/** "4 minutes ago" for tooltips and detail meta. */
export function relative(iso: string | undefined, now = Date.now()): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const diff = t - now;
  const abs = Math.abs(diff);
  if (abs < MIN) return rtf.format(Math.round(diff / 1000), 'second');
  if (abs < HOUR) return rtf.format(Math.round(diff / MIN), 'minute');
  if (abs < DAY) return rtf.format(Math.round(diff / HOUR), 'hour');
  return rtf.format(Math.round(diff / DAY), 'day');
}

export function fullStamp(iso: string | undefined): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(t);
}

/** Day bucket label for grouped lists: Today, Yesterday, or a date. */
export function dayLabel(iso: string, now = Date.now()): string {
  const t = Date.parse(iso);
  const today = startOfDay(new Date(now));
  if (t >= today) return 'Today';
  if (t >= today - DAY) return 'Yesterday';
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'short' }).format(t);
}

export const MS = { MIN, HOUR, DAY };
