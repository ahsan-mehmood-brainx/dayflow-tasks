import { DEMO_ACCOUNT } from '@/config/demoAccount';
import { cancelledError, unauthorizedError, validationError, type AppError } from '@/shared/lib/appError';
import { err, ok, type Result } from '@/shared/lib/result';
import { wait } from '@/shared/lib/wait';

import { validateCredentials, type AuthService, type Credentials, type Session } from '../domain/auth';

export interface MockAuthServiceOptions {
  readonly latencyMs?: number;
  readonly now?: () => Date;
  /** Produces the opaque session token; injectable for deterministic tests. */
  readonly createToken?: () => string;
}

function createOpaqueToken(): string {
  return `mock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Simulated authentication for the training project. It accepts only the demo account and keeps no
 * secrets. It issues an opaque per-session token so the API layer's `Authorization` wiring is
 * exercised end to end, but no real server can verify that token: this exists to exercise the
 * sign-in lifecycle, not to secure anything.
 */
export class MockAuthService implements AuthService {
  private readonly latencyMs: number;
  private readonly now: () => Date;
  private readonly createToken: () => string;
  private accessToken: string | null = null;

  constructor({ latencyMs = 0, now = () => new Date(), createToken = createOpaqueToken }: MockAuthServiceOptions = {}) {
    this.latencyMs = latencyMs;
    this.now = now;
    this.createToken = createToken;
  }

  async signIn(credentials: Credentials, options?: { readonly signal?: AbortSignal }): Promise<Result<Session, AppError>> {
    const validated = validateCredentials(credentials);
    if (!validated.ok) return err(validationError('Check your email and password.', validated.error));

    if ((await wait(this.latencyMs, options?.signal)) === 'aborted') return err(cancelledError());

    const { email, password } = validated.value;
    if (email !== DEMO_ACCOUNT.email || password !== DEMO_ACCOUNT.password) {
      return err(unauthorizedError('That email and password don’t match the demo account.'));
    }
    this.accessToken = this.createToken();
    return ok({ user: { ...DEMO_ACCOUNT.user }, startedAt: this.now().toISOString() });
  }

  async signOut(): Promise<Result<void, AppError>> {
    this.accessToken = null;
    await wait(this.latencyMs);
    return ok(undefined);
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }
}
