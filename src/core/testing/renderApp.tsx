import { render, screen, userEvent } from '@testing-library/react-native';

import { DEMO_ACCOUNT } from '@/config/demoAccount';
import type { AppDependencies } from '@/core/di/dependencies';
import { AppNavigation } from '@/core/navigation/AppNavigation';
import { AppProviders } from '@/core/providers/AppProviders';

import { createTestDependencies } from './createTestStore';

export type TestUser = ReturnType<typeof userEvent.setup>;

/** Renders the real app (providers, store, navigation) with injectable dependencies. */
export async function renderApp(overrides: Partial<AppDependencies> = {}) {
  const dependencies = createTestDependencies(overrides);
  const user = userEvent.setup();
  await render(
    <AppProviders dependencies={dependencies}>
      <AppNavigation />
    </AppProviders>,
  );
  return { dependencies, user };
}

export async function signInAsDemoUser(user: TestUser): Promise<void> {
  await user.type(screen.getByLabelText('Email, required'), DEMO_ACCOUNT.email);
  await user.type(screen.getByLabelText('Password, required'), DEMO_ACCOUNT.password);
  await user.press(screen.getByRole('button', { name: 'Sign in' }));
  await screen.findByRole('header', { name: /^Good (morning|afternoon|evening), Alex$/ });
}
