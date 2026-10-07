import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';

import { useDataProvider } from '../context.js';
import { dataKeys } from '../keys.js';
import type {
  BaseRecord,
  CrudFilters,
  CrudSorting,
  CustomMethod,
  CustomResponse,
  HttpError,
  MetaQuery,
} from '../types.js';

export interface UseCustomConfig<TQuery, TPayload> {
  filters?: CrudFilters;
  sorters?: CrudSorting;
  query?: TQuery;
  payload?: TPayload;
  headers?: Record<string, string>;
}

export interface UseCustomProps<TQueryFnData, TError, TQuery, TPayload, TData> {
  /** Path relative to the API url, or an absolute URL. */
  url: string;
  method: CustomMethod;
  config?: UseCustomConfig<TQuery, TPayload>;
  meta?: MetaQuery;
  dataProviderName?: string;
  queryOptions?: Omit<
    UseQueryOptions<CustomResponse<TQueryFnData>, TError, CustomResponse<TData>>,
    'queryKey' | 'queryFn'
  >;
}

export interface UseCustomReturn<TError, TData> {
  query: UseQueryResult<CustomResponse<TData>, TError>;
  result: { data: TData | undefined };
}

/** Any read that is not plain CRUD (home feed, counters, aggregates...). */
export function useCustom<
  TQueryFnData = BaseRecord,
  TError = HttpError,
  TQuery extends Record<string, unknown> = Record<string, unknown>,
  TPayload = unknown,
  TData = TQueryFnData,
>({
  url,
  method,
  config = {},
  meta,
  dataProviderName = 'default',
  queryOptions,
}: UseCustomProps<TQueryFnData, TError, TQuery, TPayload, TData>): UseCustomReturn<TError, TData> {
  const getProvider = useDataProvider();

  const query = useQuery<CustomResponse<TQueryFnData>, TError, CustomResponse<TData>>({
    queryKey: dataKeys.custom(dataProviderName, { url, method, ...config, meta }),
    queryFn: () => {
      'background only';
      const provider = getProvider(dataProviderName);
      if (!provider.custom) {
        throw new Error(`Data provider "${dataProviderName}" has no custom() method.`);
      }
      return provider.custom<TQueryFnData, TPayload>({ url, method, ...config, meta });
    },
    ...queryOptions,
  });

  return { query, result: { data: query.data?.data } };
}
