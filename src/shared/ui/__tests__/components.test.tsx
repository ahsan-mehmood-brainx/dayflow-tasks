import { act, render, screen, userEvent } from '@testing-library/react-native';
import { AccessibilityInfo, Text } from 'react-native';

import { Banner } from '../Banner';
import { Chip } from '../Chip';
import { SegmentedControl } from '../SegmentedControl';
import { EmptyState, LoadingView } from '../StateViews';
import { ToastProvider, useToast } from '../Toast';

/** Non-focusable Views aren't matched by getByRole, so find the role by walking up from known text. */
type Element = ReturnType<typeof screen.getByText>;

function hasAncestorWithRole(element: Element, role: string): boolean {
  for (let node: Element | null = element; node !== null; node = node.parent) {
    if (node.props.accessibilityRole === role) return true;
  }
  return false;
}

describe('Banner', () => {
  let announce: jest.SpyInstance;

  beforeEach(() => {
    // jest-expo already mocks this method, so restoreMocks doesn't reset its call history; clear it explicitly.
    announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockClear().mockImplementation(() => undefined);
  });

  it('shows an error as an alert and announces it', async () => {
    await render(<Banner tone="error" title="Couldn’t sign in" message="Bad password" />);

    expect(hasAncestorWithRole(screen.getByText('Bad password'), 'alert')).toBe(true);
    expect(screen.getByText('Couldn’t sign in')).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledWith('Couldn’t sign in. Bad password');
  });

  it('announces just the message when there is no title', async () => {
    await render(<Banner tone="error" message="Bad password" />);
    expect(announce).toHaveBeenCalledWith('Bad password');
  });

  it('does not announce informational banners', async () => {
    await render(<Banner tone="info" message="FYI" />);

    expect(hasAncestorWithRole(screen.getByText('FYI'), 'alert')).toBe(false);
    expect(screen.getByText('FYI')).toBeOnTheScreen();
    expect(announce).not.toHaveBeenCalled();
  });

  it('renders an action button only when both label and handler are given', async () => {
    const onAction = jest.fn();
    const user = userEvent.setup();
    await render(<Banner tone="error" message="Offline" actionLabel="Retry" onAction={onAction} />);

    await user.press(screen.getByRole('button', { name: 'Retry' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('omits the action when there is no handler', async () => {
    await render(<Banner tone="info" message="FYI" actionLabel="Retry" />);
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });
});

describe('SegmentedControl', () => {
  const options = [
    { value: 'low', label: 'Low' },
    { value: 'high', label: 'High' },
  ] as const;

  it('is a labelled radio group that reports the selected option', async () => {
    await render(<SegmentedControl options={options} value="high" onChange={jest.fn()} accessibilityLabel="Priority" />);

    expect(screen.getByLabelText('Priority')).toHaveProp('accessibilityRole', 'radiogroup');
    expect(screen.getByRole('radio', { name: 'High' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Low' })).not.toBeChecked();
  });

  it('reports the pressed value', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<SegmentedControl options={options} value="high" onChange={onChange} accessibilityLabel="Priority" />);

    await user.press(screen.getByRole('radio', { name: 'Low' }));
    expect(onChange).toHaveBeenCalledWith('low');
  });
});

describe('Chip', () => {
  it('exposes its checked state and uses a custom accessibility label when given', async () => {
    await render(<Chip label="Today" selected accessibilityLabel="Show today" onPress={jest.fn()} />);
    expect(screen.getByRole('radio', { name: 'Show today' })).toBeChecked();
  });

  it('falls back to the visible label and handles presses', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<Chip label="Overdue" selected={false} onPress={onPress} />);

    const chip = screen.getByRole('radio', { name: 'Overdue' });
    expect(chip).not.toBeChecked();
    await user.press(chip);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('EmptyState and LoadingView', () => {
  it('renders title, message and an optional action', async () => {
    const onAction = jest.fn();
    const user = userEvent.setup();
    await render(<EmptyState icon="search" title="Nothing here" message="Add a task" actionLabel="Add" onAction={onAction} />);

    expect(screen.getByRole('header', { name: 'Nothing here' })).toBeOnTheScreen();
    expect(screen.getByText('Add a task')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Add' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('hides the action button when none is configured', async () => {
    await render(<EmptyState icon="search" title="Nothing here" message="Add a task" />);
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });

  it('marks the loading view busy and labelled', async () => {
    await render(<LoadingView label="Loading tasks…" />);
    expect(screen.getByLabelText('Loading tasks…')).toBeOnTheScreen();
    expect(screen.getByLabelText('Loading tasks…')).toBeBusy();
  });
});

describe('Toast', () => {
  function Trigger({ message, tone }: { readonly message: string; readonly tone?: 'success' | 'error' }) {
    const show = useToast();
    return <Text onPress={() => show(message, tone)}>show</Text>;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  });
  afterEach(() => jest.useRealTimers());

  it('throws a helpful error when used outside a provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(render(<Trigger message="x" />)).rejects.toThrow('useToast must be used within a ToastProvider.');
  });

  it('shows a toast, announces it, and removes it after the display time', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(
      <ToastProvider>
        <Trigger message="Task added" />
      </ToastProvider>,
    );

    expect(screen.queryByText('Task added')).not.toBeOnTheScreen();
    await user.press(screen.getByText('show'));

    expect(hasAncestorWithRole(screen.getByText('Task added'), 'alert')).toBe(true);
    expect(screen.getByText('Task added')).toBeOnTheScreen();
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Task added');

    await act(async () => {
      await jest.advanceTimersByTimeAsync(5000);
    });
    expect(screen.queryByText('Task added')).not.toBeOnTheScreen();
  });

  it('replaces the current toast when a new one is shown', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    function Two() {
      const show = useToast();
      return (
        <>
          <Text onPress={() => show('First')}>one</Text>
          <Text onPress={() => show('Second', 'error')}>two</Text>
        </>
      );
    }
    await render(
      <ToastProvider>
        <Two />
      </ToastProvider>,
    );

    await user.press(screen.getByText('one'));
    await user.press(screen.getByText('two'));

    expect(screen.queryByText('First')).not.toBeOnTheScreen();
    expect(screen.getByText('Second')).toBeOnTheScreen();
  });
});
