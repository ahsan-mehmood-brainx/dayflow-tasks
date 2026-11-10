import { createSlice, isAnyOf } from '@reduxjs/toolkit';

import { createAppAsyncThunk } from '@/core/store/createAppAsyncThunk';
import { unexpectedError, type AppError } from '@/shared/lib/appError';

import type { Credentials, Session } from '../domain/auth';

/**
 * Each status carries exactly the data valid for it: a session exists only while signed in (or
 * signing out), and a sign-in error only while signed out.
 */
export type AuthState =
  | { readonly status: 'signedOut'; readonly error: AppError | null }
  | { readonly status: 'signingIn' }
  | { readonly status: 'signedIn'; readonly session: Session }
  | { readonly status: 'signingOut'; readonly session: Session };

function signedOutState(error: AppError | null = null): AuthState {
  return { status: 'signedOut', error };
}

export const signIn = createAppAsyncThunk(
  'auth/signIn',
  async (credentials: Credentials, { extra, signal, rejectWithValue }) => {
    const result = await extra.authService.signIn(credentials, { signal });
    return result.ok ? result.value : rejectWithValue(result.error);
  },
  // Ignores repeat submissions while a sign-in is running or a session already exists.
  { condition: (_, { getState }) => getState().auth.status === 'signedOut' },
);

export const signOut = createAppAsyncThunk(
  'auth/signOut',
  async (_: void, { extra }) => {
    // Ending the local session must never depend on the service, so its result is deliberately ignored.
    await extra.authService.signOut();
  },
  { condition: (_, { getState }) => getState().auth.status === 'signedIn' },
);

export const authSlice = createSlice({
  name: 'auth',
  initialState: signedOutState(),
  reducers: {
    signInErrorDismissed: (state) => (state.status === 'signedOut' ? signedOutState() : state),
  },
  extraReducers: (builder) => {
    builder
      .addCase(signIn.pending, (): AuthState => ({ status: 'signingIn' }))
      .addCase(signIn.fulfilled, (_, action): AuthState => ({ status: 'signedIn', session: action.payload }))
      .addCase(signIn.rejected, (_, action) => {
        const error = action.payload ?? unexpectedError();
        return signedOutState(error.kind === 'cancelled' ? null : error);
      })
      .addCase(signOut.pending, (state): AuthState => (state.status === 'signedIn' ? { status: 'signingOut', session: state.session } : state))
      // The session ends even if the service call fails.
      .addMatcher(isAnyOf(signOut.fulfilled, signOut.rejected), () => signedOutState());
  },
});

export const { signInErrorDismissed } = authSlice.actions;
