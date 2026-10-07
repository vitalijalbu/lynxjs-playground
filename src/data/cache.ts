import type { QueryClient, QueryKey } from '@tanstack/react-query';

import { dataKeys } from './keys.js';
import type { BaseKey, BaseRecord } from './types.js';

/** Every cached query of a resource, captured to roll back an optimistic write. */
export type ResourceSnapshot = [QueryKey, unknown][];

export function snapshotResource(
  queryClient: QueryClient,
  provider: string,
  resource: string,
): ResourceSnapshot {
  return queryClient.getQueriesData({ queryKey: dataKeys.resource(provider, resource) });
}

export function restoreSnapshot(queryClient: QueryClient, snapshot: ResourceSnapshot): void {
  for (const [queryKey, data] of snapshot) queryClient.setQueryData(queryKey, data);
}

type Change = { kind: 'patch'; values: Record<string, unknown> } | { kind: 'remove' };

interface ListShape {
  data: BaseRecord[];
  total?: number;
}

interface InfiniteShape {
  pages: ListShape[];
  pageParams: unknown[];
}

/**
 * Applies a write to every cached read of the resource (lists, infinite
 * lists, batches and detail records) before the server confirms it.
 */
export async function applyOptimisticChange(
  queryClient: QueryClient,
  provider: string,
  resource: string,
  ids: BaseKey[],
  change: Change,
): Promise<void> {
  await queryClient.cancelQueries({ queryKey: dataKeys.resource(provider, resource) });

  const targets = new Set(ids.map(String));
  const matches = (record: BaseRecord) => record?.id !== undefined && targets.has(String(record.id));

  const mapList = (list: ListShape): ListShape => {
    if (change.kind === 'remove') {
      const data = list.data.filter((record) => !matches(record));
      const removed = list.data.length - data.length;
      return { ...list, data, total: list.total === undefined ? undefined : list.total - removed };
    }
    return {
      ...list,
      data: list.data.map((record) => (matches(record) ? { ...record, ...change.values } : record)),
    };
  };

  for (const slice of ['list', 'many'] as const) {
    queryClient.setQueriesData<ListShape>(
      { queryKey: dataKeys.slice(provider, resource, slice) },
      (old) => (old ? mapList(old) : old),
    );
  }

  queryClient.setQueriesData<InfiniteShape>(
    { queryKey: dataKeys.slice(provider, resource, 'infinite') },
    (old) => (old ? { ...old, pages: old.pages.map(mapList) } : old),
  );

  if (change.kind === 'patch') {
    for (const id of targets) {
      queryClient.setQueriesData<{ data: BaseRecord }>(
        { queryKey: [...dataKeys.slice(provider, resource, 'one'), id] },
        (old) => (old ? { ...old, data: { ...old.data, ...change.values } } : old),
      );
    }
  }
}
