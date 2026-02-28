import { describe, expect, it } from 'vitest';
import {
  assertCanViewInvitationFailureLogs,
  canViewInvitationFailureLogs
} from '../../../src/controllers/authorization.policy.js';

describe('failure-log authorization policy', () => {
  it('allows support and admin users', () => {
    expect(canViewInvitationFailureLogs({ actorRole: 'support', paperId: 'paper-1' })).toBe(true);
    expect(canViewInvitationFailureLogs({ actorRole: 'admin', paperId: 'paper-1' })).toBe(true);
  });

  it('allows editors when paper ownership is not restricted', () => {
    expect(canViewInvitationFailureLogs({ actorRole: 'editor', paperId: 'paper-1', editorPaperIds: [] })).toBe(true);
  });

  it('allows editors for owned papers and denies unowned papers', () => {
    expect(canViewInvitationFailureLogs({
      actorRole: 'editor',
      paperId: 'paper-1',
      editorPaperIds: ['paper-1', 'paper-2']
    })).toBe(true);

    expect(canViewInvitationFailureLogs({
      actorRole: 'editor',
      paperId: 'paper-3',
      editorPaperIds: ['paper-1', 'paper-2']
    })).toBe(false);
  });

  it('supports comma-delimited editor paper ids from request headers', () => {
    expect(canViewInvitationFailureLogs({
      actorRole: 'editor',
      paperId: 'paper-1',
      editorPaperIds: 'paper-1,paper-2'
    })).toBe(true);

    expect(canViewInvitationFailureLogs({
      actorRole: 'editor',
      paperId: 'paper-4',
      editorPaperIds: 'paper-1,paper-2'
    })).toBe(false);
  });

  it('denies non-privileged roles', () => {
    expect(canViewInvitationFailureLogs({ actorRole: 'reviewer', paperId: 'paper-1' })).toBe(false);
    expect(canViewInvitationFailureLogs({ actorRole: 'author', paperId: 'paper-1' })).toBe(false);
    expect(canViewInvitationFailureLogs({ paperId: 'paper-1' })).toBe(false);
  });

  it('throws standardized forbidden error when unauthorized', () => {
    expect(() => assertCanViewInvitationFailureLogs({ actorRole: 'reviewer', paperId: 'paper-1' })).toThrowError(
      /do not have access/
    );

    try {
      assertCanViewInvitationFailureLogs({ actorRole: 'reviewer', paperId: 'paper-1' });
    } catch (error) {
      expect(error.code).toBe('INVITATION_FORBIDDEN');
      expect(error.status).toBe(403);
    }
  });
});
