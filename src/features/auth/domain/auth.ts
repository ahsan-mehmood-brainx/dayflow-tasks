import type { AppError } from '@/shared/lib/appError';
import type { IsoTimestamp } from '@/shared/lib/calendarDate';
import { err, ok, type Result } from '@/shared/lib/result';

export interface User {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
}

export interface Session {
  readonly user: User;
  readonly startedAt: IsoTimestamp;
}

export interface Credentials {
  readonly email: string;
  readonly password: string;
}

export type CredentialErrors = Partial<Record<keyof Credentials, string>>;

export interface AuthService {
  /** Resolves with `validation` for malformed input and `unauthorized` for rejected credentials. */
  signIn(credentials: Credentials, options?: { readonly signal?: AbortSignal }): Promise<Result<Session, AppError>>;
  /** Discards the access token synchronously, before any network round trip, so it is never reused. */
  signOut(): Promise<Result<void, AppError>>;
  /**
   * The bearer token for the current session, or `null` when signed out. Kept inside the service
   * (never in Redux) so it does not leak into state snapshots or dev tooling.
   */
  getAccessToken(): string | null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normalises the email (trimmed, lower-case) and checks both fields are usable. */
export function validateCredentials({ email, password }: Credentials): Result<Credentials, CredentialErrors> {
  const normalizedEmail = email.trim().toLowerCase();
  const errors: CredentialErrors = {};

  if (normalizedEmail === '') errors.email = 'Enter your email address.';
  else if (!EMAIL_PATTERN.test(normalizedEmail)) errors.email = 'Enter a valid email address.';
  if (password === '') errors.password = 'Enter your password.';

  return Object.keys(errors).length > 0 ? err(errors) : ok({ email: normalizedEmail, password });
}
