import { useQueryClient } from '@tanstack/react-query';

import { dataKeys } from '../keys.js';
import type { BaseKey } from '../types.js';

/**
 * What to refetch after a write:
 * - `all`: every query of the provider.
 * - `resourceAll`: every query of the resource.
 * - `list`: list + infinite lists. `many`: batch reads. `detail`: the `id` record.
 */
export type InvalidationTarget = 'all' | 'resourceAll' | 'list' | 'many' | 'detail';

export interface InvalidateParams {
  resource?: string;
  id?: BaseKey;
  dataProviderName?: string;
  invalidates: InvalidationTarget[] | false;
}

export function useInvalidate() {
  const queryClient = useQueryClient();

  return async function invalidate({
    resource,
    id,
    dataProviderName = 'default',
    invalidates,
  }: InvalidateParams): Promise<void> {
    'background only';
    if (!invalidates) return;
    const keys: (readonly unknown[])[] = [];

    for (const target of invalidates) {
      if (target === 'all') {
        keys.push(dataKeys.all(dataProviderName));
        continue;
      }
      if (!resource) continue;
      switch (target) {
        case 'resourceAll':
          keys.push(dataKeys.resource(dataProviderName, resource));
          break;
        case 'list':
          keys.push(dataKeys.slice(dataProviderName, resource, 'list'));
          keys.push(dataKeys.slice(dataProviderName, resource, 'infinite'));
          break;
        case 'many':
          keys.push(dataKeys.slice(dataProviderName, resource, 'many'));
          break;
        case 'detail':
          if (id !== undefined) {
            keys.push([...dataKeys.slice(dataProviderName, resource, 'one'), String(id)]);
          }
          break;
      }
    }

    await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  };
}
