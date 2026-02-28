import { describe, expect, it } from 'vitest';
import { renderAccessRecordsView } from '../../../src/views/access-records.view.js';

describe('access-records.view', () => {
  it('renders access records table rows and empty-state fallback', () => {
    const withRows = renderAccessRecordsView({
      paperId: 'paper-1',
      outcomeFilter: 'granted',
      records: [{
        attemptId: 'a-1',
        reviewerId: 'reviewer-1',
        outcome: 'granted',
        reasonCode: 'ACCESS_GRANTED',
        occurredAt: '2026-02-08T00:00:00.000Z'
      }]
    });
    expect(withRows).toContain('a-1');
    expect(withRows).toContain('Filter: granted');

    const empty = renderAccessRecordsView({ paperId: 'paper-2', records: [] });
    expect(empty).toContain('No access attempts found');

    const unknownPaper = renderAccessRecordsView({ records: [] });
    expect(unknownPaper).toContain('Paper: unknown');
  });
});
