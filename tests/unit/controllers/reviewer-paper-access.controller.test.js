import { describe, expect, it, vi } from 'vitest';
import { createReviewerPaperAccessController } from '../../../src/controllers/reviewer-paper-access.controller.js';
import { createMockResponse } from '../../helpers/http-harness.js';

describe('reviewer-paper-access.controller', () => {
  it('handles assigned-paper list with auth checks', async () => {
    const service = {
      listAssignedPapers: vi.fn(() => ({ status: 200, body: { papers: [{ paperId: 'paper-1', title: 'Paper 1' }] } }))
    };
    const controller = createReviewerPaperAccessController({
      paperAccessApiService: service,
      nowFn: () => new Date('2026-02-08T00:00:00.000Z')
    });

    const unauthorizedRes = createMockResponse();
    await controller.listAssignedPapers({ authenticatedReviewerId: null }, unauthorizedRes);
    expect(unauthorizedRes.statusCode).toBe(401);

    const authorizedRes = createMockResponse();
    await controller.listAssignedPapers({ authenticatedReviewerId: 'account-reviewer-1' }, authorizedRes);
    expect(authorizedRes.statusCode).toBe(200);
    expect(service.listAssignedPapers).toHaveBeenCalledWith({ reviewerId: 'account-reviewer-1' });
    expect(controller.getSelectionLatencySummary()).toEqual({ count: 0, p95Ms: 0 });
  });

  it('renders reviewer paper access page and tracks latency', async () => {
    const service = {
      listAssignedPapers: vi.fn(() => ({
        status: 200,
        body: {
          papers: [{ paperId: 'paper-1', title: 'Paper 1' }]
        }
      }))
    };

    let nowMs = Date.parse('2026-02-08T00:00:00.000Z');
    const controller = createReviewerPaperAccessController({
      paperAccessApiService: service,
      nowFn: () => {
        nowMs += 20;
        return new Date(nowMs);
      }
    });

    const redirectRes = createMockResponse();
    await controller.getPaperAccessPage({ authenticatedReviewerId: null }, redirectRes);
    expect(redirectRes.statusCode).toBe(302);

    const pageRes = createMockResponse();
    await controller.getPaperAccessPage({
      authenticatedReviewerId: 'account-reviewer-1',
      authenticatedSession: { user: { email: 'reviewer@example.com' } },
      headers: { 'x-request-id': 'request-page' },
      query: { paperId: 'paper-1' }
    }, pageRes);

    expect(pageRes.statusCode).toBe(200);
    expect(pageRes.text).toContain('Reviewer Paper Access');
    expect(controller.markSelectionRendered({ requestId: 'missing' })).toBeNull();

    const pageResNoQuery = createMockResponse();
    await controller.getPaperAccessPage({
      authenticatedReviewerId: 'account-reviewer-1',
      authenticatedSession: { user: { email: 'reviewer@example.com' } },
      headers: {}
    }, pageResNoQuery);
    expect(pageResNoQuery.statusCode).toBe(200);
    expect(pageResNoQuery.text).toContain('reviewer@example.com');

    controller.markSelectionStarted({ requestId: 'r1', reviewerId: 'reviewer-1', paperId: 'paper-1', startedAt: new Date('2026-02-08T00:00:00.000Z') });
    controller.markSelectionRendered({ requestId: 'r1', renderedAt: new Date('2026-02-08T00:00:01.000Z') });
    controller.markSelectionStarted({ requestId: 'r2', reviewerId: 'reviewer-1', paperId: 'paper-1', startedAt: new Date('2026-02-08T00:00:00.000Z') });
    controller.markSelectionRendered({ requestId: 'r2', renderedAt: new Date('2026-02-08T00:00:02.000Z') });
    controller.markSelectionStarted({ requestId: 'r3', reviewerId: 'reviewer-1', paperId: 'paper-1', startedAt: '2026-02-08T00:00:00.000Z' });
    controller.markSelectionRendered({ requestId: 'r3', renderedAt: '2026-02-08T00:00:03.000Z' });
    const generatedRequestId = controller.markSelectionStarted({ reviewerId: 'reviewer-1', paperId: 'paper-1' });
    expect(typeof generatedRequestId).toBe('string');
    controller.markSelectionRendered({ requestId: generatedRequestId });

    const summary = controller.getSelectionLatencySummary();
    expect(summary.count).toBeGreaterThanOrEqual(2);
    expect(summary.p95Ms).toBeGreaterThan(0);
  });

  it('executes default nowFn path when not overridden', () => {
    const controller = createReviewerPaperAccessController({
      paperAccessApiService: {
        listAssignedPapers: () => ({ status: 200, body: { papers: [] } })
      }
    });

    const requestId = controller.markSelectionStarted({ reviewerId: 'reviewer-default', paperId: 'paper-default' });
    const rendered = controller.markSelectionRendered({ requestId });
    expect(rendered.durationMs).toBeGreaterThanOrEqual(0);
  });
});
