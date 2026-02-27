import { describe, expect, it } from 'vitest';
import { createConfirmationController } from '../../src/controllers/confirmation-controller.js';
import { hashToken } from '../../src/models/confirmation-token-service.js';
import { createInMemoryRepository } from '../../src/models/repository.js';
import {
  createHttpIntegrationContext,
  invokeHandler
} from '../helpers/http-harness.js';
import { extractTokenFromConfirmationUrl } from '../helpers/test-support.js';

describe('contract: GET /api/registrations/confirm', () => {
  it('returns 200 for valid token', async () => {
    const { registrationController, confirmationController, sentEmails, validRegistrationPayload } =
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
  });

  it('returns 400 for invalid token format or unknown token', async () => {
    const { confirmationController } = createHttpIntegrationContext();

    const formatResponse = await invokeHandler(confirmationController, {
      query: { token: 'short' }
    });
    expect(formatResponse.statusCode).toBe(400);

    const unknownResponse = await invokeHandler(confirmationController, {
      query: { token: 'a'.repeat(32) }
    });

    expect(unknownResponse.statusCode).toBe(400);
  });

  it('returns 410 for consumed or expired token', async () => {
    const { registrationController, confirmationController, sentEmails, clock, validRegistrationPayload } =
      createHttpIntegrationContext({
        tokenTtlMs: 1_000
      });

    await invokeHandler(registrationController, {
      body: validRegistrationPayload()
    });
    const token = extractTokenFromConfirmationUrl(sentEmails[0].confirmationUrl);

    const firstResponse = await invokeHandler(confirmationController, {
      query: { token }
    });
    expect(firstResponse.statusCode).toBe(200);

    const consumedResponse = await invokeHandler(confirmationController, {
      query: { token }
    });
    expect(consumedResponse.statusCode).toBe(410);

    await invokeHandler(registrationController, {
      body: validRegistrationPayload({ email: 'second@example.com' })
    });
    const secondToken = extractTokenFromConfirmationUrl(sentEmails[1].confirmationUrl);

    clock.advanceMs(1_500);
    const expiredResponse = await invokeHandler(confirmationController, {
      query: { token: secondToken }
    });

    expect(expiredResponse.statusCode).toBe(410);
  });

  it('returns 400 when token exists but user account is missing', async () => {
    const { repository, confirmationController } = createHttpIntegrationContext();
    const token = 'f'.repeat(32);

    repository.createConfirmationToken({
      id: 'token-1',
      userAccountId: 'missing-account',
      tokenHash: hashToken(token),
      expiresAt: '2026-01-01T01:00:00.000Z',
      consumedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z'
    });

    const response = await invokeHandler(confirmationController, {
      query: { token }
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.code).toBe('INVALID_CONFIRMATION_TOKEN');
  });

  it('uses default nowFn when omitted from controller factory', async () => {
    const repository = createInMemoryRepository();
    const token = 'e'.repeat(32);
    repository.createUserAccount({
      id: 'acct-default-now',
      fullName: 'Default Time',
      emailNormalized: 'default-now@example.com',
      passwordHash: 'hash',
      status: 'pending',
      createdAt: '2026-01-01T00:00:00.000Z',
      activatedAt: null
    });
    repository.createConfirmationToken({
      id: 'token-default-now',
      userAccountId: 'acct-default-now',
      tokenHash: hashToken(token),
      expiresAt: '2999-01-01T00:00:00.000Z',
      consumedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z'
    });

    const confirmationController = createConfirmationController({ repository });
    const response = await invokeHandler(confirmationController, {
      query: { token }
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('active');
  });
});
