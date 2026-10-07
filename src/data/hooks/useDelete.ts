import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationOptions } from '@tanstack/react-query';

import {
  applyOptimisticChange,
  type ResourceSnapshot,
  restoreSnapshot,
  snapshotResource,
} from '../cache.js';
import { useDataProvider } from '../context.js';
import type {
  BaseKey,
  BaseRecord,
  DeleteManyResponse,
  DeleteOneResponse,
  HttpError,
} from '../types.js';
import {
  DEFAULT_INVALIDATES,
  type MutationMode,
  type MutationScope,
  requireResource,
  type UseMutationReturn,
} from './shared.js';
import { useInvalidate } from './useInvalidate.js';

interface DeleteScope extends MutationScope {
  mutationMode?: MutationMode;
}

export interface UseDeleteParams<TVariables> extends DeleteScope {
  id: BaseKey;
  /** Optional request body (e.g. Laravel's deletion `reason`). */
  values?: TVariables;
}

export interface UseDeleteManyParams<TVariables> extends DeleteScope {
  ids: BaseKey[];
  values?: TVariables;
}

interface OptimisticContext {
  snapshot?: ResourceSnapshot;
}

export interface UseDeleteProps<TData, TError, TParams> extends DeleteScope {
  mutationOptions?: Omit<
    UseMutationOptions<TData, TError, TParams, OptimisticContext>,
    'mutationFn' | 'onMutate'
  >;
}

type AnyDeleteParams = DeleteScope & { id?: BaseKey; ids?: BaseKey[] };

type Options<TData, TError, TParams> = NonNullable<
  UseDeleteProps<TData, TError, TParams>['mutationOptions']
>;
type OnErrorArgs<TData, TError, TParams> = Parameters<
  NonNullable<Options<TData, TError, TParams>['onError']>
>;
type OnSettledArgs<TData, TError, TParams> = Parameters<
  NonNullable<Options<TData, TError, TParams>['onSettled']>
>;

function useDeleteLifecycle<TData, TError, TParams extends AnyDeleteParams>(
  scope: DeleteScope,
  mutationOptions: Options<TData, TError, TParams> | undefined,
) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();

  const resolve = (params: TParams) => ({
    resource: params.resource ?? scope.resource,
    provider: params.dataProviderName ?? scope.dataProviderName ?? 'default',
    ids: params.ids ?? (params.id === undefined ? [] : [params.id]),
    mode: params.mutationMode ?? scope.mutationMode ?? 'pessimistic',
  });

  return {
    onMutate: async (params: TParams): Promise<OptimisticContext> => {
      'background only';
      const { resource, provider, ids, mode } = resolve(params);
      if (mode !== 'optimistic' || !resource) return {};
      const snapshot = snapshotResource(queryClient, provider, resource);
      await applyOptimisticChange(queryClient, provider, resource, ids, { kind: 'remove' });
      return { snapshot };
    },
    onError: (...args: OnErrorArgs<TData, TError, TParams>) => {
      const context = args[2];
      if (context?.snapshot) restoreSnapshot(queryClient, context.snapshot);
      return mutationOptions?.onError?.(...args);
    },
    onSettled: async (...args: OnSettledArgs<TData, TError, TParams>) => {
      const params = args[2];
      const { resource, provider, ids } = resolve(params);
      // The deleted record's own detail query would only 404 on refetch: drop it.
      if (resource) {
        for (const id of ids) {
          queryClient.removeQueries({ queryKey: ['data', provider, resource, 'one', String(id)] });
        }
      }
      await invalidate({
        resource,
        dataProviderName: provider,
        invalidates: params.invalidates ?? scope.invalidates ?? DEFAULT_INVALIDATES,
      });
      return mutationOptions?.onSettled?.(...args);
    },
  };
}

/** `DELETE /{resource}/{id}`. */
export function useDelete<
  TData extends BaseRecord = BaseRecord,
  TError = HttpError,
  TVariables = Record<string, unknown>,
>(
  props: UseDeleteProps<DeleteOneResponse<TData>, TError, UseDeleteParams<TVariables>> = {},
): UseMutationReturn<
  DeleteOneResponse<TData>,
  TError,
  UseDeleteParams<TVariables>,
  OptimisticContext
> {
  const getProvider = useDataProvider();
  const { mutationOptions, ...scope } = props;
  const lifecycle = useDeleteLifecycle(scope, mutationOptions);

  const mutation = useMutation<
    DeleteOneResponse<TData>,
    TError,
    UseDeleteParams<TVariables>,
    OptimisticContext
  >({
    ...mutationOptions,
    ...lifecycle,
    mutationFn: (params) => {
      'background only';
      const resource = requireResource(params.resource ?? scope.resource, 'useDelete');
      return getProvider(params.dataProviderName ?? scope.dataProviderName).deleteOne<
        TData,
        TVariables
      >({ resource, id: params.id, variables: params.values, meta: params.meta ?? scope.meta });
    },
  });

  return { mutate: mutation.mutate, mutateAsync: mutation.mutateAsync, mutation };
}

/** Bulk delete; falls back to parallel `deleteOne` calls. */
export function useDeleteMany<
  TData extends BaseRecord = BaseRecord,
  TError = HttpError,
  TVariables = Record<string, unknown>,
>(
  props: UseDeleteProps<DeleteManyResponse<TData>, TError, UseDeleteManyParams<TVariables>> = {},
): UseMutationReturn<
  DeleteManyResponse<TData>,
  TError,
  UseDeleteManyParams<TVariables>,
  OptimisticContext
> {
  const getProvider = useDataProvider();
  const { mutationOptions, ...scope } = props;
  const lifecycle = useDeleteLifecycle(scope, mutationOptions);

  const mutation = useMutation<
    DeleteManyResponse<TData>,
    TError,
    UseDeleteManyParams<TVariables>,
    OptimisticContext
  >({
    ...mutationOptions,
    ...lifecycle,
    mutationFn: async (params) => {
      'background only';
      const resource = requireResource(params.resource ?? scope.resource, 'useDeleteMany');
      const provider = getProvider(params.dataProviderName ?? scope.dataProviderName);
      const meta = params.meta ?? scope.meta;
      if (provider.deleteMany) {
        return provider.deleteMany<TData, TVariables>({
          resource,
          ids: params.ids,
          variables: params.values,
          meta,
        });
      }
      const deleted = await Promise.all(
        params.ids.map((id) =>
          provider.deleteOne<TData, TVariables>({ resource, id, variables: params.values, meta }),
        ),
      );
      return { data: deleted.map((item) => item.data) };
    },
  });

  return { mutate: mutation.mutate, mutateAsync: mutation.mutateAsync, mutation };
}
