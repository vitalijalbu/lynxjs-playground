import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';

import { useDataProvider } from '../context.js';
import { dataKeys } from '../keys.js';
import type { BaseKey, BaseRecord, GetOneResponse, HttpError, MetaQuery } from '../types.js';

export interface UseOneProps<TQueryFnData extends BaseRecord, TError, TData extends BaseRecord> {
  resource: string;
  /** The query stays idle while `id` is undefined or empty. */
  id?: BaseKey;
  meta?: MetaQuery;
  dataProviderName?: string;
  queryOptions?: Omit<
    UseQueryOptions<GetOneResponse<TQueryFnData>, TError, GetOneResponse<TData>>,
    'queryKey' | 'queryFn'
  >;
}

export interface UseOneReturn<TError, TData extends BaseRecord> {
  query: UseQueryResult<GetOneResponse<TData>, TError>;
  result: TData | undefined;
}

/** One record: `GET /{resource}/{id}`. */
export function useOne<
  TQueryFnData extends BaseRecord = BaseRecord,
  TError = HttpError,
  TData extends BaseRecord = TQueryFnData,
>({
  resource,
  id,
  meta,
  dataProviderName = 'default',
  queryOptions,
}: UseOneProps<TQueryFnData, TError, TData>): UseOneReturn<TError, TData> {
  const getProvider = useDataProvider();
  const hasId = id !== undefined && id !== '';

  const query = useQuery<GetOneResponse<TQueryFnData>, TError, GetOneResponse<TData>>({
    queryKey: dataKeys.one(dataProviderName, resource, id ?? '', meta),
    queryFn: () => {
      'background only';
      return getProvider(dataProviderName).getOne<TQueryFnData>({
        resource,
        id: id as BaseKey,
        meta,
      });
    },
    ...queryOptions,
    enabled: hasId && (queryOptions?.enabled ?? true),
  });

  return { query, result: query.data?.data };
}
