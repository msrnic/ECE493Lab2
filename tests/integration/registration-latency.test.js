import { describe, expect, it } from 'vitest';
import { measureValidation } from '../../src/assets/js/registration-form.js';
import {
  createHttpIntegrationContext,
  invokeHandler
} from '../helpers/http-harness.js';

describe('registration latency benchmarks', () => {
  it('keeps p95 POST /api/registrations latency under 1000ms in test conditions', async () => {
    const { registrationController, validRegistrationPayload } = createHttpIntegrationContext();
    const durations = [];

    for (let i = 0; i < 20; i += 1) {
      const payload = validRegistrationPayload({ email: `latency-${i}@example.com` });
      const start = performance.now();
      const response = await invokeHandler(registrationController, { body: payload });
      const end = performance.now();

      expect(response.statusCode).toBe(201);
      durations.push(end - start);
    }

    durations.sort((a, b) => a - b);
    const p95 = durations[Math.ceil(durations.length * 0.95) - 1];

    expect(p95).toBeLessThanOrEqual(1000);
  });

  it('keeps p95 client-side validation feedback under 200ms in test conditions', () => {
    const durations = [];

    for (let i = 0; i < 50; i += 1) {
      const result = measureValidation({
        fullName: `User ${i}`,
        email: `user-${i}@example.com`,
        password: 'StrongPass!2026',
        confirmPassword: 'StrongPass!2026'
      });
      durations.push(result.durationMs);
    }

    durations.sort((a, b) => a - b);
    const p95 = durations[Math.ceil(durations.length * 0.95) - 1];

    expect(p95).toBeLessThanOrEqual(200);
  });
});
