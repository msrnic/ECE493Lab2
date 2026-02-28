import { describe, expect, it } from 'vitest';
import {
  assertDraftVersionAccess,
  canAccessDraftVersion
} from '../../../src/models/draft-version-access-policy.js';

describe('draft-version-access-policy', () => {
  const submission = {
    ownerUserId: 'owner-1'
  };

  it('allows owner and admin access', () => {
    expect(canAccessDraftVersion(submission, 'owner-1', 'author')).toBe(true);
    expect(canAccessDraftVersion(submission, 'admin-1', 'admin')).toBe(true);
  });

  it('denies invalid actors and throws when asserted', () => {
    expect(canAccessDraftVersion(null, 'u1', 'author')).toBe(false);
    expect(canAccessDraftVersion(submission, '', 'author')).toBe(false);
    expect(canAccessDraftVersion(submission, 'u2', 'author')).toBe(false);
    expect(() => assertDraftVersionAccess(submission, 'u2', 'author')).toThrow(/access denied/);
  });
});
