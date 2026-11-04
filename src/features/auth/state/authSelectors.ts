import type { RootState } from '@/core/store/store';
import type { AppError } from '@/shared/lib/appError';

import type { Session, User } from '../domain/auth';

export function selectSession(state: RootState): Session | null {
  const { auth } = state;
  return auth.status === 'signedIn' || auth.status === 'signingOut' ? auth.session : null;
}

/** The single source of truth for the auth gate. */
export function selectIsAuthenticated(state: RootState): boolean {
  return selectSession(state) !== null;
}

export function selectCurrentUser(state: RootState): User | null {
  return selectSession(state)?.user ?? null;
}

export function selectSignInError(state: RootState): AppError | null {
  return state.auth.status === 'signedOut' ? state.auth.error : null;
}

export function selectIsSigningIn(state: RootState): boolean {
  return state.auth.status === 'signingIn';
}

export function selectIsSigningOut(state: RootState): boolean {
  return state.auth.status === 'signingOut';
}
