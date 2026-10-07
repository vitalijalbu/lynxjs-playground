import type { UseMutationResult } from '@tanstack/react-query';

import type { MetaQuery } from '../types.js';
import type { InvalidationTarget } from './useInvalidate.js';

export const DEFAULT_INVALIDATES: InvalidationTarget[] = ['list', 'many'];

/**
 * - `pessimistic`: caches change once the server confirms.
 * - `optimistic`: caches change immediately and roll back on error.
 */
export type MutationMode = 'pessimistic' | 'optimistic';

/** Hook-level defaults; every field can be overridden per `mutate()` call. */
export interface MutationScope {
  resource?: string;
  meta?: MetaQuery;
  dataProviderName?: string;
  invalidates?: InvalidationTarget[] | false;
}

export interface UseMutationReturn<TData, TError, TParams, TContext = unknown> {
  mutate: UseMutationResult<TData, TError, TParams, TContext>['mutate'];
  mutateAsync: UseMutationResult<TData, TError, TParams, TContext>['mutateAsync'];
  mutation: UseMutationResult<TData, TError, TParams, TContext>;
}

export function requireResource(resource: string | undefined, hook: string): string {
  if (!resource) throw new Error(`${hook}: "resource" is required (hook props or mutate params).`);
  return resource;
}
