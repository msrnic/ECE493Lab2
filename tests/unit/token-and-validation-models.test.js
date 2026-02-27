import { describe, expect, it } from 'vitest';
import { createInMemoryRepository } from '../../src/models/repository.js';
import { buildValidationErrorResponse, parseRegistrationSubmission } from '../../src/models/registration-submission-model.js';
import { createTokenPair, hashToken, isTokenFormatValid } from '../../src/models/confirmation-token-service.js';
import {
  consumeConfirmationToken,
  createEmailConfirmationToken,
  isConfirmationTokenExpired
} from '../../src/models/email-confirmation-token-model.js';
import { isDuplicateEmail, normalizeEmail } from '../../src/models/email-normalization.js';
import { validatePasswordPolicy, validateRegistrationFields } from '../../src/models/registration-validation.js';
import { getRegistrationStatusMessage } from '../../src/views/registration-status-view.js';

describe('token and validation models', () => {
  it('normalizes email and checks duplicates', () => {
    const repository = createInMemoryRepository();
    repository.createUserAccount({
      id: 'acct-1',
      emailNormalized: 'test@example.com',
      status: 'active'
    });

    expect(normalizeEmail('  TEST@Example.Com  ')).toBe('test@example.com');
    expect(normalizeEmail(null)).toBe('');
    expect(isDuplicateEmail(repository, '')).toBe(false);
    expect(isDuplicateEmail(repository, 'test@example.com')).toBe(true);
  });

  it('creates token pairs, hashes tokens, and validates token format', () => {
    const pair = createTokenPair({ randomBytesFn: () => Buffer.from('a'.repeat(24)) });

    expect(pair.token.length).toBeGreaterThanOrEqual(32);
    expect(pair.tokenHash).toBe(hashToken(pair.token));
    expect(isTokenFormatValid(pair.token)).toBe(true);
    expect(isTokenFormatValid('too-short')).toBe(false);
    expect(isTokenFormatValid(undefined)).toBe(false);
  });

  it('handles confirmation token lifecycle', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const token = createEmailConfirmationToken({
      userAccountId: 'acct-1',
      tokenHash: 'token-hash',
      now,
      ttlMs: 1_000
    });

    expect(isConfirmationTokenExpired(token, new Date('2026-01-01T00:00:00.500Z'))).toBe(false);
    expect(isConfirmationTokenExpired(token, new Date('2026-01-01T00:00:01.000Z'))).toBe(true);

    const consumed = consumeConfirmationToken(token, new Date('2026-01-01T00:00:02.000Z'));
    expect(consumed.consumedAt).toBe('2026-01-01T00:00:02.000Z');
  });

  it('parses registration submission and maps validation response', () => {
    const parsed = parseRegistrationSubmission({
      fullName: 'Name',
      email: 'name@example.com',
      password: 'StrongPass!2026',
      confirmPassword: 'StrongPass!2026'
    });

    expect(parsed.fullName).toBe('Name');
    expect(parseRegistrationSubmission(null).email).toBe('');

    const response = buildValidationErrorResponse([{ field: 'email', code: 'REQUIRED', message: 'x' }]);
    expect(response.code).toBe('VALIDATION_FAILED');
    expect(response.errors).toHaveLength(1);
  });

  it('validates password policy and registration fields', () => {
    expect(validatePasswordPolicy('StrongPass!2026')).toEqual([]);
    expect(validatePasswordPolicy(null)).toContain('PASSWORD_TOO_SHORT');

    const weakIssues = validatePasswordPolicy('weak');
    expect(weakIssues).toContain('PASSWORD_TOO_SHORT');
    expect(weakIssues).toContain('PASSWORD_MISSING_UPPERCASE');
    expect(weakIssues).toContain('PASSWORD_MISSING_NUMBER');
    expect(weakIssues).toContain('PASSWORD_MISSING_SYMBOL');

    const invalidErrors = validateRegistrationFields({
      fullName: '',
      email: 'invalid',
      password: 'weak',
      confirmPassword: 'different'
    });

    expect(invalidErrors.some((error) => error.field === 'fullName')).toBe(true);
    expect(invalidErrors.some((error) => error.field === 'email')).toBe(true);
    expect(invalidErrors.some((error) => error.field === 'password')).toBe(true);
    expect(invalidErrors.some((error) => error.field === 'confirmPassword')).toBe(true);

    const missingFieldErrors = validateRegistrationFields({});
    expect(missingFieldErrors.some((error) => error.field === 'fullName')).toBe(true);
    expect(missingFieldErrors.some((error) => error.field === 'email')).toBe(true);
    expect(missingFieldErrors.some((error) => error.field === 'password')).toBe(true);

    const lengthErrors = validateRegistrationFields({
      fullName: 'x'.repeat(121),
      email: `${'x'.repeat(318)}@x.com`,
      password: 'StrongPass!2026',
      confirmPassword: 'StrongPass!2026'
    });

    expect(lengthErrors.some((error) => error.code === 'MAX_LENGTH')).toBe(true);
  });

  it('returns status message for sent and queued outcomes', () => {
    expect(getRegistrationStatusMessage('sent')).toContain('Please check your email');
    expect(getRegistrationStatusMessage('queued_retry')).toContain('retry has been queued');
  });
});
