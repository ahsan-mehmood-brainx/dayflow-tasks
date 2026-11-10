import { createContext, useContext, type ReactNode } from 'react';

import type { AppDependencies } from './dependencies';

const DependencyContext = createContext<AppDependencies | null>(null);

interface DependencyProviderProps {
  /** Must be referentially stable for the lifetime of the app; the store is created from it once. */
  readonly dependencies: AppDependencies;
  readonly children: ReactNode;
}

export function DependencyProvider({ dependencies, children }: DependencyProviderProps) {
  return <DependencyContext.Provider value={dependencies}>{children}</DependencyContext.Provider>;
}

export function useDependencies(): AppDependencies {
  const dependencies = useContext(DependencyContext);
  if (dependencies === null) {
    throw new Error('useDependencies must be used within a DependencyProvider.');
  }
  return dependencies;
}
