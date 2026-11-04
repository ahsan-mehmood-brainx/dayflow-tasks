import { screen } from '@testing-library/react-native';

import { renderApp, signInAsDemoUser } from '@/core/testing/renderApp';
import { MockTaskRepository } from '@/features/tasks/data/MockTaskRepository';
import { activeTask } from '@/features/tasks/testing/taskFixtures';
import { toCalendarDate } from '@/shared/lib/calendarDate';

const seed = [activeTask({ id: 'task-1', title: 'Review the roadmap', dueDate: toCalendarDate(new Date()) })];

describe('authentication gate', () => {
  it('shows only the login screen to a signed-out user', async () => {
    await renderApp();

    expect(screen.getByRole('header', { name: 'DayFlow' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Profile/ })).not.toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: /^Today/ })).not.toBeOnTheScreen();
  });

  it('validates the form inline before contacting the auth service', async () => {
    const { user, dependencies } = await renderApp();
    const signIn = jest.spyOn(dependencies.authService, 'signIn');

    await user.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByText('Enter your email address.')).toBeOnTheScreen();
    expect(screen.getByText('Enter your password.')).toBeOnTheScreen();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('explains rejected credentials and stays on the login screen', async () => {
    const { user } = await renderApp();

    await user.type(screen.getByLabelText('Email, required'), 'demo@dayflow.app');
    await user.type(screen.getByLabelText('Password, required'), 'not-the-password');
    await user.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('That email and password don’t match the demo account.')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'DayFlow' })).toBeOnTheScreen();
  });

  it('opens the dashboard after signing in, and logging out removes every protected screen', async () => {
    const { user } = await renderApp({ taskRepository: new MockTaskRepository({ seed }) });

    await signInAsDemoUser(user);
    expect(await screen.findByText('Review the roadmap')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: /Profile/ }));
    await user.press(await screen.findByRole('button', { name: 'Log out' }));

    expect(await screen.findByRole('header', { name: 'DayFlow' })).toBeOnTheScreen();
    expect(screen.queryByText('Review the roadmap')).not.toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Profile' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Profile/ })).not.toBeOnTheScreen();
  });
});
