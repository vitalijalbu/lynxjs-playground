import { QueryClient } from '@tanstack/react-query';

import { API_URL } from '../config.js';
import { createHttpClient, createLaravelDataProvider } from '../data/index.js';
import type { HttpError } from '../data/index.js';
import { preferencesStore } from '../stores/preferences.js';

export const http = createHttpClient({
  baseURL: API_URL,
  // The API localises names (categories, fuel types...) from this header.
  headers: () => ({ 'X-Locale': preferencesStore.get().locale }),
});

export const dataProvider = createLaravelDataProvider({
  http,
  resources: {
    // IndexDealers reads plain `?q=&city_id=&verified=&sort=` params.
    dealers: { queryStyle: 'flat' },
  },
});

function isHttpError(error: unknown): error is HttpError {
  return Boolean(error && typeof error === 'object' && 'statusCode' in error);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The API response-caches public reads for 120s; match it.
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      // A 404 (sold/removed listing) will not fix itself on retry.
      retry: (failureCount, error) =>
        !(isHttpError(error) && error.statusCode >= 400 && error.statusCode < 500) &&
        failureCount < 2,
      refetchOnWindowFocus: false,
    },
  },
});

export { isHttpError };
