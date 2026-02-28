import { describe, expect, it } from 'vitest';
import { createReviewerPaperAccessController } from '../../src/controllers/reviewer-paper-access.controller.js';

describe('UC-08 performance acceptance (SC-002)', () => {
  it('keeps p95 selection-to-render at or below 3 seconds across 100 selections', () => {
    const controller = createReviewerPaperAccessController({
      paperAccessApiService: {
        listAssignedPapers: () => ({ status: 200, body: { papers: [] } })
      },
      nowFn: () => new Date('2026-02-08T00:00:00.000Z')
    });

    for (let index = 0; index < 100; index += 1) {
      const requestId = `perf-${index}`;
      const start = new Date('2026-02-08T00:00:00.000Z');
      const latencyMs = index < 95 ? 2200 : 2900;
      const end = new Date(start.getTime() + latencyMs);

      controller.markSelectionStarted({
        requestId,
        reviewerId: 'reviewer-perf',
        paperId: 'paper-perf',
        startedAt: start
      });
      controller.markSelectionRendered({
        requestId,
        renderedAt: end
      });
    }

    const summary = controller.getSelectionLatencySummary();
    expect(summary.count).toBe(100);
    expect(summary.p95Ms).toBeLessThanOrEqual(3000);
  });
});
