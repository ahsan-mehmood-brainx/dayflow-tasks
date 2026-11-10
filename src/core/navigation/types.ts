import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { TaskId } from '@/features/tasks/domain/task';

/**
 * Route map:
 *
 * RootStack ── Login                      (signed out)
 *           └─ Main ── BottomTabs         (signed in)
 *                       ├─ Home
 *                       ├─ Tasks ── TaskStack: TaskList → TaskDetails → TaskForm
 *                       └─ Profile
 *
 * Screens receive IDs, never task objects, so they always render the store's current version.
 */

/** A form either creates a task or edits one; editing without an ID is a type error. */
export type TaskFormParams = { readonly mode: 'create' } | { readonly mode: 'edit'; readonly taskId: TaskId };

export type TaskStackParamList = {
  TaskList: undefined;
  TaskDetails: { readonly taskId: TaskId };
  TaskForm: TaskFormParams;
};

export type MainTabParamList = {
  Home: undefined;
  Tasks: NavigatorScreenParams<TaskStackParamList> | undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
};

export type RootStackScreenProps<Route extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, Route>;

export type MainTabScreenProps<Route extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, Route>,
  RootStackScreenProps<keyof RootStackParamList>
>;

export type TaskStackScreenProps<Route extends keyof TaskStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<TaskStackParamList, Route>,
  MainTabScreenProps<keyof MainTabParamList>
>;

declare global {
  // React Navigation's documented hook for typing `useNavigation()` app-wide.
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Declaration merging requires an interface.
    interface RootParamList extends RootStackParamList {}
  }
}
