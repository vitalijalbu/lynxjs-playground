import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';

import { useDataProvider } from '../context.js';
import { dataKeys } from '../keys.js';
import type {
  BaseRecord,
  CrudFilters,
  CrudSorting,
  GetListResponse,
  HttpError,
  MetaQuery,
  Pagination,
} from '../types.js';

export interface UseListProps<TQueryFnData extends BaseRecord, TError, TData extends BaseRecord> {
  resource: string;
  pagination?: Pagination;
  sorters?: CrudSorting;
  filters?: CrudFilters;
  meta?: MetaQuery;
  dataProviderName?: string;
  queryOptions?: Omit<
    UseQueryOptions<GetListResponse<TQueryFnData>, TError, GetListResponse<TData>>,
    'queryKey' | 'queryFn'
  >;
}

export interface UseListReturn<TError, TData extends BaseRecord> {
  query: UseQueryResult<GetListResponse<TData>, TError>;
  result: {
    data: TData[];
    total: number | undefined;
    pageCount: number | undefined;
    extra: Record<string, unknown> | undefined;
  };
}

/** One page of a resource: `GET /{resource}` with filters, sorters and paging. */
export function useList<
  TQueryFnData extends BaseRecord = BaseRecord,
  TError = HttpError,
  TData extends BaseRecord = TQueryFnData,
>({
  resource,
  pagination,
  sorters,
  filters,
  meta,
  dataProviderName = 'default',
  queryOptions,
}: UseListProps<TQueryFnData, TError, TData>): UseListReturn<TError, TData> {
  const getProvider = useDataProvider();
  const params = { pagination, sorters, filters, meta };

  const query = useQuery<GetListResponse<TQueryFnData>, TError, GetListResponse<TData>>({
    queryKey: dataKeys.list(dataProviderName, resource, params),
    queryFn: () => {
      'background only';
      return getProvider(dataProviderName).getList<TQueryFnData>({ resource, ...params });
    },
    ...queryOptions,
  });

  return {
    query,
    result: {
      data: query.data?.data ?? [],
      total: query.data?.total,
      pageCount: query.data?.pageCount,
      extra: query.data?.extra,
    },
  };
}
