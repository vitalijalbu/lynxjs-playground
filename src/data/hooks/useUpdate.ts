import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationOptions } from '@tanstack/react-query';

import { applyOptimisticChange, type ResourceSnapshot, restoreSnapshot, snapshotResource } from '../cache.js';
import { useDataProvider } from '../context.js';
import type { BaseKey, BaseRecord, HttpError, UpdateManyResponse, UpdateResponse } from '../types.js';
import {
  DEFAULT_INVALIDATES,
  type MutationMode,
  type MutationScope,
  requireResource,
  type UseMutationReturn,
} from './shared.js';
import { useInvalidate } from './useInvalidate.js';

interface UpdateScope extends MutationScope {
  mutationMode?: MutationMode;
}

export interface UseUpdateParams<TVariables> extends UpdateScope {
  id?: BaseKey;
  values: TVariables;
}

export interface UseUpdateManyParams<TVariables> extends UpdateScope {
  ids: BaseKey[];
  values: TVariables;
}

interface OptimisticContext {
  snapshot?: ResourceSnapshot;
}

export interface UseUpdateProps<TData, TError, TParams> extends UpdateScope {
  /** Default target when `mutate()` omits it (edit screens). */
  id?: BaseKey;
  mutationOptions?: Omit<
    UseMutationOptions<TData, TError, TParams, OptimisticContext>,
    'mutationFn' | 'onMutate'
  >;
}

type AnyUpdateParams = UpdateScope & { values: unknown; id?: BaseKey; ids?: BaseKey[] };

type Options<TData, TError, TParams> = NonNullable<
  UseUpdateProps<TData, TError, TParams>['mutationOptions']
>;
type OnErrorArgs<TData, TError, TParams> = Parameters<
  NonNullable<Options<TData, TError, TParams>['onError']>
>;
type OnSettledArgs<TData, TError, TParams> = Parameters<
  NonNullable<Options<TData, TError, TParams>['onSettled']>
>;

/**
 * Shared optimistic/invalidation wiring for `useUpdate` and `useUpdateMany`:
 * both patch the same caches, only the id list differs.
 */
function useUpdateLifecycle<TData, TError, TParams extends AnyUpdateParams>(
  scope: UpdateScope & { id?: BaseKey },
  mutationOptions: UseUpdateProps<TData, TError, TParams>['mutationOptions'],
) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();

  const resolve = (params: TParams) => ({
    resource: params.resource ?? scope.resource,
    provider: params.dataProviderName ?? scope.dataProviderName ?? 'default',
    ids: params.ids ?? [params.id ?? scope.id].filter((id): id is BaseKey => id !== undefined),
    mode: params.mutationMode ?? scope.mutationMode ?? 'pessimistic',
  });

  return {
    onMutate: async (params: TParams): Promise<OptimisticContext> => {
      'background only';
      const { resource, provider, ids, mode } = resolve(params);
      if (mode !== 'optimistic' || !resource) return {};
      const snapshot = snapshotResource(queryClient, provider, resource);
      await applyOptimisticChange(queryClient, provider, resource, ids, {
        kind: 'patch',
        values: params.values as Record<string, unknown>,
      });
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
      const invalidates = params.invalidates ?? scope.invalidates ?? [...DEFAULT_INVALIDATES, 'detail'];
      await Promise.all(
        (ids.length > 0 ? ids : [undefined]).map((id) =>
          invalidate({ resource, id, dataProviderName: provider, invalidates }),
        ),
      );
      return mutationOptions?.onSettled?.(...args);
    },
  };
}

/** `PATCH /{resource}/{id}` (verb configurable in the provider). */
export function useUpdate<
  TData extends BaseRecord = BaseRecord,
  TError = HttpError,
  TVariables = Record<string, unknown>,
>(
  props: UseUpdateProps<UpdateResponse<TData>, TError, UseUpdateParams<TVariables>> = {},
): UseMutationReturn<UpdateResponse<TData>, TError, UseUpdateParams<TVariables>, OptimisticContext> {
  const getProvider = useDataProvider();
  const { mutationOptions, ...scope } = props;
  const lifecycle = useUpdateLifecycle(scope, mutationOptions);

  const mutation = useMutation<
    UpdateResponse<TData>,
    TError,
    UseUpdateParams<TVariables>,
    OptimisticContext
  >({
    ...mutationOptions,
    ...lifecycle,
    mutationFn: (params) => {
      'background only';
      const resource = requireResource(params.resource ?? scope.resource, 'useUpdate');
      const id = params.id ?? scope.id;
      if (id === undefined) throw new Error('useUpdate: "id" is required.');
      return getProvider(params.dataProviderName ?? scope.dataProviderName).update<
        TData,
        TVariables
      >({ resource, id, variables: params.values, meta: params.meta ?? scope.meta });
    },
  });

  return { mutate: mutation.mutate, mutateAsync: mutation.mutateAsync, mutation };
}

/** Same values applied to several ids; falls back to parallel `update` calls. */
export function useUpdateMany<
  TData extends BaseRecord = BaseRecord,
  TError = HttpError,
  TVariables = Record<string, unknown>,
>(
  props: UseUpdateProps<UpdateManyResponse<TData>, TError, UseUpdateManyParams<TVariables>> = {},
): UseMutationReturn<
  UpdateManyResponse<TData>,
  TError,
  UseUpdateManyParams<TVariables>,
  OptimisticContext
> {
  const getProvider = useDataProvider();
  const { mutationOptions, ...scope } = props;
  const lifecycle = useUpdateLifecycle(scope, mutationOptions);

  const mutation = useMutation<
    UpdateManyResponse<TData>,
    TError,
    UseUpdateManyParams<TVariables>,
    OptimisticContext
  >({
    ...mutationOptions,
    ...lifecycle,
    mutationFn: async (params) => {
      'background only';
      const resource = requireResource(params.resource ?? scope.resource, 'useUpdateMany');
      const provider = getProvider(params.dataProviderName ?? scope.dataProviderName);
      const meta = params.meta ?? scope.meta;
      if (provider.updateMany) {
        return provider.updateMany<TData, TVariables>({
          resource,
          ids: params.ids,
          variables: params.values,
          meta,
        });
      }
      const updated = await Promise.all(
        params.ids.map((id) =>
          provider.update<TData, TVariables>({ resource, id, variables: params.values, meta }),
        ),
      );
      return { data: updated.map((item) => item.data) };
    },
  });

  return { mutate: mutation.mutate, mutateAsync: mutation.mutateAsync, mutation };
}
