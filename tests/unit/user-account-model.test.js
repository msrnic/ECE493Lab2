import { describe, expect, it } from 'vitest';
import {
  activateUserAccount,
  createPendingUserAccount,
  hashPassword
} from '../../src/models/user-account-model.js';

describe('user-account-model', () => {
  it('creates pending account and trims full name', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const account = createPendingUserAccount({
      fullName: '  Alice Example  ',
      emailNormalized: 'alice@example.com',
      passwordHash: 'hash',
      now
    });

    expect(account.fullName).toBe('Alice Example');
    expect(account.status).toBe('pending');
    expect(account.activatedAt).toBeNull();
    expect(account.createdAt).toBe(now.toISOString());
  });

  it('activates pending account', () => {
    const pending = createPendingUserAccount({
      fullName: 'Bob',
      emailNormalized: 'bob@example.com',
      passwordHash: 'hash',
      now: new Date('2026-01-01T00:00:00.000Z')
    });

    const activated = activateUserAccount(pending, new Date('2026-01-01T01:00:00.000Z'));

    expect(activated.status).toBe('active');
    expect(activated.activatedAt).toBe('2026-01-01T01:00:00.000Z');
  });

  it('keeps active account unchanged when activate is called again', () => {
    const active = {
      id: 'acct-1',
      status: 'active',
      activatedAt: '2026-01-01T01:00:00.000Z'
    };

    expect(activateUserAccount(active)).toBe(active);
  });

  it('hashes passwords deterministically', () => {
    expect(hashPassword('StrongPass!2026')).toMatch(/^[a-f0-9]{64}$/);
    expect(hashPassword('StrongPass!2026')).toBe(hashPassword('StrongPass!2026'));
    expect(hashPassword('StrongPass!2026')).not.toBe(hashPassword('DifferentPass!2026'));
  });
});
