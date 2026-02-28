import { describe, expect, it, vi } from 'vitest';
import { createAccessRecordsController } from '../../../src/controllers/access-records.controller.js';
import { createMockResponse } from '../../helpers/http-harness.js';

describe('access-records.controller', () => {
  it('requires authenticated session', async () => {
    const controller = createAccessRecordsController({
      paperAccessApiService: {
        getAccessAttempts: vi.fn()
      }
    });

    const response = createMockResponse();
    await controller.listAccessAttempts({ params: { paperId: 'paper-1' }, headers: {}, query: {} }, response);
    expect(response.statusCode).toBe(401);
  });

  it('forwards requester context and returns service response', async () => {
    const service = {
      getAccessAttempts: vi.fn(() => ({
        status: 200,
        body: { records: [{ attemptId: 'attempt-1' }] }
      }))
    };

    const controller = createAccessRecordsController({
      paperAccessApiService: service
    });

    const response = createMockResponse();
    await controller.listAccessAttempts({
      authenticatedSession: { user: { id: 'editor-1' } },
      authenticatedUserRole: 'editor',
      headers: {
        'x-user-role': 'support,admin'
      },
      params: { paperId: 'paper-1' },
      query: { outcome: 'granted', limit: '10' }
    }, response);

    expect(response.statusCode).toBe(200);
    expect(service.getAccessAttempts).toHaveBeenCalledWith({
      isAuthenticated: true,
      requesterId: 'editor-1',
      requesterRole: 'editor',
      elevatedRoles: ['support', 'admin'],
      paperId: 'paper-1',
      outcome: 'granted',
      limit: '10'
    });
  });
});
