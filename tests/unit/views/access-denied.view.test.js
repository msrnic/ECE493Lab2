import { describe, expect, it } from 'vitest';
import { renderAccessDeniedView } from '../../../src/views/access-denied.view.js';

describe('access-denied.view', () => {
  it('renders reason-based denial messages', () => {
    expect(renderAccessDeniedView({ reasonCode: 'ACCESS_REVOKED' }).message).toContain('revoked');
    expect(renderAccessDeniedView({ reasonCode: 'ACCESS_NOT_ASSIGNED' }).message).toContain('not assigned');
    expect(renderAccessDeniedView({ reasonCode: 'UNEXPECTED' }).message).toContain('denied');
    expect(renderAccessDeniedView({ reasonCode: 'ACCESS_REVOKED', message: 'Custom denial' }).message).toBe('Custom denial');
    expect(renderAccessDeniedView({}).reasonCode).toBe('ACCESS_REVOKED');
  });
});
