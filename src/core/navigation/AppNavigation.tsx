import { DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';

import { colors } from '@/shared/theme/tokens';

import { RootNavigator } from './RootNavigator';

const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.separator,
    notification: colors.danger,
  },
};

export function AppNavigation() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}
