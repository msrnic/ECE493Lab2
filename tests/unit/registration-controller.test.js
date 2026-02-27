import { describe, expect, it, vi } from 'vitest';
import { createInMemoryRepository } from '../../src/models/repository.js';
import { createRegistrationController } from '../../src/controllers/registration-controller.js';
import { recordRegistrationAttempt } from '../../src/models/registration-attempt-model.js';

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };
}

describe('registration-controller', () => {
  it('returns 422 for invalid payload', async () => {
    const repository = createInMemoryRepository();
    const emailDeliveryService = {
      deliverRegistrationConfirmation: vi.fn()
    };

    const controller = createRegistrationController({
      repository,
      emailDeliveryService,
      nowFn: () => new Date('2026-01-01T00:00:00.000Z')
    });

    const req = { body: { email: 'invalid' } };
    const res = createMockResponse();

    await controller(req, res);

    expect(res.statusCode).toBe(422);
    expect(res.payload.code).toBe('VALIDATION_FAILED');
    expect(repository.listUserAccounts()).toHaveLength(0);
  });

  it('returns 409 for duplicate email and guidance actions', async () => {
    const repository = createInMemoryRepository();
    repository.createUserAccount({
      id: 'acct-1',
      fullName: 'Existing',
      emailNormalized: 'test@example.com',
      passwordHash: 'hash',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      activatedAt: '2026-01-01T00:00:00.000Z'
    });

    const controller = createRegistrationController({
      repository,
      emailDeliveryService: { deliverRegistrationConfirmation: vi.fn() },
      nowFn: () => new Date('2026-01-01T00:00:10.000Z')
    });

    const req = {
      body: {
        fullName: 'New User',
        email: 'TEST@EXAMPLE.COM',
        password: 'StrongPass!2026',
        confirmPassword: 'StrongPass!2026'
      }
    };
    const res = createMockResponse();

    await controller(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.payload.message).toBe('Email already registered');
    expect(res.payload.actions).toEqual(['login', 'reset_password']);
  });

  it('returns 429 and retry-after when throttled', async () => {
    const repository = createInMemoryRepository();
    const now = new Date('2026-01-01T00:00:00.000Z');

    for (let i = 0; i < 5; i += 1) {
      recordRegistrationAttempt(repository, {
        emailNormalized: 'blocked@example.com',
        outcome: 'validation_failed',
        now: new Date(now.getTime() + i * 1000)
      });
    }

    const controller = createRegistrationController({
      repository,
      emailDeliveryService: { deliverRegistrationConfirmation: vi.fn() },
      nowFn: () => new Date('2026-01-01T00:00:06.000Z')
    });

    const req = {
      body: {
        fullName: 'Blocked',
        email: 'blocked@example.com',
        password: 'StrongPass!2026',
        confirmPassword: 'StrongPass!2026'
      }
    };
    const res = createMockResponse();

    await controller(req, res);

    expect(res.statusCode).toBe(429);
    expect(Number(res.headers['Retry-After'])).toBeGreaterThan(0);
    expect(res.payload.code).toBe('REGISTRATION_TEMPORARILY_BLOCKED');
  });

  it('returns 201 and sent status when email delivery succeeds', async () => {
    const repository = createInMemoryRepository();
    const controller = createRegistrationController({
      repository,
      emailDeliveryService: {
        deliverRegistrationConfirmation: vi.fn().mockResolvedValue({
          emailDelivery: 'sent'
        })
      },
      nowFn: () => new Date('2026-01-01T00:00:00.000Z'),
      hashPasswordFn: () => 'hashed'
    });

    const req = {
      body: {
        fullName: 'Success User',
        email: 'success@example.com',
        password: 'StrongPass!2026',
        confirmPassword: 'StrongPass!2026'
      }
    };
    const res = createMockResponse();

    await controller(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.payload.status).toBe('pending');
    expect(res.payload.emailDelivery).toBe('sent');
    expect(repository.listUserAccounts()).toHaveLength(1);
    expect(repository.listConfirmationTokens()).toHaveLength(1);
  });

  it('returns 201 and queued_retry status when initial email send fails', async () => {
    const repository = createInMemoryRepository();
    const controller = createRegistrationController({
      repository,
      emailDeliveryService: {
        deliverRegistrationConfirmation: vi.fn().mockResolvedValue({
          emailDelivery: 'queued_retry'
        })
      },
      nowFn: () => new Date('2026-01-01T00:00:00.000Z')
    });

    const req = {
      body: {
        fullName: 'Retry User',
        email: 'retry@example.com',
        password: 'StrongPass!2026',
        confirmPassword: 'StrongPass!2026'
      }
    };
    const res = createMockResponse();

    await controller(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.payload.emailDelivery).toBe('queued_retry');
  });

  it('uses default nowFn and password hashing when optional args are omitted', async () => {
    const repository = createInMemoryRepository();
    const controller = createRegistrationController({
      repository,
      emailDeliveryService: {
        deliverRegistrationConfirmation: vi.fn().mockResolvedValue({
          emailDelivery: 'sent'
        })
      }
    });

    const req = {
      body: {
        fullName: 'Default Options',
        email: 'defaults@example.com',
        password: 'StrongPass!2026',
        confirmPassword: 'StrongPass!2026'
      }
    };
    const res = createMockResponse();

    await controller(req, res);

    expect(res.statusCode).toBe(201);
    const account = repository.findUserByNormalizedEmail('defaults@example.com');
    expect(account.passwordHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
