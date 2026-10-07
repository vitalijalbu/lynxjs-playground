/**
 * Data-provider contract, modelled on refine's (`@refinedev/core`) so the hooks
 * read the same: a provider translates generic CRUD calls into one backend's
 * HTTP dialect, and the hooks wrap those calls in TanStack Query.
 */

export type BaseKey = string | number;

// biome-ignore lint/suspicious/noExplicitAny: records are backend-defined shapes.
export type BaseRecord = { id?: BaseKey; [key: string]: any };

export interface HttpError {
  message: string;
  /** HTTP status; `0` for network failures, `408` for client-side timeouts. */
  statusCode: number;
  /** Laravel validation bag: field → messages. */
  errors?: Record<string, string[]>;
}

export type CrudOperator = 'eq' | 'in' | 'contains' | 'gte' | 'lte' | 'between';

export interface CrudFilter {
  field: string;
  operator: CrudOperator;
  value: unknown;
}

export type CrudFilters = CrudFilter[];

export interface CrudSort {
  field: string;
  order: 'asc' | 'desc';
}

export type CrudSorting = CrudSort[];

export interface Pagination {
  /** 1-based page index. */
  currentPage?: number;
  pageSize?: number;
  /** `off` sends no paging params and expects the whole collection. */
  mode?: 'server' | 'off';
}

/** Free-form per-call options forwarded to the provider. */
export type MetaQuery = Record<string, unknown>;

export interface GetListParams {
  resource: string;
  pagination?: Pagination;
  sorters?: CrudSorting;
  filters?: CrudFilters;
  meta?: MetaQuery;
}

export interface GetListResponse<TData = BaseRecord> {
  data: TData[];
  total: number;
  /** Pages available server-side, when the backend reports it. */
  pageCount?: number;
  /** Anything else the backend returned next to `data` (e.g. search facets). */
  extra?: Record<string, unknown>;
}

export interface GetOneParams {
  resource: string;
  id: BaseKey;
  meta?: MetaQuery;
}

export interface GetOneResponse<TData = BaseRecord> {
  data: TData;
}

export interface GetManyParams {
  resource: string;
  ids: BaseKey[];
  meta?: MetaQuery;
}

export interface GetManyResponse<TData = BaseRecord> {
  data: TData[];
}

export interface CreateParams<TVariables = unknown> {
  resource: string;
  variables: TVariables;
  meta?: MetaQuery;
}

export interface CreateResponse<TData = BaseRecord> {
  data: TData;
}

export interface CreateManyParams<TVariables = unknown> {
  resource: string;
  variables: TVariables[];
  meta?: MetaQuery;
}

export interface CreateManyResponse<TData = BaseRecord> {
  data: TData[];
}

export interface UpdateParams<TVariables = unknown> {
  resource: string;
  id: BaseKey;
  variables: TVariables;
  meta?: MetaQuery;
}

export interface UpdateResponse<TData = BaseRecord> {
  data: TData;
}

export interface UpdateManyParams<TVariables = unknown> {
  resource: string;
  ids: BaseKey[];
  variables: TVariables;
  meta?: MetaQuery;
}

export interface UpdateManyResponse<TData = BaseRecord> {
  data: TData[];
}

export interface DeleteOneParams<TVariables = unknown> {
  resource: string;
  id: BaseKey;
  variables?: TVariables;
  meta?: MetaQuery;
}

export interface DeleteOneResponse<TData = BaseRecord> {
  data: TData;
}

export interface DeleteManyParams<TVariables = unknown> {
  resource: string;
  ids: BaseKey[];
  variables?: TVariables;
  meta?: MetaQuery;
}

export interface DeleteManyResponse<TData = BaseRecord> {
  data: TData[];
}

export type CustomMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface CustomParams<TPayload = unknown> {
  url: string;
  method: CustomMethod;
  filters?: CrudFilters;
  sorters?: CrudSorting;
  payload?: TPayload;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  meta?: MetaQuery;
}

export interface CustomResponse<TData = BaseRecord> {
  data: TData;
}

export interface DataProvider {
  getApiUrl: () => string;
  getList: <TData extends BaseRecord = BaseRecord>(
    params: GetListParams,
  ) => Promise<GetListResponse<TData>>;
  getOne: <TData extends BaseRecord = BaseRecord>(
    params: GetOneParams,
  ) => Promise<GetOneResponse<TData>>;
  /** Optional: hooks fall back to parallel `getOne` calls. */
  getMany?: <TData extends BaseRecord = BaseRecord>(
    params: GetManyParams,
  ) => Promise<GetManyResponse<TData>>;
  create: <TData extends BaseRecord = BaseRecord, TVariables = unknown>(
    params: CreateParams<TVariables>,
  ) => Promise<CreateResponse<TData>>;
  /** Optional: hooks fall back to parallel `create` calls. */
  createMany?: <TData extends BaseRecord = BaseRecord, TVariables = unknown>(
    params: CreateManyParams<TVariables>,
  ) => Promise<CreateManyResponse<TData>>;
  update: <TData extends BaseRecord = BaseRecord, TVariables = unknown>(
    params: UpdateParams<TVariables>,
  ) => Promise<UpdateResponse<TData>>;
  /** Optional: hooks fall back to parallel `update` calls. */
  updateMany?: <TData extends BaseRecord = BaseRecord, TVariables = unknown>(
    params: UpdateManyParams<TVariables>,
  ) => Promise<UpdateManyResponse<TData>>;
  deleteOne: <TData extends BaseRecord = BaseRecord, TVariables = unknown>(
    params: DeleteOneParams<TVariables>,
  ) => Promise<DeleteOneResponse<TData>>;
  /** Optional: hooks fall back to parallel `deleteOne` calls. */
  deleteMany?: <TData extends BaseRecord = BaseRecord, TVariables = unknown>(
    params: DeleteManyParams<TVariables>,
  ) => Promise<DeleteManyResponse<TData>>;
  custom?: <TData = BaseRecord, TPayload = unknown>(
    params: CustomParams<TPayload>,
  ) => Promise<CustomResponse<TData>>;
}

/** Several named providers can coexist; hooks pick one with `dataProviderName`. */
export type DataProviders = { default: DataProvider } & Record<string, DataProvider>;
