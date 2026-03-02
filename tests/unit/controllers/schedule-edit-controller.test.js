import { describe, expect, it, vi } from 'vitest';

import ScheduleEditController from '../../../src/controllers/ScheduleEditController.js';

function createResponseRecorder() {
  const response = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return response;
}

describe('ScheduleEditController', () => {
  it('delegates save-attempt requests to service', () => {
    const attemptSave = vi.fn(() => ({ status: 200, body: { ok: true } }));
    const controller = new ScheduleEditController({
      scheduleEditService: { attemptSave }
    });
    const response = createResponseRecorder();

    controller.saveAttempt({
      params: { scheduleId: 'schedule-1' },
      body: { expectedVersion: 2, changes: [{ sessionId: 's1' }] },
      user: { userId: 'editor-1' }
    }, response);

    expect(attemptSave).toHaveBeenCalledWith({
      scheduleId: 'schedule-1',
      expectedVersion: 2,
      changes: [{ sessionId: 's1' }],
      editorId: 'editor-1'
    });
    expect(response.statusCode).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it('delegates override-save requests to service', () => {
    const attemptOverrideSave = vi.fn(() => ({ status: 409, body: { code: 'X' } }));
    const controller = new ScheduleEditController({
      scheduleEditService: { attemptOverrideSave }
    });
    const response = createResponseRecorder();

    controller.overrideSave({
      params: { scheduleId: 'schedule-2' },
      body: {
        expectedVersion: 4,
        decisionToken: 'token',
        reason: 'approved',
        affectedConflictIds: ['c1'],
        changes: [{ sessionId: 's2' }]
      },
      user: { userId: 'editor-2' }
    }, response);

    expect(attemptOverrideSave).toHaveBeenCalledWith({
      scheduleId: 'schedule-2',
      expectedVersion: 4,
      decisionToken: 'token',
      reason: 'approved',
      affectedConflictIds: ['c1'],
      changes: [{ sessionId: 's2' }],
      editorId: 'editor-2'
    });
    expect(response.statusCode).toBe(409);
  });

  it('delegates publish-attempt requests to service', () => {
    const attemptPublish = vi.fn(() => ({ status: 200, body: { status: 'published' } }));
    const controller = new ScheduleEditController({
      scheduleEditService: { attemptPublish }
    });
    const response = createResponseRecorder();

    controller.publishAttempt({
      params: { scheduleId: 'schedule-9' },
      body: { expectedVersion: 10 }
    }, response);

    expect(attemptPublish).toHaveBeenCalledWith({
      scheduleId: 'schedule-9',
      expectedVersion: 10
    });
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('published');
  });
});
