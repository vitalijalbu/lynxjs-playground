import { createStore, useSelector } from '@tanstack/react-store';

export type Locale = 'ro' | 'ru';
export type ThemeName = 'light' | 'dark';

export interface Preferences {
  locale: Locale;
  theme: ThemeName;
}

function initialTheme(): ThemeName {
  const appTheme = lynx.__globalProps?.appTheme;
  return appTheme === 'dark' ? 'dark' : 'light';
}

function initialLocale(): Locale {
  return lynx.__globalProps?.locale === 'ru' ? 'ru' : 'ro';
}

export const preferencesStore = createStore<Preferences>({
  locale: initialLocale(),
  theme: initialTheme(),
});

export function setLocale(locale: Locale): void {
  preferencesStore.setState((state) => ({ ...state, locale }));
}

export function setTheme(theme: ThemeName): void {
  preferencesStore.setState((state) => ({ ...state, theme }));
}

export function useLocale(): Locale {
  return useSelector(preferencesStore, (state) => state.locale);
}

export function useThemeName(): ThemeName {
  return useSelector(preferencesStore, (state) => state.theme);
}
