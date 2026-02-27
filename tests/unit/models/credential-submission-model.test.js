import { describe, expect, it } from 'vitest';
import {
  normalizeCredentialEmail,
  parseCredentialSubmission,
  validateCredentialSubmission
} from '../../../src/models/credential-submission-model.js';

describe('credential-submission-model', () => {
  it('normalizes email input', () => {
    expect(normalizeCredentialEmail('  USER@Example.com  ')).toBe('user@example.com');
    expect(normalizeCredentialEmail(undefined)).toBe('');
  });

  it('parses credential payload and keeps submitted timestamp', () => {
    const now = new Date('2026-02-01T10:15:00.000Z');
    const submission = parseCredentialSubmission(
      {
        email: '  USER@Example.com  ',
        password: 'secret'
      },
      now
    );

    expect(submission).toEqual({
      email: 'user@example.com',
      password: 'secret',
      submittedAt: '2026-02-01T10:15:00.000Z'
    });
  });

  it('handles non-object payloads', () => {
    const parsed = parseCredentialSubmission(null, new Date('2026-02-01T00:00:00.000Z'));
    expect(parsed.email).toBe('');
    expect(parsed.password).toBe('');
  });

  it('validates required fields', () => {
    const errors = validateCredentialSubmission({ email: '', password: '' });
    expect(errors).toEqual([
      { field: 'email', message: 'Email is required.' },
      { field: 'password', message: 'Password is required.' }
    ]);

    expect(
      validateCredentialSubmission({
        email: 'user@example.com',
        password: 'secret'
      })
    ).toEqual([]);
  });
});
