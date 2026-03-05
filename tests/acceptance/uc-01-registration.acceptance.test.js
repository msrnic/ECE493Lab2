import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import {
  createHttpIntegrationContext,
  invokeHandler
} from '../helpers/http-harness.js';
import { extractTokenFromConfirmationUrl } from '../helpers/test-support.js';

function getRouteHandler(app, method, path) {
  const layer = app.router.stack.find(
    (entry) => entry.route && entry.route.path === path && entry.route.methods[method]
  );

  return layer.route.stack[0].handle;
}

describe('UC-01-AS acceptance suite', () => {
  it('shows an initial index page where users can choose register or login', async () => {
    const app = createApp();
    const rootHandler = getRouteHandler(app, 'get', '/');
    const response = await invokeHandler(rootHandler);

    expect(response.statusCode).toBe(200);
    expect(response.contentType).toBe('html');
    expect(response.text).toContain('href="/register"');
    expect(response.text).toContain('href="/login"');
    expect(response.text).toContain('Final Schedule Preview');
    expect(response.text).toContain('data-final-schedule-root');
    expect(response.text).toContain('/assets/js/home-page.js');
  });

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

  it('transitions pending account to active and redirects to login with a valid confirmation token', async () => {
    const { registrationController, confirmationController, repository, sentEmails, validRegistrationPayload } =
      createHttpIntegrationContext();

    await invokeHandler(registrationController, {
      body: validRegistrationPayload()
    });
    const token = extractTokenFromConfirmationUrl(sentEmails[0].confirmationUrl);

    const response = await invokeHandler(confirmationController, {
      headers: { accept: 'text/html' },
      query: { token }
    });

    expect(response.statusCode).toBe(302);
    expect(response.redirectLocation).toBe('/login?confirmed=1');

    const account = repository.listUserAccounts()[0];
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
