import type { Locale } from '../stores/preferences.js';

/**
 * Number/price formatting without `Intl` (not implemented in Lynx). Output
 * matches the web app's `ro-MD` / `ru-MD` Intl formats: `22.131 €` and
 * `22 131 €` (narrow no-break space).
 */
const GROUP_SEPARATOR: Record<Locale, string> = { ro: '.', ru: ' ' };
const DECIMAL_SEPARATOR: Record<Locale, string> = { ro: ',', ru: ',' };

export function formatNumber(value: number, locale: Locale, fractionDigits = 0): string {
  const negative = value < 0;
  const fixed = Math.abs(value).toFixed(fractionDigits);
  const [integer = '0', fraction] = fixed.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR[locale]);
  const body = fraction ? `${grouped}${DECIMAL_SEPARATOR[locale]}${fraction}` : grouped;
  return negative ? `-${body}` : body;
}

const CURRENCY_SYMBOL: Record<string, string> = { EUR: '€', USD: '$', MDL: 'MDL' };

/** The marketplace prices everything in EUR; USD/MDL are display conversions. */
export function formatPrice(amount: number, locale: Locale, currency = 'EUR'): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? currency;
  const number = formatNumber(Math.round(amount), locale);
  return currency === 'USD' ? `${symbol}${number}` : `${number} ${symbol}`;
}

export function formatKm(km: number, locale: Locale): string {
  if (km === 0) return 'Km 0';
  return `${formatNumber(km, locale)} ${locale === 'ru' ? 'км' : 'km'}`;
}

const KW_TO_HP = 1.35962;

export function formatPower(kw: number, locale: Locale): string {
  const hp = Math.round(kw * KW_TO_HP);
  return `${formatNumber(hp, locale)} ${locale === 'ru' ? 'л.с.' : 'CP'}`;
}

export function formatEngine(cc: number, locale: Locale): string {
  return `${formatNumber(cc, locale)} ${locale === 'ru' ? 'см³' : 'cm³'}`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export type RelativeTime =
  | { unit: 'justNow' }
  | { unit: 'minutes' | 'hours' | 'days' | 'months' | 'years'; count: number }
  | { unit: 'day' | 'month' | 'year' };

/** Buckets a past date the way the web app's "listed ago" label does. */
export function relativeTime(date: string | null | undefined, now = Date.now()): RelativeTime | null {
  if (!date) return null;
  const time = new Date(date).getTime();
  if (Number.isNaN(time)) return null;
  const diff = Math.max(0, now - time);

  if (diff < MINUTE) return { unit: 'justNow' };
  if (diff < HOUR) return { unit: 'minutes', count: Math.round(diff / MINUTE) };
  if (diff < DAY) return { unit: 'hours', count: Math.round(diff / HOUR) };
  const days = Math.round(diff / DAY);
  if (days === 1) return { unit: 'day' };
  if (days < 30) return { unit: 'days', count: days };
  const months = Math.round(days / 30);
  if (months === 1) return { unit: 'month' };
  if (months < 12) return { unit: 'months', count: months };
  const years = Math.round(days / 365);
  return years <= 1 ? { unit: 'year' } : { unit: 'years', count: years };
}

/** True for listings published in the last 24h ("Nou" badge). */
export function isNewListing(publishedAt: string | null | undefined, now = Date.now()): boolean {
  if (!publishedAt) return false;
  const time = new Date(publishedAt).getTime();
  return !Number.isNaN(time) && now - time < DAY;
}

/** "2025-06" → "2025". */
export function yearOf(value: string | null | undefined): string | null {
  return value ? value.slice(0, 4) : null;
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase() || '?';
}
