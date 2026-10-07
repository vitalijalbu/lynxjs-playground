import { useMutation } from '@tanstack/react-query';
import type { UseMutationOptions } from '@tanstack/react-query';

import { useDataProvider } from '../context.js';
import type { BaseRecord, CreateManyResponse, CreateResponse, HttpError } from '../types.js';
import {
  DEFAULT_INVALIDATES,
  type MutationScope,
  requireResource,
  type UseMutationReturn,
} from './shared.js';
import { useInvalidate } from './useInvalidate.js';

export interface UseCreateParams<TVariables> extends MutationScope {
  values: TVariables;
}

export interface UseCreateManyParams<TVariables> extends MutationScope {
  values: TVariables[];
}

export interface UseCreateProps<TData, TError, TParams> extends MutationScope {
  mutationOptions?: Omit<UseMutationOptions<TData, TError, TParams>, 'mutationFn'>;
}

/** `POST /{resource}`; invalidates the resource's lists on success. */
export function useCreate<
  TData extends BaseRecord = BaseRecord,
  TError = HttpError,
  TVariables = Record<string, unknown>,
>(
  props: UseCreateProps<CreateResponse<TData>, TError, UseCreateParams<TVariables>> = {},
): UseMutationReturn<CreateResponse<TData>, TError, UseCreateParams<TVariables>> {
  const getProvider = useDataProvider();
  const invalidate = useInvalidate();
  const { mutationOptions, ...scope } = props;

  const mutation = useMutation<CreateResponse<TData>, TError, UseCreateParams<TVariables>>({
    ...mutationOptions,
    mutationFn: (params) => {
      'background only';
      const resource = requireResource(params.resource ?? scope.resource, 'useCreate');
      return getProvider(params.dataProviderName ?? scope.dataProviderName).create<
        TData,
        TVariables
      >({ resource, variables: params.values, meta: params.meta ?? scope.meta });
    },
    onSuccess: async (...args) => {
      const params = args[1];
      await invalidate({
        resource: params.resource ?? scope.resource,
        dataProviderName: params.dataProviderName ?? scope.dataProviderName,
        invalidates: params.invalidates ?? scope.invalidates ?? DEFAULT_INVALIDATES,
      });
      return mutationOptions?.onSuccess?.(...args);
    },
  });

  return { mutate: mutation.mutate, mutateAsync: mutation.mutateAsync, mutation };
}

/** Bulk create. Uses `createMany` when the provider has it, else parallel `create`. */
export function useCreateMany<
  TData extends BaseRecord = BaseRecord,
  TError = HttpError,
  TVariables = Record<string, unknown>,
>(
  props: UseCreateProps<CreateManyResponse<TData>, TError, UseCreateManyParams<TVariables>> = {},
): UseMutationReturn<CreateManyResponse<TData>, TError, UseCreateManyParams<TVariables>> {
  const getProvider = useDataProvider();
  const invalidate = useInvalidate();
  const { mutationOptions, ...scope } = props;

  const mutation = useMutation<
    CreateManyResponse<TData>,
    TError,
    UseCreateManyParams<TVariables>
  >({
    ...mutationOptions,
    mutationFn: async (params) => {
      'background only';
      const resource = requireResource(params.resource ?? scope.resource, 'useCreateMany');
      const provider = getProvider(params.dataProviderName ?? scope.dataProviderName);
      const meta = params.meta ?? scope.meta;
      if (provider.createMany) {
        return provider.createMany<TData, TVariables>({ resource, variables: params.values, meta });
      }
      const created = await Promise.all(
        params.values.map((variables) =>
          provider.create<TData, TVariables>({ resource, variables, meta }),
        ),
      );
      return { data: created.map((item) => item.data) };
    },
    onSuccess: async (...args) => {
      const params = args[1];
      await invalidate({
        resource: params.resource ?? scope.resource,
        dataProviderName: params.dataProviderName ?? scope.dataProviderName,
        invalidates: params.invalidates ?? scope.invalidates ?? DEFAULT_INVALIDATES,
      });
      return mutationOptions?.onSuccess?.(...args);
    },
  });

  return { mutate: mutation.mutate, mutateAsync: mutation.mutateAsync, mutation };
}
