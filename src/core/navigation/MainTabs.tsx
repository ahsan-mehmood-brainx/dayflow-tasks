import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { ProfileScreen } from '@/features/auth/presentation/ProfileScreen';
import { HomeScreen } from '@/features/tasks/presentation/screens/HomeScreen';
import { colors, sizes, typography } from '@/shared/theme/tokens';
import { Icon, type IconName } from '@/shared/ui/Icon';

import { TasksStack } from './TasksStack';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, { focused: IconName; idle: IconName }> = {
  Home: { focused: 'home', idle: 'home-outline' },
  Tasks: { focused: 'checkmark-circle', idle: 'checkmark-circle-outline' },
  Profile: { focused: 'person-circle', idle: 'person-circle-outline' },
};

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.separator },
        tabBarLabelStyle: { ...typography.caption, letterSpacing: 0 },
        tabBarIcon: ({ focused, color }) => (
          <Icon name={focused ? TAB_ICONS[route.name].focused : TAB_ICONS[route.name].idle} size={sizes.iconLg} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Tasks" component={TasksStack} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
