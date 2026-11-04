import { validateCredentials } from '../auth';

describe('validateCredentials', () => {
  it('normalises the email address', () => {
    expect(validateCredentials({ email: '  Demo@DayFlow.app ', password: 'secret' })).toEqual({
      ok: true,
      value: { email: 'demo@dayflow.app', password: 'secret' },
    });
  });

  it.each([
    [{ email: '', password: 'secret' }, { email: 'Enter your email address.' }],
    [{ email: 'not-an-email', password: 'secret' }, { email: 'Enter a valid email address.' }],
    [{ email: 'demo@dayflow.app', password: '' }, { password: 'Enter your password.' }],
  ])('rejects %o', (credentials, errors) => {
    expect(validateCredentials(credentials)).toEqual({ ok: false, error: errors });
  });
});
