import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAppSelector } from '@/core/store/hooks';
import { LoginScreen } from '@/features/auth/presentation/LoginScreen';
import { selectIsAuthenticated } from '@/features/auth/state/authSelectors';

import { MainTabs } from './MainTabs';
import type { RootStackParamList } from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();

/**
 * The authentication gate. Exactly one branch of the tree is *declared* at a time, so when the
 * session ends every protected screen is unmounted, not hidden. Stale screens can't be reached via
 * back gestures or deep links, and no screen needs its own auth check.
 */
export function RootNavigator() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <RootStack.Screen name="Main" component={MainTabs} />
      ) : (
        <RootStack.Screen name="Login" component={LoginScreen} options={{ animationTypeForReplace: 'pop' }} />
      )}
    </RootStack.Navigator>
  );
}
