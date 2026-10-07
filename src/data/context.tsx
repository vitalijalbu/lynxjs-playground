import { createContext, useContext } from '@lynx-js/react';
import type { ReactNode } from '@lynx-js/react';

import type { DataProvider, DataProviders } from './types.js';

const DataProviderContext = createContext<DataProviders | null>(null);

export interface DataProviderRootProps {
  /** One provider, or a map of named providers (`default` is required). */
  dataProvider: DataProvider | DataProviders;
  children?: ReactNode;
}

function isProviderMap(value: DataProvider | DataProviders): value is DataProviders {
  return 'default' in value && typeof (value as DataProviders).default === 'object';
}

/** Makes the data provider(s) available to every data hook below it. */
export function DataProviderRoot({ dataProvider, children }: DataProviderRootProps) {
  const providers = isProviderMap(dataProvider) ? dataProvider : { default: dataProvider };
  return (
    <DataProviderContext.Provider value={providers}>{children}</DataProviderContext.Provider>
  );
}

/** Returns a resolver: `useDataProvider()('default')`. */
export function useDataProvider(): (name?: string) => DataProvider {
  const providers = useContext(DataProviderContext);
  if (!providers) {
    throw new Error('Data hooks must be used inside <DataProviderRoot>.');
  }
  return (name = 'default') => {
    const provider = providers[name];
    if (!provider) throw new Error(`Unknown data provider "${name}".`);
    return provider;
  };
}

export function useApiUrl(dataProviderName?: string): string {
  return useDataProvider()(dataProviderName).getApiUrl();
}
