import { DEMO_ACCOUNT } from '@/config/demoAccount';

import { MockAuthService } from '../MockAuthService';

const NOW = new Date('2026-11-02T08:00:00.000Z');

describe('MockAuthService', () => {
  const service = new MockAuthService({ now: () => NOW });

  it('starts a session for the demo account, ignoring email case and whitespace', async () => {
    const result = await service.signIn({ email: ` ${DEMO_ACCOUNT.email.toUpperCase()} `, password: DEMO_ACCOUNT.password });

    expect(result).toEqual({ ok: true, value: { user: DEMO_ACCOUNT.user, startedAt: NOW.toISOString() } });
  });

  it('rejects other credentials as unauthorized', async () => {
    const result = await service.signIn({ email: DEMO_ACCOUNT.email, password: 'wrong' });

    expect(!result.ok && result.error.kind).toBe('unauthorized');
  });

  it('reports malformed input as a validation error with field messages', async () => {
    const result = await service.signIn({ email: 'nope', password: '' });

    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({ kind: 'validation', fieldErrors: { email: expect.any(String), password: expect.any(String) } }),
    });
  });

  describe('access token', () => {
    it('is issued on sign-in and discarded on sign-out', async () => {
      const tokenService = new MockAuthService({ createToken: () => 'token-1' });
      expect(tokenService.getAccessToken()).toBeNull();

      await tokenService.signIn({ email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password });
      expect(tokenService.getAccessToken()).toBe('token-1');

      const signingOut = tokenService.signOut();
      expect(tokenService.getAccessToken()).toBeNull();
      await signingOut;
    });

    it('is not issued when sign-in fails', async () => {
      const tokenService = new MockAuthService({ createToken: () => 'token-1' });

      await tokenService.signIn({ email: DEMO_ACCOUNT.email, password: 'wrong' });

      expect(tokenService.getAccessToken()).toBeNull();
    });

    it('is unique per session by default', async () => {
      const tokenService = new MockAuthService();
      const credentials = { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password };

      await tokenService.signIn(credentials);
      const first = tokenService.getAccessToken();
      await tokenService.signOut();
      await tokenService.signIn(credentials);

      expect(first).toEqual(expect.any(String));
      expect(tokenService.getAccessToken()).not.toBe(first);
    });
  });
});
