import { describe, expect, it } from 'vitest';
import { createGatewayClient } from '../../../src/controllers/gateway-client.js';

describe('gateway-client', () => {
  it('maps default token prefixes to outcomes', async () => {
    const client = createGatewayClient();

    await expect(client.submitPayment({ paymentToken: 'tok_approve_x' })).resolves.toMatchObject({
      outcome: 'approved'
    });
    await expect(client.submitPayment({ paymentToken: 'tok_decline_x' })).resolves.toMatchObject({
      outcome: 'declined'
    });
    await expect(client.submitPayment({ paymentToken: 'tok_pending_x' })).resolves.toMatchObject({
      outcome: 'pending'
    });
  });

  it('supports injected implementations', async () => {
    const client = createGatewayClient({
      submitPayment: async () => ({ outcome: 'approved' }),
      verifySignature: () => false
    });

    expect(await client.submitPayment({ paymentToken: 'tok_anything' })).toEqual({ outcome: 'approved' });
    expect(client.verifySignature('sig')).toBe(false);
  });
});

