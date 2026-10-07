import type { BaseKey, CrudFilters, CrudSorting, MetaQuery, Pagination } from './types.js';

/**
 * Query keys are hierarchical so invalidation can target a whole provider, a
 * resource, or one slice of it:
 *
 *   ['data', provider]
 *   ['data', provider, resource]
 *   ['data', provider, resource, 'list' | 'infinite' | 'many' | 'one', ...]
 *   ['data', provider, 'custom', ...]
 */
export interface ListKeyParams {
  pagination?: Pagination;
  sorters?: CrudSorting;
  filters?: CrudFilters;
  meta?: MetaQuery;
}

export type ResourceSlice = 'list' | 'infinite' | 'many' | 'one';

export const dataKeys = {
  all: (provider: string) => ['data', provider] as const,
  resource: (provider: string, resource: string) => ['data', provider, resource] as const,
  slice: (provider: string, resource: string, slice: ResourceSlice) =>
    ['data', provider, resource, slice] as const,
  list: (provider: string, resource: string, params: ListKeyParams) =>
    ['data', provider, resource, 'list', params] as const,
  infinite: (provider: string, resource: string, params: ListKeyParams) =>
    ['data', provider, resource, 'infinite', params] as const,
  many: (provider: string, resource: string, ids: BaseKey[], meta?: MetaQuery) =>
    ['data', provider, resource, 'many', ids.map(String), meta ?? {}] as const,
  one: (provider: string, resource: string, id: BaseKey, meta?: MetaQuery) =>
    ['data', provider, resource, 'one', String(id), meta ?? {}] as const,
  custom: (provider: string, params: Record<string, unknown>) =>
    ['data', provider, 'custom', params] as const,
};
