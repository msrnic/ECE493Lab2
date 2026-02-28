import { describe, expect, it } from 'vitest';
import {
  renderFileList,
  renderOutcomePanel,
  renderPaperList,
  renderReviewerPaperAccessPage
} from '../../../src/views/reviewer-paper-access.view.js';

describe('reviewer-paper-access.view', () => {
  it('renders paper/file lists and outcome panels', () => {
    expect(renderPaperList([], null)).toContain('No assigned papers');
    expect(renderPaperList([{ paperId: 'p1', title: 'Paper 1' }], 'p1')).toContain('selected');
    expect(renderPaperList([{ paperId: 'p1', title: 'Paper 1' }], 'p2')).not.toContain('selected');

    expect(renderFileList([])).toContain('No files available');
    expect(renderFileList([{ fileId: 'f1', fileName: 'paper.pdf' }])).toContain('paper.pdf');

    expect(renderOutcomePanel({ outcome: 'denied-revoked', reasonCode: 'ACCESS_REVOKED' })).toContain('revoked');
    expect(renderOutcomePanel({ outcome: 'temporarily-unavailable' })).toContain('temporarily unavailable');
    expect(renderOutcomePanel({ outcome: 'throttled', retryAfterSeconds: 2 })).toContain('temporarily limited');
    expect(renderOutcomePanel({ outcome: 'granted' })).toContain('Files are available');
  });

  it('renders the reviewer page shell', () => {
    const html = renderReviewerPaperAccessPage({
      userEmail: 'reviewer@example.com',
      papers: [{ paperId: 'p1', title: 'Paper 1' }],
      selectedPaperId: 'p1',
      files: [{ fileId: 'f1', fileName: 'paper.pdf' }],
      renderedLatencyMs: 32
    });

    expect(html).toContain('Reviewer Paper Access');
    expect(html).toContain('/assets/css/reviewer-paper-access.css');
    expect(html).toContain('/assets/js/reviewer-paper-access-page.js');
    expect(html).toContain('selection-to-render: 32ms');

    const fallbackUser = renderReviewerPaperAccessPage({ papers: [] });
    expect(fallbackUser).toContain('unknown reviewer');
  });
});
