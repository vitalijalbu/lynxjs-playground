import { useInfiniteQuery } from '@tanstack/react-query';
import type {
  InfiniteData,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
} from '@tanstack/react-query';

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

type Pages<T extends BaseRecord> = InfiniteData<GetListResponse<T>, number>;

export interface UseInfiniteListProps<TQueryFnData extends BaseRecord, TError> {
  resource: string;
  /** `currentPage` is the first page loaded; `pageSize` applies to every page. */
  pagination?: Omit<Pagination, 'mode'>;
  sorters?: CrudSorting;
  filters?: CrudFilters;
  meta?: MetaQuery;
  dataProviderName?: string;
  queryOptions?: Omit<
    UseInfiniteQueryOptions<
      GetListResponse<TQueryFnData>,
      TError,
      Pages<TQueryFnData>,
      readonly unknown[],
      number
    >,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
  >;
}

export interface UseInfiniteListReturn<TError, TData extends BaseRecord> {
  query: UseInfiniteQueryResult<Pages<TData>, TError>;
  result: {
    /** Every loaded page flattened, in order. */
    data: TData[];
    total: number | undefined;
    /** Extras of the first page (e.g. search facets for the whole query). */
    extra: Record<string, unknown> | undefined;
    hasNextPage: boolean;
  };
}

/** Paged resource read for feeds: `fetchNextPage()` loads the following page. */
export function useInfiniteList<TQueryFnData extends BaseRecord = BaseRecord, TError = HttpError>({
  resource,
  pagination,
  sorters,
  filters,
  meta,
  dataProviderName = 'default',
  queryOptions,
}: UseInfiniteListProps<TQueryFnData, TError>): UseInfiniteListReturn<TError, TQueryFnData> {
  const getProvider = useDataProvider();
  const params = { pagination, sorters, filters, meta };

  const query = useInfiniteQuery<
    GetListResponse<TQueryFnData>,
    TError,
    Pages<TQueryFnData>,
    readonly unknown[],
    number
  >({
    queryKey: dataKeys.infinite(dataProviderName, resource, params),
    queryFn: ({ pageParam }) => {
      'background only';
      return getProvider(dataProviderName).getList<TQueryFnData>({
        resource,
        sorters,
        filters,
        meta,
        pagination: { ...pagination, currentPage: pageParam, mode: 'server' },
      });
    },
    initialPageParam: pagination?.currentPage ?? 1,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      if (lastPage.pageCount !== undefined) {
        return lastPageParam < lastPage.pageCount ? lastPageParam + 1 : undefined;
      }
      const loaded = allPages.reduce((sum, page) => sum + page.data.length, 0);
      return loaded < lastPage.total && lastPage.data.length > 0 ? lastPageParam + 1 : undefined;
    },
    ...queryOptions,
  });

  const pages = query.data?.pages ?? [];

  return {
    query,
    result: {
      data: pages.flatMap((page) => page.data),
      total: pages[0]?.total,
      extra: pages[0]?.extra,
      hasNextPage: query.hasNextPage,
    },
  };
}
