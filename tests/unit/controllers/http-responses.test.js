import { describe, expect, it, vi } from 'vitest';

import { sendError, sendSuccess } from '../../../src/controllers/http/responses.js';

function createResponseDouble() {
  const res = {
    status: vi.fn(),
    json: vi.fn()
  };

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);

  return res;
}

describe('responses helpers', () => {
  it('sends success payloads', () => {
    const res = createResponseDouble();
    sendSuccess(res, 200, { ok: true });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('sends error payloads with and without details', () => {
    const res = createResponseDouble();
    sendError(res, 422, 'VALIDATION_ERROR', 'invalid');
    expect(res.json).toHaveBeenCalledWith({ code: 'VALIDATION_ERROR', message: 'invalid' });

    sendError(res, 422, 'VALIDATION_ERROR', 'invalid', { field: 'x' });
    expect(res.json).toHaveBeenLastCalledWith({
      code: 'VALIDATION_ERROR',
      message: 'invalid',
      details: { field: 'x' }
    });
  });
});
