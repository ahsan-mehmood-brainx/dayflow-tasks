import { screen } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import { renderApp, signInAsDemoUser, type TestUser } from '@/core/testing/renderApp';
import { MockTaskRepository } from '@/features/tasks/data/MockTaskRepository';
import type { Task } from '@/features/tasks/domain/task';
import { activeTask, completedTask } from '@/features/tasks/testing/taskFixtures';
import { networkError } from '@/shared/lib/appError';
import { addDays, toCalendarDate } from '@/shared/lib/calendarDate';
import { err } from '@/shared/lib/result';

const today = toCalendarDate(new Date());

function seededRepository(seed: readonly Task[] = []) {
  let sequence = 0;
  return new MockTaskRepository({ seed, createId: () => `created-${(sequence += 1)}` });
}

/** Simulates the user choosing the destructive option in a native confirmation alert. */
function confirmAlerts() {
  return jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons?: AlertButton[]) => {
    buttons?.find((button) => button.style === 'destructive')?.onPress?.();
  });
}

async function openTasksTab(user: TestUser) {
  await user.press(screen.getByRole('button', { name: /^Tasks/ }));
  await screen.findByRole('header', { name: 'Tasks' });
}

describe('task flows', () => {
  it('creates, completes, edits and deletes a task end to end', async () => {
    const { user } = await renderApp({ taskRepository: seededRepository() });
    await signInAsDemoUser(user);
    await openTasksTab(user);

    // Create
    await user.press(screen.getByRole('button', { name: 'Add task' }));
    await user.type(await screen.findByLabelText('Title, required'), 'Book flights to Lisbon');
    await user.press(screen.getByRole('radio', { name: 'High' }));
    await user.press(screen.getByRole('radio', { name: 'Tomorrow' }));
    await user.press(screen.getByRole('button', { name: 'Save task' }));

    expect(await screen.findByText('Task added')).toBeOnTheScreen();
    const checkbox = await screen.findByRole('checkbox', { name: 'Book flights to Lisbon' });
    expect(checkbox).not.toBeChecked();
    expect(screen.getByLabelText('High priority')).toBeOnTheScreen();
    expect(screen.getByLabelText('Due Tomorrow')).toBeOnTheScreen();

    // Complete, confirmed by the repository
    await user.press(checkbox);
    expect(await screen.findByRole('checkbox', { name: 'Book flights to Lisbon', checked: true })).toBeOnTheScreen();

    // Edit
    await user.press(screen.getByText('Book flights to Lisbon'));
    await user.press(await screen.findByRole('button', { name: 'Edit task' }));
    const title = await screen.findByLabelText('Title, required');
    await user.clear(title);
    await user.type(title, 'Book flights to Porto');
    await user.press(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Changes saved')).toBeOnTheScreen();
    expect(await screen.findByRole('header', { name: 'Book flights to Porto' })).toBeOnTheScreen();

    // Delete, after confirmation
    confirmAlerts();
    await user.press(screen.getByRole('button', { name: 'Delete task' }));

    expect(await screen.findByText('Task deleted')).toBeOnTheScreen();
    expect(await screen.findByText('No tasks yet')).toBeOnTheScreen();
    expect(screen.queryByText('Book flights to Porto')).not.toBeOnTheScreen();
  });

  it('opens a fresh create form from Home even while an edit form is open', async () => {
    const repository = seededRepository([activeTask({ id: 'task-1', title: 'Pay rent', dueDate: today })]);
    const { user } = await renderApp({ taskRepository: repository });
    await signInAsDemoUser(user);

    await user.press(await screen.findByRole('button', { name: /^Pay rent\./ }));
    await user.press(await screen.findByRole('button', { name: 'Edit task' }));
    expect(await screen.findByLabelText('Title, required')).toHaveDisplayValue('Pay rent');

    await user.press(screen.getByRole('button', { name: /^Home/ }));
    await user.press(await screen.findByRole('button', { name: 'New task' }));

    const titles = await screen.findAllByLabelText('Title, required');
    expect(titles.at(-1)).toHaveDisplayValue('');
    expect(screen.getByRole('button', { name: 'Save task' })).toBeOnTheScreen();
  });

  it('asks before discarding unsaved changes', async () => {
    const { user } = await renderApp({ taskRepository: seededRepository() });
    await signInAsDemoUser(user);
    await openTasksTab(user);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons?: AlertButton[]) => {
      buttons?.find((button) => button.style === 'cancel')?.onPress?.();
    });

    await user.press(screen.getByRole('button', { name: 'Add task' }));
    await user.type(await screen.findByLabelText('Title, required'), 'Half-written idea');
    await user.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(alert).toHaveBeenCalledWith('Discard changes?', expect.any(String), expect.any(Array));
    expect(screen.getByLabelText('Title, required')).toHaveDisplayValue('Half-written idea');
  });

  it('shows inline validation and does not save an invalid task', async () => {
    const repository = seededRepository();
    const createTask = jest.spyOn(repository, 'createTask');
    const { user } = await renderApp({ taskRepository: repository });
    await signInAsDemoUser(user);
    await openTasksTab(user);

    await user.press(screen.getByRole('button', { name: 'Add task' }));
    await user.press(await screen.findByRole('button', { name: 'Save task' }));

    expect(screen.getByText('Enter a title.')).toBeOnTheScreen();
    expect(createTask).not.toHaveBeenCalled();
  });

  it('keeps the task and explains the problem when completing it fails', async () => {
    const repository = seededRepository([activeTask({ id: 'task-1', title: 'Pay rent', dueDate: today })]);
    jest.spyOn(repository, 'setTaskCompletion').mockResolvedValueOnce(err(networkError()));
    const { user } = await renderApp({ taskRepository: repository });
    await signInAsDemoUser(user);

    await user.press(await screen.findByRole('checkbox', { name: 'Pay rent' }));

    expect(await screen.findByText(/Couldn’t update “Pay rent”/)).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: 'Pay rent' })).not.toBeChecked();
  });

  it('filters and searches the task list', async () => {
    const repository = seededRepository([
      activeTask({ id: 'task-1', title: 'Renew passport', dueDate: today }),
      activeTask({ id: 'task-2', title: 'Plan team offsite', dueDate: addDays(today, 3) }),
      completedTask({ id: 'task-3', title: 'File taxes' }),
    ]);
    const { user } = await renderApp({ taskRepository: repository });
    await signInAsDemoUser(user);
    await openTasksTab(user);

    await user.press(screen.getByRole('radio', { name: 'Completed' }));
    expect(screen.getByText('File taxes')).toBeOnTheScreen();
    expect(screen.queryByText('Renew passport')).not.toBeOnTheScreen();

    await user.press(screen.getByRole('radio', { name: 'All' }));
    await user.type(screen.getByLabelText('Search tasks'), 'offsite');
    expect(screen.getByText('Plan team offsite')).toBeOnTheScreen();
    expect(screen.queryByText('File taxes')).not.toBeOnTheScreen();

    await user.type(screen.getByLabelText('Search tasks'), ' zzz');
    expect(screen.getByText('No matching tasks')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Clear filters' }));
    expect(await screen.findByText('Renew passport')).toBeOnTheScreen();
    expect(screen.getByLabelText('Search tasks')).toHaveDisplayValue('');
  });

  it('offers a retry when tasks fail to load', async () => {
    const repository = seededRepository([activeTask({ id: 'task-1', title: 'Water the plants', dueDate: today })]);
    jest.spyOn(repository, 'getTasks').mockResolvedValueOnce(err(networkError()));
    const { user } = await renderApp({ taskRepository: repository });
    await signInAsDemoUser(user);

    expect(await screen.findByText('Couldn’t load your tasks')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Water the plants')).toBeOnTheScreen();
  });

  it('summarises today on the dashboard', async () => {
    const repository = seededRepository([
      activeTask({ id: 'task-1', title: 'Send invoice', dueDate: addDays(today, -1) }),
      activeTask({ id: 'task-2', title: 'Call the bank', dueDate: today }),
      activeTask({ id: 'task-3', title: 'Prepare slides', dueDate: addDays(today, 2) }),
      completedTask({ id: 'task-4', title: 'Morning run', completedAt: new Date().toISOString() }),
    ]);
    const { user } = await renderApp({ taskRepository: repository });
    await signInAsDemoUser(user);

    expect(await screen.findByText('1 of 3 done')).toBeOnTheScreen();
    expect(screen.getByText('1 overdue · 1 due today · 1 upcoming')).toBeOnTheScreen();
    expect(screen.getByLabelText('Overdue, was due Yesterday')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar', { name: 'Today’s progress' })).toHaveAccessibilityValue({ min: 0, max: 3, now: 1 });
  });
});
