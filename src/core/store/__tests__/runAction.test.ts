import { networkError } from '@/shared/lib/appError';

import { runAction } from '../runAction';

describe('runAction', () => {
  it('reports a resolved thunk as succeeded with its value', async () => {
    await expect(runAction({ unwrap: () => Promise.resolve(42) })).resolves.toEqual({ status: 'succeeded', value: 42 });
  });

  it('reports a typed AppError rejection as failed with that error', async () => {
    const error = networkError();
    await expect(runAction({ unwrap: () => Promise.reject(error) })).resolves.toEqual({ status: 'failed', error });
  });

  it('wraps any other rejection in a generic unexpected error', async () => {
    const outcome = await runAction({ unwrap: () => Promise.reject(new Error('boom')) });
    expect(outcome).toMatchObject({ status: 'failed', error: { kind: 'unexpected' } });
    if (outcome.status === 'failed') expect(outcome.error.message).not.toContain('boom');
  });

  it('reports a declined thunk condition as skipped, not failed', async () => {
    const conditionError = Object.assign(new Error('declined'), { name: 'ConditionError' });
    await expect(runAction({ unwrap: () => Promise.reject(conditionError) })).resolves.toEqual({ status: 'skipped' });
  });
});
