import { screen } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import { renderApp, signInAsDemoUser } from '@/core/testing/renderApp';
import { MockTaskRepository } from '@/features/tasks/data/MockTaskRepository';
import { activeTask } from '@/features/tasks/testing/taskFixtures';
import { networkError } from '@/shared/lib/appError';
import { toCalendarDate } from '@/shared/lib/calendarDate';
import { err } from '@/shared/lib/result';

const seed = [activeTask({ id: 'task-1', title: 'Pay rent', dueDate: toCalendarDate(new Date()) })];

function answerAlert(style: AlertButton['style']) {
  return jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons?: AlertButton[]) => {
    buttons?.find((button) => button.style === style)?.onPress?.();
  });
}

async function openDetails(repository: MockTaskRepository) {
  const { user } = await renderApp({ taskRepository: repository });
  await signInAsDemoUser(user);
  await user.press(await screen.findByRole('button', { name: /^Pay rent\./ }));
  await screen.findByRole('button', { name: 'Delete task' });
  return user;
}

describe('deleting a task', () => {
  it('asks for confirmation naming the task', async () => {
    const user = await openDetails(new MockTaskRepository({ seed }));
    const alert = answerAlert('cancel');

    await user.press(screen.getByRole('button', { name: 'Delete task' }));

    expect(alert).toHaveBeenCalledWith('Delete this task?', '“Pay rent” will be permanently removed.', expect.any(Array), expect.anything());
  });

  it('keeps the task when the user cancels', async () => {
    const repository = new MockTaskRepository({ seed });
    const deleteTask = jest.spyOn(repository, 'deleteTask');
    const user = await openDetails(repository);
    answerAlert('cancel');

    await user.press(screen.getByRole('button', { name: 'Delete task' }));

    expect(deleteTask).not.toHaveBeenCalled();
    expect(screen.queryByText('Task deleted')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Delete task' })).toBeOnTheScreen();
  });

  it('keeps the task and explains the problem when deletion fails', async () => {
    const repository = new MockTaskRepository({ seed });
    jest.spyOn(repository, 'deleteTask').mockResolvedValueOnce(err(networkError()));
    const user = await openDetails(repository);
    answerAlert('destructive');

    await user.press(screen.getByRole('button', { name: 'Delete task' }));

    expect(await screen.findByText(/Couldn’t delete the task\./)).toBeOnTheScreen();
    expect(screen.queryByText('Task deleted')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Delete task' })).toBeOnTheScreen();
  });
});
