import { describe, expect, it } from 'vitest';
import {
  createHttpIntegrationContext,
  invokeHandler
} from '../helpers/http-harness.js';
import { extractTokenFromConfirmationUrl } from '../helpers/test-support.js';

describe('UC-01-AS acceptance suite', () => {
  it('creates pending account and sends or queues confirmation email for valid registration', async () => {
    const { registrationController, repository, sentEmails, validRegistrationPayload } =
      createHttpIntegrationContext();

    const response = await invokeHandler(registrationController, {
      body: validRegistrationPayload()
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.status).toBe('pending');
    expect(['sent', 'queued_retry']).toContain(response.body.emailDelivery);

    const accounts = repository.listUserAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].status).toBe('pending');
    expect(sentEmails).toHaveLength(1);
  });

  it('returns validation errors and does not create account when required fields are missing', async () => {
    const { registrationController, repository } = createHttpIntegrationContext();

    const response = await invokeHandler(registrationController, { body: {} });

    expect(response.statusCode).toBe(422);
    expect(response.body.code).toBe('VALIDATION_FAILED');
    expect(response.body.errors.length).toBeGreaterThan(0);
    expect(repository.listUserAccounts()).toHaveLength(0);
  });

  it('transitions pending account to active with a valid confirmation token', async () => {
    const { registrationController, confirmationController, repository, sentEmails, validRegistrationPayload } =
      createHttpIntegrationContext();

    await invokeHandler(registrationController, {
      body: validRegistrationPayload()
    });
    const token = extractTokenFromConfirmationUrl(sentEmails[0].confirmationUrl);

    const response = await invokeHandler(confirmationController, {
      query: { token }
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('active');

    const account = repository.findUserById(response.body.accountId);
    expect(account.status).toBe('active');
  });

  it('rejects duplicate email and provides login/reset guidance', async () => {
    const { registrationController, repository, validRegistrationPayload } = createHttpIntegrationContext();

    await invokeHandler(registrationController, {
      body: validRegistrationPayload()
    });

    const duplicateResponse = await invokeHandler(registrationController, {
      body: validRegistrationPayload({ email: 'TEST.USER@example.com' })
    });

    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.body.message).toBe('Email already registered');
    expect(duplicateResponse.body.actions).toEqual(['login', 'reset_password']);
    expect(repository.listUserAccounts()).toHaveLength(1);
  });

  it('blocks registration after 5 attempts for the same email in 10 minutes', async () => {
    const { registrationController, validRegistrationPayload } = createHttpIntegrationContext();

    for (let i = 0; i < 5; i += 1) {
      await invokeHandler(registrationController, {
        body: validRegistrationPayload({ email: 'blocked@example.com', password: 'weak', confirmPassword: 'weak' })
      });
    }

    const blockedResponse = await invokeHandler(registrationController, {
      body: validRegistrationPayload({ email: 'blocked@example.com' })
    });

    expect(blockedResponse.statusCode).toBe(429);
    expect(Number(blockedResponse.headers['Retry-After'])).toBeGreaterThan(0);
    expect(blockedResponse.body.message).toContain('Too many registration attempts');
  });

  it('keeps account pending and queues retry when initial email delivery fails', async () => {
    const { registrationController, repository, validRegistrationPayload } = createHttpIntegrationContext({
      sendEmailImpl: async () => {
        throw new Error('SMTP unavailable');
      }
    });

    const response = await invokeHandler(registrationController, {
      body: validRegistrationPayload()
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.emailDelivery).toBe('queued_retry');

    const account = repository.listUserAccounts()[0];
    const job = repository.listEmailDeliveryJobs()[0];

    expect(account.status).toBe('pending');
    expect(job.status).toBe('queued_retry');
  });
});
