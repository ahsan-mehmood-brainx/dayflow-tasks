import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DependencyProvider } from '@/core/di/DependencyProvider';
import type { AppDependencies } from '@/core/di/dependencies';
import { StoreProvider } from '@/core/store/StoreProvider';
import { ToastProvider } from '@/shared/ui/Toast';

interface AppProvidersProps {
  readonly dependencies: AppDependencies;
  readonly children: ReactNode;
}

export function AppProviders({ dependencies, children }: AppProvidersProps) {
  return (
    <SafeAreaProvider>
      <DependencyProvider dependencies={dependencies}>
        <StoreProvider>
          <ToastProvider>{children}</ToastProvider>
        </StoreProvider>
      </DependencyProvider>
    </SafeAreaProvider>
  );
}
