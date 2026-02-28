import { describe, expect, it, vi } from 'vitest';
import { createPaperFileRequestController } from '../../../src/controllers/paper-file-request.controller.js';
import { createMockResponse } from '../../helpers/http-harness.js';

describe('paper-file-request.controller', () => {
  it('returns authentication-required when reviewer session is missing', async () => {
    const controller = createPaperFileRequestController({
      paperAccessApiService: {},
      outageRetryController: {}
    });

    const responseFiles = createMockResponse();
    await controller.getPaperFiles({ params: { paperId: 'paper-1' }, headers: {} }, responseFiles);
    expect(responseFiles.statusCode).toBe(401);

    const responseDownload = createMockResponse();
    await controller.downloadPaperFile({ params: { paperId: 'paper-1', fileId: 'file-1' }, headers: {} }, responseDownload);
    expect(responseDownload.statusCode).toBe(401);
  });

  it('forwards file and download requests with request/role context', async () => {
    const service = {
      getPaperFiles: vi.fn(() => ({ status: 200, body: { outcome: 'granted', files: [] } })),
      downloadPaperFile: vi.fn(() => ({ status: 503, body: { outcome: 'temporarily-unavailable' } }))
    };
    const outageRetryController = {
      evaluateOutage: vi.fn(),
      clearOutageWindow: vi.fn()
    };

    const controller = createPaperFileRequestController({
      paperAccessApiService: service,
      outageRetryController
    });

    const req = {
      authenticatedReviewerId: 'account-reviewer-1',
      authenticatedUserRole: 'reviewer',
      headers: {
        'x-request-id': 'request-1',
        'x-user-role': 'support,reviewer'
      },
      params: {
        paperId: 'paper-1',
        fileId: 'file-1'
      }
    };

    const filesRes = createMockResponse();
    await controller.getPaperFiles(req, filesRes);
    expect(filesRes.statusCode).toBe(200);

    const downloadRes = createMockResponse();
    await controller.downloadPaperFile(req, downloadRes);
    expect(downloadRes.statusCode).toBe(503);

    expect(service.getPaperFiles).toHaveBeenCalledWith(expect.objectContaining({
      reviewerId: 'account-reviewer-1',
      paperId: 'paper-1',
      requestId: 'request-1',
      viewerRoleSnapshot: ['reviewer', 'support']
    }));
    expect(service.downloadPaperFile).toHaveBeenCalledWith(expect.objectContaining({
      reviewerId: 'account-reviewer-1',
      fileId: 'file-1'
    }));

    const reqWithoutUserRole = {
      authenticatedReviewerId: 'account-reviewer-1',
      headers: {},
      params: {
        paperId: 'paper-1',
        fileId: 'file-1'
      }
    };
    const withoutRoleRes = createMockResponse();
    await controller.getPaperFiles(reqWithoutUserRole, withoutRoleRes);
    expect(service.getPaperFiles).toHaveBeenLastCalledWith(expect.objectContaining({
      viewerRoleSnapshot: []
    }));
  });
});
