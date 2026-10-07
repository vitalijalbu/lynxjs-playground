import { useMutation } from '@tanstack/react-query';
import type { UseMutationOptions } from '@tanstack/react-query';

import { useDataProvider } from '../context.js';
import type { BaseRecord, CustomResponse, HttpError, MetaQuery } from '../types.js';
import type { UseMutationReturn } from './shared.js';
import { type InvalidateParams, useInvalidate } from './useInvalidate.js';

export interface UseCustomMutationParams<TVariables> {
  url: string;
  method: 'post' | 'put' | 'patch' | 'delete';
  values?: TVariables;
  config?: { query?: Record<string, unknown>; headers?: Record<string, string> };
  meta?: MetaQuery;
  dataProviderName?: string;
  /** Caches to refresh afterwards, e.g. `{ resource: 'listings', invalidates: ['list'] }`. */
  invalidate?: Omit<InvalidateParams, 'dataProviderName'>;
}

export interface UseCustomMutationProps<TData, TError, TVariables> {
  mutationOptions?: Omit<
    UseMutationOptions<CustomResponse<TData>, TError, UseCustomMutationParams<TVariables>>,
    'mutationFn'
  >;
}

/** Any write that is not plain CRUD (contact seller, report listing...). */
export function useCustomMutation<
  TData = BaseRecord,
  TError = HttpError,
  TVariables = Record<string, unknown>,
>({ mutationOptions }: UseCustomMutationProps<TData, TError, TVariables> = {}): UseMutationReturn<
  CustomResponse<TData>,
  TError,
  UseCustomMutationParams<TVariables>
> {
  const getProvider = useDataProvider();
  const invalidate = useInvalidate();

  const mutation = useMutation<CustomResponse<TData>, TError, UseCustomMutationParams<TVariables>>({
    ...mutationOptions,
    mutationFn: ({ url, method, values, config, meta, dataProviderName }) => {
      'background only';
      const provider = getProvider(dataProviderName);
      if (!provider.custom) {
        throw new Error(`Data provider "${dataProviderName ?? 'default'}" has no custom() method.`);
      }
      return provider.custom<TData, TVariables>({
        url,
        method,
        payload: values,
        query: config?.query,
        headers: config?.headers,
        meta,
      });
    },
    onSuccess: async (...args) => {
      const params = args[1];
      if (params.invalidate) {
        await invalidate({ ...params.invalidate, dataProviderName: params.dataProviderName });
      }
      return mutationOptions?.onSuccess?.(...args);
    },
  });

  return { mutate: mutation.mutate, mutateAsync: mutation.mutateAsync, mutation };
}
