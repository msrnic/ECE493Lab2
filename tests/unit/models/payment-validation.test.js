import { describe, expect, it } from 'vitest';
import {
  assertTokenOnlyPayload,
  readIdempotencyKey,
  validateIdempotencyKey,
  validatePaymentToken,
  validateUuid
} from '../../../src/models/payment-validation.js';

describe('payment-validation', () => {
  it('validates uuid, idempotency key, and token formats', () => {
    expect(() => validateUuid('11111111-1111-4111-8111-111111111111', 'sessionId')).not.toThrow();
    expect(validateIdempotencyKey('  abcdefgh  ')).toBe('abcdefgh');
    expect(validatePaymentToken('tok_approved_123')).toBe('tok_approved_123');
  });

  it('throws for invalid fields and pci scope violations', () => {
    expect(() => validateUuid('bad-uuid', 'sessionId')).toThrow('sessionId must be a valid UUID.');
    expect(() => validateIdempotencyKey('short')).toThrow('Idempotency-Key must be between 8 and 128 characters.');
    expect(() => validatePaymentToken('raw_card')).toThrow('paymentToken must be a gateway token reference.');
    expect(() => assertTokenOnlyPayload({ cardNumber: '4111111111111111' })).toThrow(
      'Raw cardholder fields are not allowed in this system.'
    );
    expect(() => validateUuid(undefined, 'sessionId')).toThrow('sessionId must be a valid UUID.');
    expect(() => validateIdempotencyKey(undefined)).toThrow('Idempotency-Key must be between 8 and 128 characters.');
    expect(() => validatePaymentToken(undefined)).toThrow('paymentToken must be a gateway token reference.');
    expect(() => assertTokenOnlyPayload(undefined)).not.toThrow();
  });

  it('reads idempotency key from either header form', () => {
    expect(readIdempotencyKey({ 'idempotency-key': 'lower' })).toBe('lower');
    expect(readIdempotencyKey({ 'Idempotency-Key': 'canonical' })).toBe('canonical');
    expect(readIdempotencyKey({})).toBeNull();
  });
});
