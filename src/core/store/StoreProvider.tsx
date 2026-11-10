import { useState, type ReactNode } from 'react';
import { Provider } from 'react-redux';

import { useDependencies } from '@/core/di/DependencyProvider';

import { createAppStore } from './store';

/**
 * Builds the Redux store from the dependencies supplied through React Context, so the
 * container injected at the root is the same one thunks receive as `extra`.
 */
export function StoreProvider({ children }: { readonly children: ReactNode }) {
  const dependencies = useDependencies();
  const [store] = useState(() => createAppStore(dependencies));
  return <Provider store={store}>{children}</Provider>;
}
