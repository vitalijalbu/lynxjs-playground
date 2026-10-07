import { type Locale, useLocale } from '../stores/preferences.js';
import { formatNumber } from '../lib/format.js';
import { ro, type TranslationKey } from './ro.js';
import { ru } from './ru.js';

export type { TranslationKey };

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { ro, ru };

type PluralForm = 0 | 1 | 2;

/**
 * Plural category → index into a `[one|few|many]` block. Lynx has no
 * `Intl.PluralRules`, so the two rules the app needs are spelled out:
 * - ro: 1 → one; 0 and x01–x19 → few; 20+ → many ("de" form).
 * - ru: x1 (not x11) → one; x2–x4 (not x12–x14) → few; else many.
 */
const pluralRules: Record<Locale, (n: number) => PluralForm> = {
  ro: (n) => {
    if (n === 1) return 0;
    const rest = n % 100;
    return n === 0 || (rest > 0 && rest < 20) ? 1 : 2;
  },
  ru: (n) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 0;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 1;
    return 2;
  },
};

export type TranslateParams = Record<string, string | number | null | undefined>;

/**
 * `{name}` interpolates a param (numbers are locale-formatted);
 * `[one|few|many]` picks the plural form for the `count` param.
 */
export function translate(locale: Locale, key: TranslationKey, params?: TranslateParams): string {
  const template = dictionaries[locale][key] ?? ro[key] ?? key;
  const count = typeof params?.count === 'number' ? params.count : undefined;

  const withPlurals =
    count === undefined
      ? template
      : template.replace(/\[([^\]]+)\]/g, (_match, forms: string) => {
          const options = forms.split('|');
          return options[pluralRules[locale](Math.abs(count))] ?? options[options.length - 1] ?? '';
        });

  if (!params) return withPlurals;
  return withPlurals.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    if (value === undefined || value === null) return match;
    return typeof value === 'number' ? formatNumber(value, locale) : value;
  });
}

export type Translate = (key: TranslationKey, params?: TranslateParams) => string;

export function useT(): { t: Translate; locale: Locale } {
  const locale = useLocale();
  return { t: (key, params) => translate(locale, key, params), locale };
}
