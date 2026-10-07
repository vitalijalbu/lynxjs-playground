import type { Store } from '@tanstack/react-store';

/**
 * Key/value persistence through the host's `NativeLocalStorageModule` — the
 * module shape from the Lynx "Native Modules" guide. When the host does not
 * register it (e.g. LynxExplorer), state simply lives for the session.
 */
interface NativeLocalStorageModule {
  setStorageItem(key: string, value: string): void;
  getStorageItem(key: string, callback: (value: string | null | undefined) => void): void;
}

function nativeStorage(): NativeLocalStorageModule | undefined {
  'background only';
  return NativeModules?.NativeLocalStorageModule as NativeLocalStorageModule | undefined;
}

/**
 * Hydrates `store` from storage once, then writes every change back.
 * Returns an unsubscribe function. Background thread only.
 */
export function persistStore<T>(
  store: Store<T>,
  key: string,
  merge: (current: T, saved: unknown) => T = (_current, saved) => saved as T,
): () => void {
  'background only';
  const storage = nativeStorage();
  if (!storage) return () => undefined;

  let hydrated = false;
  storage.getStorageItem(key, (raw) => {
    hydrated = true;
    if (!raw) return;
    try {
      const saved: unknown = JSON.parse(raw);
      store.setState((current) => merge(current, saved));
    } catch {
      // Corrupt entry: keep the in-memory default.
    }
  });

  const subscription = store.subscribe((value) => {
    // Do not overwrite the saved value with defaults before it has been read.
    if (hydrated) storage.setStorageItem(key, JSON.stringify(value));
  });
  return () => subscription.unsubscribe();
}
