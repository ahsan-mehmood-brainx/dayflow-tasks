import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { TaskDetailsScreen } from '@/features/tasks/presentation/screens/TaskDetailsScreen';
import { TaskFormScreen } from '@/features/tasks/presentation/screens/TaskFormScreen';
import { TaskListScreen } from '@/features/tasks/presentation/screens/TaskListScreen';
import { colors, typography } from '@/shared/theme/tokens';
import { HeaderTextButton } from '@/shared/ui/HeaderTextButton';

import type { TaskStackParamList } from './types';

const Stack = createNativeStackNavigator<TaskStackParamList>();

export function TasksStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.accent,
        headerTitleStyle: { ...typography.headline, color: colors.textPrimary },
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="TaskList" component={TaskListScreen} options={{ headerShown: false, title: 'Tasks' }} />
      {/* `getId` makes each task (and each form mode) its own route. Without it, React Navigation 7
          reuses a focused route of the same name and swaps its params, e.g. turning an open edit
          form into a create form when "New task" is tapped from Home. */}
      <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} options={{ title: '' }} getId={({ params }) => params.taskId} />
      <Stack.Screen
        name="TaskForm"
        component={TaskFormScreen}
        getId={({ params }) => (params.mode === 'edit' ? `edit:${params.taskId}` : 'create')}
        options={({ navigation, route }) => ({
          presentation: 'modal',
          title: route.params.mode === 'create' ? 'New task' : 'Edit task',
          headerLeft: () => <HeaderTextButton label="Cancel" onPress={navigation.goBack} />,
        })}
      />
    </Stack.Navigator>
  );
}
