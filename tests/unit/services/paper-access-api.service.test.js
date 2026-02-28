import { describe, expect, it } from 'vitest';
import { createPaperAccessApiService } from '../../../src/services/paper-access-api.service.js';

function createService() {
  return createPaperAccessApiService({
    idFactory: (() => {
      let value = 0;
      return () => `id-${++value}`;
    })(),
    nowFn: () => new Date('2026-02-08T00:00:00.000Z')
  });
}

describe('paper-access-api.service', () => {
  it('handles assigned-paper listing and denied access states', () => {
    const service = createService();
    service.upsertPaper({
      paperId: 'paper-1',
      title: 'Paper 1',
      files: [{ fileId: 'file-1', fileName: 'paper1.pdf', contentType: 'application/pdf', sizeBytes: 10 }],
      editorIds: ['editor-1']
    });
    service.assignReviewer({ reviewerId: 'account-reviewer-1', paperId: 'paper-1' });

    expect(service.listAssignedPapers({ reviewerId: null }).status).toBe(401);
    expect(service.listAssignedPapers({ reviewerId: 'account-reviewer-1' }).body.papers).toHaveLength(1);

    const denied = service.getPaperFiles({ reviewerId: 'account-reviewer-2', paperId: 'paper-1', requestId: 'r-1' });
    expect(denied.status).toBe(403);
    expect(denied.body.reasonCode).toBe('ACCESS_NOT_ASSIGNED');

    service.assignReviewer({ reviewerId: 'account-reviewer-3', paperId: 'paper-1' });
    service.revokeReviewerAccess({ reviewerId: 'account-reviewer-3', paperId: 'paper-1', revokedBy: 'editor-1' });
    const revoked = service.getPaperFiles({ reviewerId: 'account-reviewer-3', paperId: 'paper-1', requestId: 'r-2' });
    expect(revoked.status).toBe(403);
    expect(revoked.body.reasonCode).toBe('ACCESS_REVOKED');
  });

  it('serves files, temporary-unavailable responses, and throttled retries', () => {
    const service = createService();
    service.upsertPaper({
      paperId: 'paper-2',
      title: 'Paper 2',
      files: [{ fileId: 'file-2', fileName: 'paper2.pdf', contentType: 'application/pdf', sizeBytes: 10 }],
      editorIds: ['editor-2']
    });
    service.assignReviewer({ reviewerId: 'account-reviewer-2', paperId: 'paper-2' });

    const success = service.getPaperFiles({ reviewerId: 'account-reviewer-2', paperId: 'paper-2', requestId: 'request-a' });
    expect(success.status).toBe(200);
    expect(success.body.files).toHaveLength(1);

    const downloaded = service.downloadPaperFile({
      reviewerId: 'account-reviewer-2',
      paperId: 'paper-2',
      fileId: 'file-2',
      requestId: 'request-b'
    });
    expect(downloaded.status).toBe(200);

    const missingFile = service.downloadPaperFile({
      reviewerId: 'account-reviewer-2',
      paperId: 'paper-2',
      fileId: 'missing',
      requestId: 'request-c'
    });
    expect(missingFile.status).toBe(404);

    service.setPaperAvailability('paper-2', 'temporarily-unavailable');

    const firstOutage = service.getPaperFiles({ reviewerId: 'account-reviewer-2', paperId: 'paper-2', requestId: 'request-d' });
    const immediateRetry = service.getPaperFiles({ reviewerId: 'account-reviewer-2', paperId: 'paper-2', requestId: 'request-e' });
    const throttled = service.getPaperFiles({ reviewerId: 'account-reviewer-2', paperId: 'paper-2', requestId: 'request-f' });

    expect(firstOutage.status).toBe(503);
    expect(immediateRetry.status).toBe(503);
    expect(throttled.status).toBe(429);

    service.setPaperAvailability('paper-2', 'available');
    const cleared = service.getPaperFiles({ reviewerId: 'account-reviewer-2', paperId: 'paper-2', requestId: 'request-g' });
    expect(cleared.status).toBe(200);
    expect(service.getOutageWindow('account-reviewer-2', 'paper-2')).toBeNull();
  });

  it('evaluates access-record authorization paths', () => {
    const service = createService();
    service.upsertPaper({
      paperId: 'paper-3',
      title: 'Paper 3',
      files: [{ fileId: 'file-3', fileName: 'paper3.pdf', contentType: 'application/pdf', sizeBytes: 5 }],
      editorIds: ['editor-3']
    });
    service.assignReviewer({ reviewerId: 'account-reviewer-3', paperId: 'paper-3' });
    service.getPaperFiles({ reviewerId: 'account-reviewer-3', paperId: 'paper-3', requestId: 'request-h' });

    expect(service.getAccessAttempts({
      isAuthenticated: false,
      requesterId: 'editor-3',
      requesterRole: 'editor',
      paperId: 'paper-3'
    }).status).toBe(401);

    expect(service.getAccessAttempts({
      isAuthenticated: true,
      requesterId: 'editor-3',
      requesterRole: 'editor',
      paperId: 'missing-paper'
    }).status).toBe(404);

    const forbidden = service.getAccessAttempts({
      isAuthenticated: true,
      requesterId: 'reviewer-3',
      requesterRole: 'reviewer',
      paperId: 'paper-3'
    });
    expect(forbidden.status).toBe(403);

    const editorAuthorized = service.getAccessAttempts({
      isAuthenticated: true,
      requesterId: 'editor-3',
      requesterRole: 'editor',
      paperId: 'paper-3',
      limit: 1
    });
    expect(editorAuthorized.status).toBe(200);
    expect(editorAuthorized.body.records).toHaveLength(1);

    const supportAuthorized = service.getAccessAttempts({
      isAuthenticated: true,
      requesterId: 'any-user',
      requesterRole: 'reviewer',
      elevatedRoles: ['support'],
      paperId: 'paper-3'
    });
    expect(supportAuthorized.status).toBe(200);

    expect(() => service.revokeReviewerAccess({ reviewerId: 'unknown', paperId: 'paper-3', revokedBy: 'editor-3' })).toThrow(/entitlement not found/);
    expect(() => service.setPaperAvailability('missing-paper', 'available')).toThrow(/paper not found/);
    expect(() => service.setPaperEditors('missing-paper', [])).toThrow(/paper not found/);
  });

  it('covers optional branches for request ids, viewer roles, and outage callbacks', () => {
    const service = createService();
    service.upsertPaper({
      paperId: 'paper-4',
      title: 'Paper 4',
      files: [{ fileId: 'file-4', fileName: 'paper4.pdf', contentType: 'application/pdf', sizeBytes: 4 }],
      availabilityStatus: 'available',
      editorIds: 'editor-not-array'
    });
    service.assignReviewer({ reviewerId: 'account-reviewer-4', paperId: 'paper-4' });

    const defaultRequestId = service.getPaperFiles({
      reviewerId: 'account-reviewer-4',
      paperId: 'paper-4',
      viewerRoleSnapshot: 'reviewer'
    });
    expect(defaultRequestId.status).toBe(200);

    const missingPaper = service.getPaperFiles({
      reviewerId: 'account-reviewer-4',
      paperId: 'paper-missing',
      requestId: 'request-missing'
    });
    expect(missingPaper.status).toBe(403);

    service.assignReviewer({
      reviewerId: 'account-reviewer-4',
      paperId: 'paper-orphan'
    });
    const orphanPaper = service.getPaperFiles({
      reviewerId: 'account-reviewer-4',
      paperId: 'paper-orphan',
      requestId: 'request-orphan'
    });
    expect(orphanPaper.status).toBe(403);

    service.setPaperAvailability('paper-4', 'temporarily-unavailable');

    const callbackOutage = service.downloadPaperFile({
      reviewerId: 'account-reviewer-4',
      paperId: 'paper-4',
      fileId: 'file-4',
      requestId: 'request-callback',
      evaluateOutage: () => ({ outcome: 'temporarily-unavailable', reasonCode: 'TEMPORARY_OUTAGE' })
    });
    expect(callbackOutage.status).toBe(503);

    const callbackThrottle = service.downloadPaperFile({
      reviewerId: 'account-reviewer-4',
      paperId: 'paper-4',
      fileId: 'file-4',
      requestId: 'request-throttle',
      evaluateOutage: () => ({ outcome: 'throttled', reasonCode: 'TEMP_OUTAGE_THROTTLED', retryAfterSeconds: 2 })
    });
    expect(callbackThrottle.status).toBe(429);

    const defaultOutageHandling = service.downloadPaperFile({
      reviewerId: 'account-reviewer-4',
      paperId: 'paper-4',
      fileId: 'file-4',
      requestId: 'request-default-outage'
    });
    expect(defaultOutageHandling.status).toBe(503);

    service.setPaperAvailability('paper-4', 'available');
    service.setPaperEditors('paper-4', 'editor-not-array');
    const clearedWithCallback = service.downloadPaperFile({
      reviewerId: 'account-reviewer-4',
      paperId: 'paper-4',
      fileId: 'file-4',
      clearOutage: () => {}
    });
    expect(clearedWithCallback.status).toBe(200);

    const missingDownloadPaper = service.downloadPaperFile({
      reviewerId: 'account-reviewer-4',
      paperId: 'paper-missing',
      fileId: 'file-4',
      requestId: 'request-download-missing'
    });
    expect(missingDownloadPaper.status).toBe(403);

    const orphanDownload = service.downloadPaperFile({
      reviewerId: 'account-reviewer-4',
      paperId: 'paper-orphan',
      fileId: 'file-4',
      requestId: 'request-orphan-download'
    });
    expect(orphanDownload.status).toBe(403);

    const unauthenticatedFiles = service.getPaperFiles({
      reviewerId: null,
      paperId: 'paper-4'
    });
    expect(unauthenticatedFiles.status).toBe(401);

    const unauthenticatedDownload = service.downloadPaperFile({
      reviewerId: null,
      paperId: 'paper-4',
      fileId: 'file-4'
    });
    expect(unauthenticatedDownload.status).toBe(401);
  });

  it('executes default nowFn path when no override is supplied', () => {
    const service = createPaperAccessApiService();
    const inserted = service.upsertPaper({
      paperId: 'paper-default-now',
      title: 'Paper Default Now',
      files: [{ fileId: 'file-default-now', fileName: 'default.pdf', contentType: 'application/pdf', sizeBytes: 8 }]
    });

    expect(inserted.bundle.generatedAt).toMatch(/T/);
    const editors = service.setPaperEditors('paper-default-now', ['editor-default']);
    expect(editors.editorIds).toEqual(['editor-default']);
  });
});
