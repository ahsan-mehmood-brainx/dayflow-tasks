import { screen } from '@testing-library/react-native';

import { DEMO_ACCOUNT } from '@/config/demoAccount';
import { renderApp } from '@/core/testing/renderApp';

describe('login form', () => {
  it('fills the demo credentials and signs in', async () => {
    const { user } = await renderApp();

    await user.press(screen.getByRole('button', { name: 'Use demo account' }));
    expect(screen.getByLabelText('Email, required')).toHaveDisplayValue(DEMO_ACCOUNT.email);
    expect(screen.getByLabelText('Password, required')).toHaveDisplayValue(DEMO_ACCOUNT.password);

    await user.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('header', { name: /^Good (morning|afternoon|evening), Alex$/ })).toBeOnTheScreen();
  });

  it('clears a field’s inline error as soon as the user edits that field', async () => {
    const { user } = await renderApp();

    await user.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Enter your email address.')).toBeOnTheScreen();
    expect(screen.getByText('Enter your password.')).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Email, required'), 'a');

    expect(screen.queryByText('Enter your email address.')).not.toBeOnTheScreen();
    expect(screen.getByText('Enter your password.')).toBeOnTheScreen();
  });

  it('dismisses the rejected-credentials banner when the user edits the form', async () => {
    const { user } = await renderApp();
    await user.type(screen.getByLabelText('Email, required'), DEMO_ACCOUNT.email);
    await user.type(screen.getByLabelText('Password, required'), 'wrong-password');
    await user.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('That email and password don’t match the demo account.')).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Password, required'), '!');

    expect(screen.queryByText('That email and password don’t match the demo account.')).not.toBeOnTheScreen();
  });

  it('dismisses the banner when the demo account is filled in', async () => {
    const { user } = await renderApp();
    await user.type(screen.getByLabelText('Email, required'), DEMO_ACCOUNT.email);
    await user.type(screen.getByLabelText('Password, required'), 'wrong-password');
    await user.press(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByText('That email and password don’t match the demo account.');

    await user.press(screen.getByRole('button', { name: 'Use demo account' }));

    expect(screen.queryByText('That email and password don’t match the demo account.')).not.toBeOnTheScreen();
  });
});
