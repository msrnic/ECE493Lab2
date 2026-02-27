import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { hashPassword } from '../../src/models/user-account-model.js';
import { invokeHandler } from '../helpers/http-harness.js';

function seedActiveAccount(app) {
  app.locals.repository.createUserAccount({
    id: 'usr-performance',
    fullName: 'Performance User',
    emailNormalized: 'perf@example.com',
    passwordHash: hashPassword('StrongPass!2026'),
    status: 'active',
    createdAt: '2026-02-01T00:00:00.000Z',
    activatedAt: '2026-02-01T00:00:00.000Z'
  });
}

async function runInBatches(total, concurrency, taskFactory) {
  const durations = [];

  for (let offset = 0; offset < total; offset += concurrency) {
    const batchSize = Math.min(concurrency, total - offset);
    const batchResults = await Promise.all(
      Array.from({ length: batchSize }, () => taskFactory())
    );
    durations.push(...batchResults);
  }

  return durations;
}

function percentile(values, p) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1);
  return sorted[index];
}

describe('performance: auth api', () => {
  it('meets p95 <= 500ms for 500 login requests at 50 concurrency', async () => {
    const app = createApp();
    seedActiveAccount(app);

    const durations = await runInBatches(500, 50, async () => {
      const started = Date.now();
      const response = await invokeHandler(app.locals.authController.login, {
        body: {
          email: 'perf@example.com',
          password: 'StrongPass!2026'
        }
      });

      expect(response.statusCode).toBe(200);

      return Date.now() - started;
    });

    const p95 = percentile(durations, 0.95);
    expect(p95).toBeLessThanOrEqual(500);
  }, 30000);
});
