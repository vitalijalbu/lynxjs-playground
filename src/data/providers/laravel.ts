import type { HttpClient, QueryParams } from '../http.js';
import type {
  BaseRecord,
  CreateParams,
  CreateResponse,
  CrudFilters,
  CrudSorting,
  CustomParams,
  CustomResponse,
  DataProvider,
  DeleteOneParams,
  DeleteOneResponse,
  GetListParams,
  GetListResponse,
  GetOneParams,
  GetOneResponse,
  MetaQuery,
  UpdateParams,
  UpdateResponse,
} from '../types.js';

/**
 * How a Laravel endpoint reads its query string:
 * - `spatie`: spatie/laravel-query-builder — `filter[key]=v`, `sort=-field`.
 * - `flat`: hand-rolled index actions — `key=v`, `sort=name`.
 */
export type QueryStyle = 'spatie' | 'flat';

export interface ResourceConfig {
  queryStyle?: QueryStyle;
  /** HTTP verb used by `update` (Laravel routes mix PATCH and PUT). */
  updateMethod?: 'patch' | 'put';
}

export interface LaravelProviderOptions {
  http: HttpClient;
  /** Per-resource dialect; resources not listed use `spatie`. */
  resources?: Record<string, ResourceConfig>;
}

/**
 * `meta` keys understood by this provider (all optional):
 * - `queryStyle`: overrides the resource dialect for one call.
 * - `query`: raw extra query params, e.g. `{ facets: 1 }`.
 * - `method`: overrides the HTTP verb of a mutation.
 */
interface LaravelMeta {
  queryStyle?: QueryStyle;
  query?: QueryParams;
  method?: 'post' | 'put' | 'patch' | 'delete';
}

interface LaravelPaginated<T> {
  data: T[];
  meta?: { total?: number; last_page?: number; current_page?: number };
  links?: unknown;
  [key: string]: unknown;
}

function readMeta(meta?: MetaQuery): LaravelMeta {
  return (meta ?? {}) as LaravelMeta;
}

/**
 * Detail endpoints are inconsistent about the JSON:API-style `data` envelope
 * (listings/dealers answer bare, some resources wrap). A record carries its
 * own `id`; an envelope does not.
 */
function unwrap<T>(body: unknown): T {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const record = body as Record<string, unknown>;
    if ('data' in record && !('id' in record)) return record.data as T;
  }
  return body as T;
}

function filterKey(field: string, style: QueryStyle): string {
  return style === 'spatie' ? `filter[${field}]` : field;
}

/**
 * CRUD operators → the API's range convention (`price_min` / `price_max`),
 * multi-values as comma lists, everything else as an exact match.
 */
function serializeFilters(filters: CrudFilters = [], style: QueryStyle): QueryParams {
  const query: QueryParams = {};
  const set = (field: string, value: unknown) => {
    if (value === undefined || value === null || value === '') return;
    query[filterKey(field, style)] = Array.isArray(value)
      ? value.join(',')
      : (value as string | number | boolean);
  };

  for (const { field, operator, value } of filters) {
    switch (operator) {
      case 'eq':
      case 'contains':
      case 'in':
        set(field, Array.isArray(value) && value.length === 0 ? undefined : value);
        break;
      case 'gte':
        set(`${field}_min`, value);
        break;
      case 'lte':
        set(`${field}_max`, value);
        break;
      case 'between': {
        const [min, max] = (Array.isArray(value) ? value : []) as unknown[];
        set(`${field}_min`, min);
        set(`${field}_max`, max);
        break;
      }
    }
  }
  return query;
}

function serializeSorters(sorters: CrudSorting = [], style: QueryStyle): QueryParams {
  if (sorters.length === 0) return {};
  if (style === 'flat') return { sort: sorters[0]?.field };
  return {
    sort: sorters.map(({ field, order }) => (order === 'desc' ? `-${field}` : field)).join(','),
  };
}

export function createLaravelDataProvider({
  http,
  resources = {},
}: LaravelProviderOptions): DataProvider {
  const styleFor = (resource: string, meta?: MetaQuery): QueryStyle =>
    readMeta(meta).queryStyle ?? resources[resource]?.queryStyle ?? 'spatie';

  const path = (resource: string, id?: string | number) =>
    id === undefined ? resource : `${resource}/${encodeURIComponent(String(id))}`;

  return {
    getApiUrl: () => http.baseURL,

    async getList<TData extends BaseRecord = BaseRecord>({
      resource,
      pagination,
      sorters,
      filters,
      meta,
    }: GetListParams): Promise<GetListResponse<TData>> {
      'background only';
      const style = styleFor(resource, meta);
      const paged = pagination?.mode !== 'off';

      const body = await http.request<LaravelPaginated<TData> | TData[]>({
        url: path(resource),
        query: {
          ...serializeFilters(filters, style),
          ...serializeSorters(sorters, style),
          ...(paged
            ? {
                page: pagination?.currentPage && pagination.currentPage > 1
                  ? pagination.currentPage
                  : undefined,
                per_page: pagination?.pageSize ?? 20,
              }
            : {}),
          ...readMeta(meta).query,
        },
      });

      // Some collection endpoints (related, categories, makes) are bare arrays.
      if (Array.isArray(body)) return { data: body, total: body.length, pageCount: 1 };

      const { data, meta: pageMeta, links: _links, ...extra } = body;
      return {
        data,
        total: pageMeta?.total ?? data.length,
        pageCount: pageMeta?.last_page ?? 1,
        extra,
      };
    },

    async getOne<TData extends BaseRecord = BaseRecord>({
      resource,
      id,
      meta,
    }: GetOneParams): Promise<GetOneResponse<TData>> {
      'background only';
      const body = await http.request<unknown>({
        url: path(resource, id),
        query: readMeta(meta).query,
      });
      return { data: unwrap<TData>(body) };
    },

    async create<TData extends BaseRecord = BaseRecord, TVariables = unknown>({
      resource,
      variables,
      meta,
    }: CreateParams<TVariables>): Promise<CreateResponse<TData>> {
      'background only';
      const body = await http.request<unknown>({
        method: readMeta(meta).method ?? 'post',
        url: path(resource),
        body: variables,
      });
      return { data: unwrap<TData>(body) };
    },

    async update<TData extends BaseRecord = BaseRecord, TVariables = unknown>({
      resource,
      id,
      variables,
      meta,
    }: UpdateParams<TVariables>): Promise<UpdateResponse<TData>> {
      'background only';
      const body = await http.request<unknown>({
        method: readMeta(meta).method ?? resources[resource]?.updateMethod ?? 'patch',
        url: path(resource, id),
        body: variables,
      });
      return { data: unwrap<TData>(body) };
    },

    async deleteOne<TData extends BaseRecord = BaseRecord, TVariables = unknown>({
      resource,
      id,
      variables,
      meta,
    }: DeleteOneParams<TVariables>): Promise<DeleteOneResponse<TData>> {
      'background only';
      const body = await http.request<unknown>({
        method: readMeta(meta).method ?? 'delete',
        url: path(resource, id),
        body: variables,
      });
      // Laravel answers 204 on delete: echo the id so caches can drop it.
      return { data: unwrap<TData>(body ?? { id }) };
    },

    async custom<TData = BaseRecord, TPayload = unknown>({
      url,
      method,
      filters,
      sorters,
      payload,
      query,
      headers,
      meta,
    }: CustomParams<TPayload>): Promise<CustomResponse<TData>> {
      'background only';
      const style = readMeta(meta).queryStyle ?? 'spatie';
      const body = await http.request<unknown>({
        method,
        url,
        headers,
        body: payload,
        query: {
          ...serializeFilters(filters, style),
          ...serializeSorters(sorters, style),
          ...(query as QueryParams | undefined),
        },
      });
      // Custom endpoints answer whatever shape they like: hand it back as-is.
      return { data: body as TData };
    },
  };
}
