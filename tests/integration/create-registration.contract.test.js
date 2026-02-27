import { describe, expect, it } from 'vitest';
import {
  createHttpIntegrationContext,
  invokeHandler
} from '../helpers/http-harness.js';

describe('contract: POST /api/registrations', () => {
  it('returns 201 for valid payload', async () => {
    const { registrationController, validRegistrationPayload } = createHttpIntegrationContext();

    const response = await invokeHandler(registrationController, {
      body: validRegistrationPayload()
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.status).toBe('pending');
    expect(['sent', 'queued_retry']).toContain(response.body.emailDelivery);
  });

  it('returns 422 for invalid payload', async () => {
    const { registrationController, validRegistrationPayload } = createHttpIntegrationContext();

    const response = await invokeHandler(registrationController, {
      body: validRegistrationPayload({ email: 'bad', password: 'weak', confirmPassword: 'nope' })
    });

    expect(response.statusCode).toBe(422);
    expect(response.body.code).toBe('VALIDATION_FAILED');
    expect(Array.isArray(response.body.errors)).toBe(true);
  });

  it('returns 409 for duplicate email', async () => {
    const { registrationController, validRegistrationPayload } = createHttpIntegrationContext();

    await invokeHandler(registrationController, {
      body: validRegistrationPayload()
    });

    const duplicateResponse = await invokeHandler(registrationController, {
      body: validRegistrationPayload({ fullName: 'Another User', email: '  TEST.USER@example.com ' })
    });

    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.body.code).toBe('EMAIL_ALREADY_REGISTERED');
    expect(duplicateResponse.body.actions).toEqual(['login', 'reset_password']);
  });

  it('returns 429 after 5 attempts for same email within 10 minutes', async () => {
    const { registrationController, validRegistrationPayload } = createHttpIntegrationContext();

    for (let i = 0; i < 5; i += 1) {
      const attemptResponse = await invokeHandler(registrationController, {
        body: validRegistrationPayload({
          email: 'blocked@example.com',
          password: 'weak',
          confirmPassword: 'weak'
        })
      });

      expect(attemptResponse.statusCode).toBe(422);
    }

    const blockedResponse = await invokeHandler(registrationController, {
      body: validRegistrationPayload({ email: 'blocked@example.com' })
    });

    expect(blockedResponse.statusCode).toBe(429);
    expect(blockedResponse.body.code).toBe('REGISTRATION_TEMPORARILY_BLOCKED');
    expect(Number(blockedResponse.headers['Retry-After'])).toBeGreaterThan(0);
  });
});
