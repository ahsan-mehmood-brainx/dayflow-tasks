import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

import { readAppConfig } from '@/config/appConfig';
import { createDependencies } from '@/core/di/dependencies';
import { AppNavigation } from '@/core/navigation/AppNavigation';
import { AppProviders } from '@/core/providers/AppProviders';

/**
 * Composition root: the only place that reads configuration and builds concrete dependencies.
 * An invalid configuration throws here, failing fast with a descriptive ConfigError.
 */
export default function App() {
  const [dependencies] = useState(() => createDependencies(readAppConfig()));

  return (
    <AppProviders dependencies={dependencies}>
      <StatusBar style="dark" />
      <AppNavigation />
    </AppProviders>
  );
}
