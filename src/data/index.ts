/**
 * refine-style data layer on TanStack Query.
 *
 * Reads:     useList · useInfiniteList · useOne · useMany · useCustom
 * Writes:    useCreate · useCreateMany · useUpdate · useUpdateMany
 *            useDelete · useDeleteMany · useCustomMutation
 * Utilities: useInvalidate · useApiUrl · useDataProvider
 *
 * Read hooks return `{ query, result }`; write hooks `{ mutate, mutateAsync, mutation }`.
 */
export { DataProviderRoot, useApiUrl, useDataProvider } from './context.js';
export type { DataProviderRootProps } from './context.js';
export { createHttpClient } from './http.js';
export type { HttpClient, HttpClientOptions, HttpRequest, QueryParams } from './http.js';
export { dataKeys } from './keys.js';
export { createLaravelDataProvider } from './providers/laravel.js';
export type { QueryStyle, ResourceConfig } from './providers/laravel.js';
export type { MutationMode } from './hooks/shared.js';
export { useCreate, useCreateMany } from './hooks/useCreate.js';
export type { UseCreateManyParams, UseCreateParams } from './hooks/useCreate.js';
export { useCustom } from './hooks/useCustom.js';
export { useCustomMutation } from './hooks/useCustomMutation.js';
export { useDelete, useDeleteMany } from './hooks/useDelete.js';
export { useInfiniteList } from './hooks/useInfiniteList.js';
export { useInvalidate } from './hooks/useInvalidate.js';
export type { InvalidationTarget } from './hooks/useInvalidate.js';
export { useList } from './hooks/useList.js';
export { useMany } from './hooks/useMany.js';
export { useOne } from './hooks/useOne.js';
export { useUpdate, useUpdateMany } from './hooks/useUpdate.js';
export type * from './types.js';
