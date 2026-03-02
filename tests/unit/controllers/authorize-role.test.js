import { describe, expect, it, vi } from 'vitest';

import authorizeRole from '../../../src/controllers/middleware/authorizeRole.js';

function createResponseDouble() {
  const res = {
    status: vi.fn(),
    json: vi.fn()
  };

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);

  return res;
}

describe('authorizeRole middleware', () => {
  it('rejects when role missing or unauthorized', () => {
    const middleware = authorizeRole('admin');
    const res = createResponseDouble();
    const next = vi.fn();

    middleware({ user: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);

    middleware({ user: { role: 'editor' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows authorized roles', () => {
    const middleware = authorizeRole('admin', 'editor');
    const res = createResponseDouble();
    const next = vi.fn();

    middleware({ user: { role: 'editor' } }, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
