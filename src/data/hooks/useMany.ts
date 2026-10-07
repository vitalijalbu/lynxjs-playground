import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';

import { useDataProvider } from '../context.js';
import { dataKeys } from '../keys.js';
import type { BaseKey, BaseRecord, GetManyResponse, HttpError, MetaQuery } from '../types.js';

export interface UseManyProps<TQueryFnData extends BaseRecord, TError, TData extends BaseRecord> {
  resource: string;
  ids: BaseKey[];
  meta?: MetaQuery;
  dataProviderName?: string;
  queryOptions?: Omit<
    UseQueryOptions<GetManyResponse<TQueryFnData>, TError, GetManyResponse<TData>>,
    'queryKey' | 'queryFn'
  >;
}

export interface UseManyReturn<TError, TData extends BaseRecord> {
  query: UseQueryResult<GetManyResponse<TData>, TError>;
  result: { data: TData[] };
}

/**
 * Several records by id. Uses the provider's `getMany` when it has one,
 * otherwise fans out to `getOne` in parallel.
 */
export function useMany<
  TQueryFnData extends BaseRecord = BaseRecord,
  TError = HttpError,
  TData extends BaseRecord = TQueryFnData,
>({
  resource,
  ids,
  meta,
  dataProviderName = 'default',
  queryOptions,
}: UseManyProps<TQueryFnData, TError, TData>): UseManyReturn<TError, TData> {
  const getProvider = useDataProvider();

  const query = useQuery<GetManyResponse<TQueryFnData>, TError, GetManyResponse<TData>>({
    queryKey: dataKeys.many(dataProviderName, resource, ids, meta),
    queryFn: async () => {
      'background only';
      const provider = getProvider(dataProviderName);
      if (provider.getMany) return provider.getMany<TQueryFnData>({ resource, ids, meta });
      const records = await Promise.all(
        ids.map((id) => provider.getOne<TQueryFnData>({ resource, id, meta })),
      );
      return { data: records.map((record) => record.data) };
    },
    ...queryOptions,
    enabled: ids.length > 0 && (queryOptions?.enabled ?? true),
  });

  return { query, result: { data: query.data?.data ?? [] } };
}
